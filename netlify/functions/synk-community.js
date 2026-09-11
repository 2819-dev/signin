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
  isCommunityUsernameTaken,
  listOwnerAltAccounts,
  findCommunityAltAccount,
  findCommunityPublicProfile,
  normalizeTagName,
  normalizeTagSlug,
  normalizeTagDescription,
  normalizeTagColor,
  listCommunityTags,
  findCommunityTag,
  listProfileTags,
  getPinnedTagForProfile,
  getPinnedTagsByUsernames,
  findCommunityProfileIdByUsername,
  logSynkEvent,
  clientIp,
} = require("./lib/synk");

function normalizePostBody(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 1000);
}

function normalizeAltLabel(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

function mapPost(row) {
  const username =
    String(row.author_username || "").trim() || row.public_username || "member";
  const primaryUsername = row.public_username || "";
  const isPrimary = !primaryUsername || username === primaryUsername;
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
      username,
      name: isPrimary ? row.name || "" : "",
      role: isPrimary ? row.author_role || null : null,
      isAlt: Boolean(row.is_alt) || (!isPrimary && Boolean(username)),
    },
  };
}

function mePayload(auth, role, alts = [], tags = [], pinnedTag = null) {
  return {
    profileId: auth.profile.id,
    name: auth.profile.name,
    synkCode: auth.profile.synkCode,
    publicUsername: auth.profile.publicUsername || "",
    role: role || null,
    isStaff: isCommunityStaffRole(role),
    isOwner: role === "owner",
    isAdmin: role === "admin" || role === "owner",
    alts: role === "owner" ? alts : [],
    tags: tags || [],
    pinnedTag: pinnedTag || null,
  };
}

async function loadPosts(sql, { groupId = null, authorUsername = null, limit = 80 } = {}) {
  const capped = Math.min(Math.max(Number(limit) || 80, 1), 100);
  const author = normalizePublicUsername(authorUsername);

  const select = sql`
    SELECT
      p.id,
      p.body,
      p.created_at,
      p.group_id,
      p.author_username,
      m.name,
      c.public_username,
      g.slug AS group_slug,
      g.name AS group_name,
      CASE
        WHEN COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = c.public_username
        THEN s.role
        ELSE NULL
      END AS author_role,
      CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_alt
    FROM synk_community_posts p
    JOIN synk_profiles m ON m.id = p.synk_profile_id
    LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
    LEFT JOIN synk_community_groups g ON g.id = p.group_id
    LEFT JOIN synk_community_staff s ON s.synk_profile_id = p.synk_profile_id
    LEFT JOIN synk_community_alt_accounts a
      ON a.public_username = COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username)
  `;

  // neon tagged templates can't easily compose; use three queries.
  if (author && groupId) {
    return sql`
      SELECT
        p.id, p.body, p.created_at, p.group_id, p.author_username,
        m.name, c.public_username, g.slug AS group_slug, g.name AS group_name,
        CASE
          WHEN COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = c.public_username
          THEN s.role ELSE NULL
        END AS author_role,
        CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_alt
      FROM synk_community_posts p
      JOIN synk_profiles m ON m.id = p.synk_profile_id
      LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
      LEFT JOIN synk_community_groups g ON g.id = p.group_id
      LEFT JOIN synk_community_staff s ON s.synk_profile_id = p.synk_profile_id
      LEFT JOIN synk_community_alt_accounts a
        ON a.public_username = COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username)
      WHERE p.group_id = ${groupId}
        AND COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = ${author}
      ORDER BY p.created_at DESC
      LIMIT ${capped}
    `;
  }
  if (author) {
    return sql`
      SELECT
        p.id, p.body, p.created_at, p.group_id, p.author_username,
        m.name, c.public_username, g.slug AS group_slug, g.name AS group_name,
        CASE
          WHEN COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = c.public_username
          THEN s.role ELSE NULL
        END AS author_role,
        CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_alt
      FROM synk_community_posts p
      JOIN synk_profiles m ON m.id = p.synk_profile_id
      LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
      LEFT JOIN synk_community_groups g ON g.id = p.group_id
      LEFT JOIN synk_community_staff s ON s.synk_profile_id = p.synk_profile_id
      LEFT JOIN synk_community_alt_accounts a
        ON a.public_username = COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username)
      WHERE COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = ${author}
      ORDER BY p.created_at DESC
      LIMIT ${capped}
    `;
  }
  if (groupId) {
    return sql`
      SELECT
        p.id, p.body, p.created_at, p.group_id, p.author_username,
        m.name, c.public_username, g.slug AS group_slug, g.name AS group_name,
        CASE
          WHEN COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = c.public_username
          THEN s.role ELSE NULL
        END AS author_role,
        CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_alt
      FROM synk_community_posts p
      JOIN synk_profiles m ON m.id = p.synk_profile_id
      LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
      LEFT JOIN synk_community_groups g ON g.id = p.group_id
      LEFT JOIN synk_community_staff s ON s.synk_profile_id = p.synk_profile_id
      LEFT JOIN synk_community_alt_accounts a
        ON a.public_username = COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username)
      WHERE p.group_id = ${groupId}
      ORDER BY p.created_at DESC
      LIMIT ${capped}
    `;
  }
  return sql`
    SELECT
      p.id, p.body, p.created_at, p.group_id, p.author_username,
      m.name, c.public_username, g.slug AS group_slug, g.name AS group_name,
      CASE
        WHEN COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = c.public_username
        THEN s.role ELSE NULL
      END AS author_role,
      CASE WHEN a.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_alt
    FROM synk_community_posts p
    JOIN synk_profiles m ON m.id = p.synk_profile_id
    LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
    LEFT JOIN synk_community_groups g ON g.id = p.group_id
    LEFT JOIN synk_community_staff s ON s.synk_profile_id = p.synk_profile_id
    LEFT JOIN synk_community_alt_accounts a
      ON a.public_username = COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username)
    ORDER BY p.created_at DESC
    LIMIT ${capped}
  `;
}

