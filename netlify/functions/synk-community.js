"use strict";

const { getSql, json } = require("./lib/db");
const {
  ensureSynkCoreTables,
  requireHubSession,
  normalizePublicUsername,
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
    author: {
      username: row.public_username || "member",
      name: row.name || "",
    },
  };
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
    if (!auth.ok) return json(auth.status || 401, { error: auth.error || "Unauthorized" });

    if (event.httpMethod === "GET") {
      const posts = await sql`
        SELECT p.id, p.body, p.created_at, m.name, c.public_username
        FROM synk_community_posts p
        JOIN synk_profiles m ON m.id = p.synk_profile_id
        LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
        ORDER BY p.created_at DESC
        LIMIT 80
      `;
      return json(200, {
        ok: true,
        me: {
          profileId: auth.profile.id,
          name: auth.profile.name,
          synkCode: auth.profile.synkCode,
          publicUsername: auth.profile.publicUsername || "",
        },
        posts: posts.map(mapPost),
      });
    }

    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const action = String(body.action || "post").trim().toLowerCase();
    const ip = (() => {
      try {
        return clientIp(event);
      } catch {
        return "";
      }
    })();

    if (action === "set-username") {
      const username = normalizePublicUsername(body.username || body.publicUsername);
      if (!username || username.length < 3) {
        return json(400, { error: "Username must be 3–24 letters, numbers, or underscores" });
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
      await logSynkEvent(sql, {
        eventType: "community_username",
        profileId: auth.profile.id,
        ip,
        detail: username,
      });
      return json(200, { ok: true, publicUsername: username });
    }

    if (action === "post" || action === "create") {
      if (!auth.profile.publicUsername) {
        return json(400, { error: "Choose a public username before posting" });
      }
      const text = normalizePostBody(body.body || body.text || body.message);
      if (!text || text.length < 3) {
        return json(400, { error: "Write a short post (at least a few characters)" });
      }
      const rows = await sql`
        INSERT INTO synk_community_posts (synk_profile_id, body)
        VALUES (${auth.profile.id}, ${text})
        RETURNING id, body, created_at
      `;
      await logSynkEvent(sql, {
        eventType: "community_post",
        profileId: auth.profile.id,
        ip,
        detail: String(rows[0].id),
      });
      return json(201, {
        ok: true,
        post: {
          id: rows[0].id,
          body: rows[0].body,
          createdAt: rows[0].created_at,
          author: {
            username: auth.profile.publicUsername,
            name: auth.profile.name,
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
