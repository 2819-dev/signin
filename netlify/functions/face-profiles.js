const { getSql, json, requireAdmin } = require("./lib/db");

const POLICIES = new Set(["autofill", "auto_admit", "auto_deny"]);

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

function normalizePolicy(value) {
  return POLICIES.has(value) ? value : "autofill";
}

function normalizeDescriptor(value) {
  if (!Array.isArray(value) || value.length < 64) return null;
  const nums = value.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (nums.length < 64 || nums.length > 512) return null;
  return nums;
}

function mapProfile(row, { includeDescriptor = false } = {}) {
  if (!row) return null;
  const profile = {
    id: row.id,
    name: row.name,
    policy: row.policy,
    photoUrl: row.photo_url || "",
    enabled: row.enabled !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeDescriptor) {
    profile.descriptor = row.descriptor;
  }
  return profile;
}

async function ensureFaceTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS face_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      policy TEXT NOT NULL DEFAULT 'autofill'
        CHECK (policy IN ('autofill', 'auto_admit', 'auto_deny')),
      descriptor JSONB NOT NULL,
      photo_url TEXT NOT NULL DEFAULT '',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS face_profiles_enabled_idx ON face_profiles (enabled, updated_at DESC)`;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  try {
    const sql = getSql();
    await ensureFaceTables(sql);

    if (event.httpMethod === "GET") {
      const auth = requireAdmin(event);
      if (!auth.ok) return auth.response;

      const rows = await sql`
        SELECT id, name, policy, photo_url, enabled, created_at, updated_at
        FROM face_profiles
        ORDER BY updated_at DESC
        LIMIT 100
      `;
      return json(200, { profiles: rows.map((row) => mapProfile(row)) });
    }

    if (event.httpMethod === "POST") {
      const auth = requireAdmin(event);
      if (!auth.ok) return auth.response;

      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      const name = normalizeName(body.name);
      const policy = normalizePolicy(body.policy);
      const descriptor = normalizeDescriptor(body.descriptor);
      const photoUrl = String(body.photoUrl || "").trim().slice(0, 500);
      const enabled = body.enabled !== false;

      if (!name) return json(400, { error: "Name is required" });
      if (!descriptor) return json(400, { error: "A clear face photo is required" });

      const rows = await sql`
        INSERT INTO face_profiles (name, policy, descriptor, photo_url, enabled)
        VALUES (${name}, ${policy}, ${JSON.stringify(descriptor)}::jsonb, ${photoUrl}, ${enabled})
        RETURNING id, name, policy, photo_url, enabled, created_at, updated_at
      `;
      return json(201, { profile: mapProfile(rows[0]) });
    }

    if (event.httpMethod === "PATCH") {
      const auth = requireAdmin(event);
      if (!auth.ok) return auth.response;

      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id is required" });

      const existingRows = await sql`
        SELECT id, name, policy, descriptor, photo_url, enabled, created_at, updated_at
        FROM face_profiles
        WHERE id = ${id}
        LIMIT 1
      `;
      if (!existingRows[0]) return json(404, { error: "Person not found" });
      const existing = existingRows[0];

      const name =
        typeof body.name === "string" ? normalizeName(body.name) : existing.name;
      const policy =
        typeof body.policy === "string" ? normalizePolicy(body.policy) : existing.policy;
      const photoUrl =
        typeof body.photoUrl === "string"
          ? String(body.photoUrl).trim().slice(0, 500)
          : existing.photo_url || "";
      const enabled =
        typeof body.enabled === "boolean" ? body.enabled : existing.enabled !== false;
      const descriptor =
        body.descriptor != null ? normalizeDescriptor(body.descriptor) : null;

      if (!name) return json(400, { error: "Name is required" });
      if (body.descriptor != null && !descriptor) {
        return json(400, { error: "Could not read face from that photo" });
      }

      const rows = descriptor
        ? await sql`
            UPDATE face_profiles
            SET name = ${name},
                policy = ${policy},
                photo_url = ${photoUrl},
                enabled = ${enabled},
                descriptor = ${JSON.stringify(descriptor)}::jsonb,
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING id, name, policy, photo_url, enabled, created_at, updated_at
          `
        : await sql`
            UPDATE face_profiles
            SET name = ${name},
                policy = ${policy},
                photo_url = ${photoUrl},
                enabled = ${enabled},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING id, name, policy, photo_url, enabled, created_at, updated_at
          `;

      return json(200, { profile: mapProfile(rows[0]) });
    }

    if (event.httpMethod === "DELETE") {
      const auth = requireAdmin(event);
      if (!auth.ok) return auth.response;

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
        DELETE FROM face_profiles
        WHERE id = ${id}
        RETURNING id
      `;
      if (!rows[0]) return json(404, { error: "Person not found" });
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