async function resolvePostingPersona(sql, auth, role, requestedUsername) {
  const primary = normalizePublicUsername(auth.profile.publicUsername);
  const requested = normalizePublicUsername(requestedUsername) || primary;
  if (!requested) {
    return { ok: false, status: 400, error: "Choose a public username before posting" };
  }
  if (requested === primary) {
    return { ok: true, username: primary, isAlt: false };
  }
  if (role !== "owner") {
    return { ok: false, status: 403, error: "Only the owner can post as an alt account" };
  }
  const alt = await findCommunityAltAccount(sql, {
    username: requested,
    ownerProfileId: auth.profile.id,
  });
  if (!alt) {
    return { ok: false, status: 403, error: "That alt account is not available" };
  }
  return { ok: true, username: alt.username, isAlt: true };
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
    const alts = role === "owner" ? await listOwnerAltAccounts(sql, auth.profile.id) : [];
    const myTags = await listProfileTags(sql, auth.profile.id);
    const myPinnedTag = myTags.find((tag) => tag.pinned) || null;
    const tagCatalog = await listCommunityTags(sql);

    if (event.httpMethod === "GET") {
      const groups = await listCommunityGroups(sql);
      const profileUsername = normalizePublicUsername(qs.user || qs.username || qs.u || "");
      const groupSlug = normalizeGroupSlug(qs.group || qs.slug || "");

      let activeGroup = null;
      let profile = null;
      let posts = [];

      if (profileUsername) {
        profile = await findCommunityPublicProfile(sql, profileUsername);
        if (!profile) return json(404, { error: "Profile not found" });
        posts = await loadPosts(sql, { authorUsername: profileUsername });
      } else {
        if (groupSlug) {
          activeGroup = await findCommunityGroup(sql, { slug: groupSlug });
          if (!activeGroup) return json(404, { error: "Group not found" });
        }
        posts = await loadPosts(sql, {
          groupId: activeGroup ? activeGroup.id : null,
        });
      }

      const mappedPosts = posts.map(mapPost);
      const pinnedByUser = await getPinnedTagsByUsernames(
        sql,
        mappedPosts.map((post) => post.author && post.author.username).filter(Boolean)
      );
      for (const post of mappedPosts) {
        if (!post.author || post.author.isAlt) {
          if (post.author) post.author.pinnedTag = null;
          continue;
        }
        post.author.pinnedTag = pinnedByUser[post.author.username] || null;
      }

      const payload = {
        ok: true,
        me: mePayload(auth, role, alts, myTags, myPinnedTag),
        groups,
        group: activeGroup,
        profile,
        posts: mappedPosts,
        tags: tagCatalog,
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
      if (await isCommunityUsernameTaken(sql, username, { exceptProfileId: auth.profile.id })) {
        return json(409, { error: "That username is already taken" });
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
      const nextAlts =
        nextRole === "owner" ? await listOwnerAltAccounts(sql, auth.profile.id) : [];
      return json(200, {
        ok: true,
        publicUsername: username,
        me: mePayload(
          { ...auth, profile: { ...auth.profile, publicUsername: username } },
          nextRole,
          nextAlts
        ),
      });
    }

    if (action === "create-alt") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can create alt accounts" });
      }
      if (!auth.profile.publicUsername) {
        return json(400, { error: "Set your primary username before creating alts" });
      }
      const username = normalizePublicUsername(body.username || body.publicUsername);
      const label = normalizeAltLabel(body.label || body.name || "");
      if (!username || username.length < 3) {
        return json(400, {
          error: "Alt username must be 3–24 letters, numbers, or underscores",
        });
      }
      if (!/^[a-z0-9_]+$/.test(username)) {
        return json(400, { error: "Use only letters, numbers, and underscores" });
      }
      if (
        username === COMMUNITY_OWNER_USERNAME ||
        username === auth.profile.publicUsername
      ) {
        return json(400, { error: "Pick a different username for this alt" });
      }
      if (await isCommunityUsernameTaken(sql, username)) {
        return json(409, { error: "That username is already taken" });
      }
      if (alts.length >= 20) {
        return json(400, { error: "You already have the maximum number of alt accounts" });
      }
      try {
        const rows = await sql`
          INSERT INTO synk_community_alt_accounts (owner_synk_profile_id, public_username, label)
          VALUES (${auth.profile.id}, ${username}, ${label})
          RETURNING id, public_username, label, created_at, updated_at
        `;
        await logSynkEvent(sql, {
          eventType: "community_alt_create",
          profileId: auth.profile.id,
          ip,
          detail: username,
        });
        return json(201, {
          ok: true,
          alt: {
            id: rows[0].id,
            username: rows[0].public_username,
            label: rows[0].label || "",
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at,
            isAlt: true,
          },
          alts: await listOwnerAltAccounts(sql, auth.profile.id),
        });
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "That username is already taken" });
        }
        throw err;
      }
    }

    if (action === "delete-alt") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can remove alt accounts" });
      }
      const alt = await findCommunityAltAccount(sql, {
        id: body.altId || body.id,
        username: body.username || body.publicUsername,
        ownerProfileId: auth.profile.id,
      });
      if (!alt) return json(404, { error: "Alt account not found" });
      await sql`
        DELETE FROM synk_community_alt_accounts
        WHERE id = ${alt.id}
          AND owner_synk_profile_id = ${auth.profile.id}
      `;
      await logSynkEvent(sql, {
        eventType: "community_alt_delete",
        profileId: auth.profile.id,
        ip,
        detail: alt.username,
      });
      return json(200, {
        ok: true,
        alts: await listOwnerAltAccounts(sql, auth.profile.id),
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
        return json(400, { error: `@${COMMUNITY_OWNER_USERNAME} is already the owner` });
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

      const persona = await resolvePostingPersona(
        sql,
        auth,
        role,
        body.asUsername || body.authorUsername || body.persona
      );
      if (!persona.ok) {
        return json(persona.status || 403, { error: persona.error || "Could not post" });
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
        INSERT INTO synk_community_posts (synk_profile_id, group_id, body, author_username)
        VALUES (${auth.profile.id}, ${group.id}, ${text}, ${persona.username})
        RETURNING id, body, created_at, group_id, author_username
      `;
      await logSynkEvent(sql, {
        eventType: "community_post",
        profileId: auth.profile.id,
        ip,
        detail: `${group.slug}:${persona.username}:${rows[0].id}`,
      });
      const pinnedTag = persona.isAlt
        ? null
        : (await getPinnedTagForProfile(sql, auth.profile.id)) || null;
      return json(201, {
        ok: true,
        post: {
          id: rows[0].id,
          body: rows[0].body,
          createdAt: rows[0].created_at,
          group: { id: group.id, slug: group.slug, name: group.name },
          author: {
            username: persona.username,
            name: persona.isAlt ? "" : auth.profile.name,
            role: persona.isAlt ? null : role || null,
            isAlt: persona.isAlt,
            pinnedTag,
          },
        },
      });
    }

    if (action === "create-tag") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can create tags" });
      }
      const name = normalizeTagName(body.name || body.title);
      const slug = normalizeTagSlug(body.slug || name);
      const description = normalizeTagDescription(body.description || body.about || "");
      const color = normalizeTagColor(body.color || "#6366f1") || "#6366f1";
      if (!name || name.length < 2) {
        return json(400, { error: "Tag name needs at least 2 characters" });
      }
      if (!slug) return json(400, { error: "Tag name is invalid" });
      try {
        const rows = await sql`
          INSERT INTO synk_community_tags (name, slug, description, color, created_by)
          VALUES (${name}, ${slug}, ${description}, ${color}, ${auth.profile.id})
          RETURNING id, name, slug, description, color, created_at, updated_at
        `;
        await logSynkEvent(sql, {
          eventType: "community_tag_create",
          profileId: auth.profile.id,
          ip,
          detail: slug,
        });
        return json(201, {
          ok: true,
          tag: {
            id: rows[0].id,
            name: rows[0].name,
            slug: rows[0].slug,
            description: rows[0].description || "",
            color: rows[0].color,
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at,
            pinned: false,
          },
          tags: await listCommunityTags(sql),
        });
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "A tag with that name already exists" });
        }
        throw err;
      }
    }

    if (action === "update-tag") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can edit tags" });
      }
      const existing = await findCommunityTag(sql, {
        id: body.tagId || body.id,
        slug: body.slug,
      });
      if (!existing) return json(404, { error: "Tag not found" });
      const name = normalizeTagName(body.name || body.title || existing.name);
      const slug = normalizeTagSlug(body.slug || name);
      const description = normalizeTagDescription(
        body.description != null ? body.description : existing.description
      );
      const color =
        normalizeTagColor(body.color != null ? body.color : existing.color) || existing.color;
      if (!name || name.length < 2) {
        return json(400, { error: "Tag name needs at least 2 characters" });
      }
      if (!slug) return json(400, { error: "Tag name is invalid" });
      try {
        const rows = await sql`
          UPDATE synk_community_tags
          SET
            name = ${name},
            slug = ${slug},
            description = ${description},
            color = ${color},
            updated_at = NOW()
          WHERE id = ${existing.id}
          RETURNING id, name, slug, description, color, created_at, updated_at
        `;
        await logSynkEvent(sql, {
          eventType: "community_tag_update",
          profileId: auth.profile.id,
          ip,
          detail: slug,
        });
        return json(200, {
          ok: true,
          tag: {
            id: rows[0].id,
            name: rows[0].name,
            slug: rows[0].slug,
            description: rows[0].description || "",
            color: rows[0].color,
            createdAt: rows[0].created_at,
            updatedAt: rows[0].updated_at,
            pinned: false,
          },
          tags: await listCommunityTags(sql),
        });
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "A tag with that name already exists" });
        }
        throw err;
      }
    }

    if (action === "delete-tag") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can delete tags" });
      }
      const existing = await findCommunityTag(sql, {
        id: body.tagId || body.id,
        slug: body.slug,
      });
      if (!existing) return json(404, { error: "Tag not found" });
      await sql`DELETE FROM synk_community_tags WHERE id = ${existing.id}`;
      await logSynkEvent(sql, {
        eventType: "community_tag_delete",
        profileId: auth.profile.id,
        ip,
        detail: existing.slug,
      });
      return json(200, {
        ok: true,
        tags: await listCommunityTags(sql),
      });
    }

    if (action === "assign-tag") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can assign tags" });
      }
      const username = normalizePublicUsername(body.username || body.publicUsername);
      if (!username) return json(400, { error: "Username is required" });
      const profileId = await findCommunityProfileIdByUsername(sql, username);
      if (!profileId) {
        return json(404, { error: "No community member with that username" });
      }
      const tag = await findCommunityTag(sql, {
        id: body.tagId || body.id,
        slug: body.tag || body.slug,
      });
      if (!tag) return json(404, { error: "Tag not found" });
      await sql`
        INSERT INTO synk_community_profile_tags (synk_profile_id, tag_id, assigned_by)
        VALUES (${profileId}, ${tag.id}, ${auth.profile.id})
        ON CONFLICT (synk_profile_id, tag_id) DO NOTHING
      `;
      await logSynkEvent(sql, {
        eventType: "community_tag_assign",
        profileId: auth.profile.id,
        ip,
        detail: `${username}:${tag.slug}`,
      });
      return json(200, {
        ok: true,
        username,
        tags: await listProfileTags(sql, profileId),
      });
    }

    if (action === "unassign-tag") {
      if (role !== "owner") {
        return json(403, { error: "Only the owner can remove tags" });
      }
      const username = normalizePublicUsername(body.username || body.publicUsername);
      if (!username) return json(400, { error: "Username is required" });
      const profileId = await findCommunityProfileIdByUsername(sql, username);
      if (!profileId) {
        return json(404, { error: "No community member with that username" });
      }
      const tag = await findCommunityTag(sql, {
        id: body.tagId || body.id,
        slug: body.tag || body.slug,
      });
      if (!tag) return json(404, { error: "Tag not found" });
      await sql`
        DELETE FROM synk_community_profile_tags
        WHERE synk_profile_id = ${profileId}
          AND tag_id = ${tag.id}
      `;
      // Clear pin if that tag was pinned.
      await sql`
        UPDATE synk_community_profiles
        SET pinned_tag_id = NULL
        WHERE synk_profile_id = ${profileId}
          AND pinned_tag_id = ${tag.id}
      `;
      await logSynkEvent(sql, {
        eventType: "community_tag_unassign",
        profileId: auth.profile.id,
        ip,
        detail: `${username}:${tag.slug}`,
      });
      return json(200, {
        ok: true,
        username,
        tags: await listProfileTags(sql, profileId),
      });
    }

    if (action === "pin-tag") {
      if (!auth.profile.publicUsername) {
        return json(400, { error: "Choose a public username first" });
      }
      const clearPin =
        body.tagId == null &&
        body.id == null &&
        !body.tag &&
        !body.slug &&
        (body.clear === true || body.pin === false || body.pinned === false);
      if (clearPin) {
        await sql`
          UPDATE synk_community_profiles
          SET pinned_tag_id = NULL, updated_at = NOW()
          WHERE synk_profile_id = ${auth.profile.id}
        `;
        await logSynkEvent(sql, {
          eventType: "community_tag_unpin",
          profileId: auth.profile.id,
          ip,
          detail: auth.profile.publicUsername,
        });
        const tags = await listProfileTags(sql, auth.profile.id);
        return json(200, {
          ok: true,
          pinnedTag: null,
          tags,
          me: mePayload(auth, role, alts, tags, null),
        });
      }
      const tag = await findCommunityTag(sql, {
        id: body.tagId || body.id,
        slug: body.tag || body.slug,
      });
      if (!tag) return json(404, { error: "Tag not found" });
      const owned = await sql`
        SELECT 1
        FROM synk_community_profile_tags
        WHERE synk_profile_id = ${auth.profile.id}
          AND tag_id = ${tag.id}
        LIMIT 1
      `;
      if (!owned[0]) {
        return json(403, { error: "You can only pin a tag assigned to you" });
      }
      await sql`
        UPDATE synk_community_profiles
        SET pinned_tag_id = ${tag.id}, updated_at = NOW()
        WHERE synk_profile_id = ${auth.profile.id}
      `;
      await logSynkEvent(sql, {
        eventType: "community_tag_pin",
        profileId: auth.profile.id,
        ip,
        detail: tag.slug,
      });
      const tags = await listProfileTags(sql, auth.profile.id);
      const pinnedTag = tags.find((item) => item.pinned) || null;
      return json(200, {
        ok: true,
        pinnedTag,
        tags,
        me: mePayload(auth, role, alts, tags, pinnedTag),
      });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("synk-community error:", err);
    return json(500, { error: "Server error" });
  }
};
