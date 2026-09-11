"use strict";

const { getSql, json } = require("./lib/db");
const {
  ensureSynkCoreTables,
  requireHubSession,
  normalizePublicUsername,
  normalizeGroupSlug,
  normalizeGroupName,
  normalizeGroupDescription,
  COMMUNITY_OWNER_USERNAME,
  ensureCommunityOwner,
  getCommunityStaffRole,
  isCommunityStaffRole,
  listCommunityStaff,
  listCommunityGroups,
  findCommunityGroup,
  logSynkEvent,
  clientIp,
} = require("./lib/synk");

function normalizePostBody(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 1000);
}

function mapPost(row) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    group: row.group_slug
      ? {
          id: row.group_id,
          slug: row.group_slug,
          name: row.group_name || row.group_slug,
        }
      : null,
    author: {
      username: row.public_username || "member",
      name: row.name || "",
      role: row.author_role || null,
    },
  };
}

function mePayload(auth, role) {
  return {
    profileId: auth.profile.id,
    name: auth.profile.name,
    synkCode: auth.profile.synkCode,
    publicUsername: auth.profile.publicUsername || "",
    role: role || null,
    isStaff: isCommunityStaffRole(role),
    isOwner: role === "owner",
    isAdmin: role === "admin" || role === "owner",
  };
}

