const { getSql, json, requireAdmin } = require("./lib/db");
const { hashSecret, generateSynkCode } = require("./lib/synk");

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

function normalizeSecret(value) {
  return String(value || "").trim();
}

function normalizeDob(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  if (year < 1900 || year > new Date().getUTCFullYear()) return null;
  return raw;
}

function toDobString(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : raw.slice(0, 10);
}

function mapProfile(row, { includeSecretHint = false } = {}) {
  if (!row) return null;
  const profile = {
    id: row.id,
    synkCode: row.synk_code,
    name: row.name,
    dateOfBirth: toDobString(row.date_of_birth),
    photoUrl: row.photo_url || "",
    enabled: row.enabled !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeSecretHint) {
    profile.hasSecret = Boolean(row.secret_hash);
  }
  return profile;
}

async function ensureSynkTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS synk_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      synk_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      date_of_birth DATE NOT NULL,
      secret_hash TEXT NOT NULL,
      photo_url TEXT NOT NULL DEFAULT '',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS synk_profiles_enabled_idx ON synk_profiles (enabled, updated_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS synk_profiles_code_idx ON synk_profiles (synk_code)`;
}

async function uniqueSynkCode(sql) {
  for (let i = 0; i < 12; i += 1) {
    const code = generateSynkCode();
    const rows = await sql`SELECT id FROM synk_profiles WHERE synk_code = ${code} LIMIT 1`;
    if (!rows[0]) return code;
  }
  throw new Error("Could not allocate Synk ID");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  try {
    const sql = getSql();
    await ensureSynkTables(sql);

    if (event.httpMethod === "GET") {
      const auth = requireAdmin(event);
      if (!auth.ok) return auth.response;

      const rows = await sql`
        SELECT id, synk_code, name, date_of_birth, secret_hash, photo_url, enabled, created_at, updated_at
        FROM synk_profiles
        ORDER BY updated_at DESC
        LIMIT 200
      `;
      return json(200, {
        profiles: rows.map((row) => mapProfile(row, { includeSecretHint: true })),
      });
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
      const secret = normalizeSecret(body.secret);
      const dateOfBirth = normalizeDob(body.dateOfBirth);
      const photoUrl = String(body.photoUrl || "").trim().slice(0, 500);
      const enabled = body.enabled !== false;

      if (!name) return json(400, { error: "Name is required" });
      if (!dateOfBirth) return json(400, { error: "Date of birth is required" });
      if (secret.length < 4) return json(400, { error: "Secret must be at least 4 characters" });
      if (secret.length > 200) return json(400, { error: "Secret is too long" });

      const synkCode = await uniqueSynkCode(sql);
      const secretHash = hashSecret(secret);

      const rows = await sql`
        INSERT INTO synk_profiles (synk_code, name, date_of_birth, secret_hash, photo_url, enabled)
        VALUES (${synkCode}, ${name}, ${dateOfBirth}::date, ${secretHash}, ${photoUrl}, ${enabled})
        RETURNING id, synk_code, name, date_of_birth, secret_hash, photo_url, enabled, created_at, updated_at
      `;
      return json(201, { profile: mapProfile(rows[0], { includeSecretHint: true }) });
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
        SELECT id, synk_code, name, date_of_birth, secret_hash, photo_url, enabled, created_at, updated_at
        FROM synk_profiles
        WHERE id = ${id}
        LIMIT 1
      `;
      if (!existingRows[0]) return json(404, { error: "Person not found" });
      const existing = existingRows[0];

      const name =
        typeof body.name === "string" ? normalizeName(body.name) : existing.name;
      const dateOfBirth =
        typeof body.dateOfBirth === "string"
          ? normalizeDob(body.dateOfBirth)
          : toDobString(existing.date_of_birth);
      const photoUrl =
        typeof body.photoUrl === "string"
          ? String(body.photoUrl).trim().slice(0, 500)
          : existing.photo_url || "";
      const enabled =
        typeof body.enabled === "boolean" ? body.enabled : existing.enabled !== false;

      let secretHash = existing.secret_hash;
      if (typeof body.secret === "string" && body.secret.trim()) {
        const secret = normalizeSecret(body.secret);
        if (secret.length < 4) return json(400, { error: "Secret must be at least 4 characters" });
        if (secret.length > 200) return json(400, { error: "Secret is too long" });
        secretHash = hashSecret(secret);
      }

      if (!name) return json(400, { error: "Name is required" });
      if (!dateOfBirth) return json(400, { error: "Date of birth is required" });

      const rows = await sql`
        UPDATE synk_profiles
        SET name = ${name},
            date_of_birth = ${dateOfBirth}::date,
            photo_url = ${photoUrl},
            enabled = ${enabled},
            secret_hash = ${secretHash},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, synk_code, name, date_of_birth, secret_hash, photo_url, enabled, created_at, updated_at
      `;

      return json(200, { profile: mapProfile(rows[0], { includeSecretHint: true }) });
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
        DELETE FROM synk_profiles
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
