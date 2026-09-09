const { getSql, json, mapRow } = require("./lib/db");
const { verifySecret } = require("./lib/synk");
const { notifyAdmins } = require("./lib/push");

function normalizeLookup(value) {
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
  return raw;
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
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON" });
    }

    const lookup = normalizeLookup(body.synkCode || body.synkId || body.name);
    const secret = normalizeSecret(body.secret);
    const dateOfBirth = normalizeDob(body.dateOfBirth);

    if (!lookup) return json(400, { error: "Synk ID or name is required" });
    if (!secret) return json(400, { error: "Secret is required" });
    if (!dateOfBirth) return json(400, { error: "Date of birth is required" });

    const sql = getSql();
    await ensureSynkTables(sql);

    const codeLookup = lookup.toUpperCase();
    const rows = await sql`
      SELECT id, synk_code, name, date_of_birth, secret_hash, photo_url, enabled
      FROM synk_profiles
      WHERE enabled = TRUE
        AND (
          UPPER(synk_code) = ${codeLookup}
          OR LOWER(name) = ${lookup.toLowerCase()}
        )
      ORDER BY updated_at DESC
      LIMIT 5
    `;

    if (!rows.length) {
      return json(401, { error: "Synk ID not recognized" });
    }

    let matched = null;
    for (const row of rows) {
      const dob =
        row.date_of_birth instanceof Date
          ? row.date_of_birth.toISOString().slice(0, 10)
          : String(row.date_of_birth).slice(0, 10);
      if (dob !== dateOfBirth) continue;
      if (!verifySecret(secret, row.secret_hash)) continue;
      matched = row;
      break;
    }

    if (!matched) {
      return json(401, { error: "Could not verify Synk ID" });
    }

    const inserted = await sql`
      INSERT INTO visitor_requests (name, reason, status, urgent, resolved_at)
      VALUES (
        ${matched.name},
        'Synk ID',
        'admitted',
        FALSE,
        NOW()
      )
      RETURNING id, name, reason, status, decline_reason, urgent, created_at, resolved_at
    `;
    const request = mapRow(inserted[0]);

    try {
      await notifyAdmins({
        title: "Synk ID sign-in",
        body: `${request.name} signed in with Synk ID`,
        url: "/admin",
        tag: `visitor-${request.id}`,
        name: request.name,
        reason: request.reason,
      });
    } catch (err) {
      console.error("synk admit notify failed", err.message || err);
    }

    return json(200, {
      ok: true,
      profile: {
        id: matched.id,
        synkCode: matched.synk_code,
        name: matched.name,
        photoUrl: matched.photo_url || "",
      },
      request,
    });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
