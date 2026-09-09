const { getSql, json, requireAdmin } = require("./lib/db");
const {
  ensureSynkCoreTables,
  generateApiKey,
  hashSecret,
  logSynkEvent,
} = require("./lib/synk");

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

function mapApp(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    enabled: row.enabled !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);

    if (event.httpMethod === "GET") {
      const rows = await sql`
        SELECT id, slug, name, enabled, created_at, updated_at
        FROM synk_apps
        ORDER BY created_at ASC
        LIMIT 100
      `;
      const events = await sql`
        SELECT id, event_type, synk_profile_id, app_slug, ip, detail, created_at
        FROM synk_events
        ORDER BY created_at DESC
        LIMIT 40
      `;
      return json(200, {
        apps: rows.map(mapApp),
        events: events.map((row) => ({
          id: row.id,
          type: row.event_type,
          profileId: row.synk_profile_id,
          appSlug: row.app_slug,
          ip: row.ip,
          detail: row.detail,
          createdAt: row.created_at,
        })),
      });
    }

    if (event.httpMethod === "POST") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      if (body.action === "rotate-key") {
        const id = String(body.id || "").trim();
        if (!id) return json(400, { error: "id is required" });
        const apiKey = generateApiKey();
        const rows = await sql`
          UPDATE synk_apps
          SET api_key_hash = ${hashSecret(apiKey)}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING id, slug, name, enabled, created_at, updated_at
        `;
        if (!rows[0]) return json(404, { error: "App not found" });
        await logSynkEvent(sql, {
          eventType: "app_key_rotate",
          appSlug: rows[0].slug,
          detail: "rotated",
        });
        return json(200, { app: mapApp(rows[0]), apiKey });
      }

      const name = normalizeName(body.name);
      const slug = normalizeSlug(body.slug || name);
      if (!name) return json(400, { error: "Name is required" });
      if (!slug) return json(400, { error: "Slug is required" });

      const apiKey = generateApiKey();
      try {
        const rows = await sql`
          INSERT INTO synk_apps (slug, name, api_key_hash)
          VALUES (${slug}, ${name}, ${hashSecret(apiKey)})
          RETURNING id, slug, name, enabled, created_at, updated_at
        `;
        await logSynkEvent(sql, {
          eventType: "app_create",
          appSlug: slug,
          detail: name,
        });
        return json(201, { app: mapApp(rows[0]), apiKey });
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "That app slug already exists" });
        }
        throw err;
      }
    }

    if (event.httpMethod === "PATCH") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }
      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id is required" });

      const existing = await sql`
        SELECT id, slug, name, enabled FROM synk_apps WHERE id = ${id} LIMIT 1
      `;
      if (!existing[0]) return json(404, { error: "App not found" });

      const name =
        typeof body.name === "string" ? normalizeName(body.name) : existing[0].name;
      const enabled =
        typeof body.enabled === "boolean" ? body.enabled : existing[0].enabled !== false;
      if (!name) return json(400, { error: "Name is required" });

      const rows = await sql`
        UPDATE synk_apps
        SET name = ${name}, enabled = ${enabled}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, slug, name, enabled, created_at, updated_at
      `;
      return json(200, { app: mapApp(rows[0]) });
    }

    if (event.httpMethod === "DELETE") {
      const id =
        (event.queryStringParameters && event.queryStringParameters.id) ||
        (() => {
          try {
            return JSON.parse(event.body || "{}").id;
          } catch {
            return "";
          }
        })();
      if (!id) return json(400, { error: "id is required" });
      const rows = await sql`
        DELETE FROM synk_apps
        WHERE id = ${id} AND slug <> 'visitor-signin'
        RETURNING slug
      `;
      if (!rows[0]) {
        return json(400, { error: "App not found or cannot delete visitor-signin bridge" });
      }
      await logSynkEvent(sql, { eventType: "app_delete", appSlug: rows[0].slug, detail: "deleted" });
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