async function loadPosts(sql, { groupId = null, limit = 80 } = {}) {
  const capped = Math.min(Math.max(Number(limit) || 80, 1), 100);
  if (groupId) {
    return sql`
      SELECT
        p.id,
        p.body,
        p.created_at,
        p.group_id,
        m.name,
        c.public_username,
        g.slug AS group_slug,
        g.name AS group_name,
        s.role AS author_role
      FROM synk_community_posts p
      JOIN synk_profiles m ON m.id = p.synk_profile_id
      LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
      LEFT JOIN synk_community_groups g ON g.id = p.group_id
      LEFT JOIN synk_community_staff s ON s.synk_profile_id = p.synk_profile_id
      WHERE p.group_id = ${groupId}
      ORDER BY p.created_at DESC
      LIMIT ${capped}
    `;
  }
  return sql`
    SELECT
      p.id,
      p.body,
      p.created_at,
      p.group_id,
      m.name,
      c.public_username,
      g.slug AS group_slug,
      g.name AS group_name,
      s.role AS author_role
    FROM synk_community_posts p
    JOIN synk_profiles m ON m.id = p.synk_profile_id
    LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
    LEFT JOIN synk_community_groups g ON g.id = p.group_id
    LEFT JOIN synk_community_staff s ON s.synk_profile_id = p.synk_profile_id
    ORDER BY p.created_at DESC
    LIMIT ${capped}
  `;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);

    let body = {};
    if (event.httpMethod !== "GET") {
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }
    }

    const auth = await requireHubSession(sql, event, body);
    if (!auth.ok) {
      return json(auth.status || 401, { error: auth.error || "Unauthorized" });
    }

    const role = await getCommunityStaffRole(sql, auth.profile.id);
    const qs = event.queryStringParameters || {};
    const ip = clientIp(event);

    if (event.httpMethod === "GET") {
      const groups = await listCommunityGroups(sql);
      const groupSlug = normalizeGroupSlug(qs.group || qs.slug || "");
      let activeGroup = null;
      if (groupSlug) {
        activeGroup = await findCommunityGroup(sql, { slug: groupSlug });
        if (!activeGroup) return json(404, { error: "Group not found" });
      }
      const posts = await loadPosts(sql, {
        groupId: activeGroup ? activeGroup.id : null,
      });
      const payload = {
        ok: true,
        me: mePayload(auth, role),
        groups,
        group: activeGroup,
        posts: posts.map(mapPost),
        ownerUsername: COMMUNITY_OWNER_USERNAME,
      };
      if (isCommunityStaffRole(role)) {
        payload.staff = await listCommunityStaff(sql);
      }
      return json(200, payload);
    }

    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const action = String(body.action || "post").trim().toLowerCase();

    if (action === "set-username") {
      const username = normalizePublicUsername(body.username || body.publicUsername);
      if (!username || username.length < 3) {
        return json(400, {
          error: "Username must be 3–24 letters, numbers, or underscores",
        });
      }
      if (!/^[a-z0-9_]+$/.test(username)) {
        return json(400, { error: "Use only letters, numbers, and underscores" });
      }
      try {
        await sql`
          INSERT INTO synk_community_profiles (synk_profile_id, public_username)
          VALUES (${auth.profile.id}, ${username})
          ON CONFLICT (synk_profile_id) DO UPDATE
          SET public_username = EXCLUDED.public_username, updated_at = NOW()
        `;
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "That username is already taken" });
        }
        throw err;
      }

      if (username === COMMUNITY_OWNER_USERNAME) {
        await ensureCommunityOwner(sql);
      }

      await logSynkEvent(sql, {
        eventType: "community_username",
        profileId: auth.profile.id,
        ip,
        detail: username,
      });
      const nextRole = await getCommunityStaffRole(sql, auth.profile.id);
      return json(200, {
        ok: true,
        publicUsername: username,
        me: mePayload(
          { ...auth, profile: { ...auth.profile, publicUsername: username } },
          nextRole
        ),
      });
    }

    if (action === "create-group") {
      if (!isCommunityStaffRole(role)) {
        return json(403, { error: "Only community admins can create groups" });
      }
      const name = normalizeGroupName(body.name || body.title);
      const slug = normalizeGroupSlug(body.slug || name);
      const description = normalizeGroupDescription(body.description || body.about || "");
      if (!name) return json(400, { error: "Group name is required" });
      if (!slug || slug.length < 2) {
        return json(400, { error: "Group url needs at least 2 characters" });
      }
      try {
        const rows = await sql`
          INSERT INTO synk_community_groups (slug, name, description, created_by)
          VALUES (${slug}, ${name}, ${description}, ${auth.profile.id})
          RETURNING id, slug, name, description, created_by, created_at, updated_at
        `;
        await logSynkEvent(sql, {
          eventType: "community_group_create",
          profileId: auth.profile.id,
          ip,
          detail: slug,
        });
        return json(201, {
          ok: true,
          group: {
            id: rows[0].id,
            slug: rows[0].slug,
            name: rows[0].name,
            description: rows[0].description || "",
            createdBy: rows[0].created_by,
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at,
            postCount: 0,
          },
        });
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "That group url is already taken" });
        }
        throw err;
      }
    }

    if (action === "add-admin") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can add admins" });
      }
      const username = normalizePublicUsername(body.username || body.publicUsername);
      if (!username) return json(400, { error: "Username is required" });
      const member = await sql`
        SELECT c.synk_profile_id, c.public_username, p.name
        FROM synk_community_profiles c
        JOIN synk_profiles p ON p.id = c.synk_profile_id
        WHERE c.public_username = ${username}
        LIMIT 1
      `;
      if (!member[0]) {
        return json(404, { error: "No community member with that username" });
      }
      if (member[0].public_username === COMMUNITY_OWNER_USERNAME) {
        return json(400, { error: "@vision is already the owner" });
      }
      await sql`
        INSERT INTO synk_community_staff (synk_profile_id, role, created_by)
        VALUES (${member[0].synk_profile_id}, 'admin', ${auth.profile.id})
        ON CONFLICT (synk_profile_id) DO UPDATE
        SET
          role = CASE
            WHEN synk_community_staff.role = 'owner' THEN 'owner'
            ELSE 'admin'
          END,
          updated_at = NOW()
      `;
      await logSynkEvent(sql, {
        eventType: "community_admin_add",
        profileId: auth.profile.id,
        ip,
        detail: username,
      });
      return json(200, {
        ok: true,
        staff: await listCommunityStaff(sql),
      });
    }

    if (action === "remove-admin") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can remove admins" });
      }
      const username = normalizePublicUsername(body.username || body.publicUsername);
      const targetId = String(body.profileId || body.id || "").trim();
      let target = null;
      if (username) {
        const rows = await sql`
          SELECT c.synk_profile_id, c.public_username, s.role
          FROM synk_community_profiles c
          LEFT JOIN synk_community_staff s ON s.synk_profile_id = c.synk_profile_id
          WHERE c.public_username = ${username}
          LIMIT 1
        `;
        target = rows[0] || null;
      } else if (targetId) {
        const rows = await sql`
          SELECT c.synk_profile_id, c.public_username, s.role
          FROM synk_community_staff s
          LEFT JOIN synk_community_profiles c ON c.synk_profile_id = s.synk_profile_id
          WHERE s.synk_profile_id = ${targetId}
          LIMIT 1
        `;
        target = rows[0] || null;
      }
      if (!target || !target.synk_profile_id) {
        return json(404, { error: "Admin not found" });
      }
      if (target.role === "owner" || target.public_username === COMMUNITY_OWNER_USERNAME) {
        return json(400, { error: "Cannot remove the owner" });
      }
      await sql`
        DELETE FROM synk_community_staff
        WHERE synk_profile_id = ${target.synk_profile_id}
          AND role = 'admin'
      `;
      await logSynkEvent(sql, {
        eventType: "community_admin_remove",
        profileId: auth.profile.id,
        ip,
        detail: target.public_username || target.synk_profile_id,
      });
      return json(200, {
        ok: true,
        staff: await listCommunityStaff(sql),
      });
    }

    if (action === "post" || action === "create") {
      if (!auth.profile.publicUsername) {
        return json(400, { error: "Choose a public username before posting" });
      }
      const text = normalizePostBody(body.body || body.text || body.message);
      if (!text || text.length < 3) {
        return json(400, {
          error: "Write a short post (at least a few characters)",
        });
      }

      let group = await findCommunityGroup(sql, {
        id: body.groupId || body.group_id,
        slug: body.group || body.groupSlug || body.slug,
      });
      if (!group) {
        group = await findCommunityGroup(sql, { slug: "general" });
      }
      if (!group) {
        return json(400, { error: "Pick a group to post in" });
      }

      const rows = await sql`
        INSERT INTO synk_community_posts (synk_profile_id, group_id, body)
        VALUES (${auth.profile.id}, ${group.id}, ${text})
        RETURNING id, body, created_at, group_id
      `;
      await logSynkEvent(sql, {
        eventType: "community_post",
        profileId: auth.profile.id,
        ip,
        detail: `${group.slug}:${rows[0].id}`,
      });
      return json(201, {
        ok: true,
        post: {
          id: rows[0].id,
          body: rows[0].body,
          createdAt: rows[0].created_at,
          group: { id: group.id, slug: group.slug, name: group.name },
          author: {
            username: auth.profile.publicUsername,
            name: auth.profile.name,
            role: role || null,
          },
        },
      });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("synk-community error:", err);
    return json(500, { error: "Server error" });
  }
};
