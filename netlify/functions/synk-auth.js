const { getSql, json, mapRow } = require("./lib/db");
const { verifySecret } = require("./lib/synk");
const { notifyAdmins } = require("./lib/push");

const MATCH_THRESHOLD = 0.55;

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

function toDobString(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : raw.slice(0, 10);
}

function normalizeDescriptor(value) {
  if (!Array.isArray(value) || value.length < 64) return null;
  const nums = value.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (nums.length < 64 || nums.length > 512) return null;
  return nums;
}

function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = Number(a[i]) - Number(b[i]);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

async function ensureSynkTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS synk_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      synk_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      date_of_birth DATE NOT NULL,
      secret_hash TEXT,
      photo_url TEXT NOT NULL DEFAULT '',
      descriptor JSONB,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE synk_profiles ADD COLUMN IF NOT EXISTS descriptor JSONB`;
  await sql`ALTER TABLE synk_profiles ALTER COLUMN secret_hash DROP NOT NULL`;
}

async function admitSynkMember(sql, matched) {
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
      title: "Synk ID verified",
      body: `${request.name} cleared with Synk ID`,
      url: "/admin",
      tag: `visitor-${request.id}`,
      name: request.name,
      reason: request.reason,
    });
  } catch (err) {
    console.error("synk admit notify failed", err.message || err);
  }

  return {
    ok: true,
    profile: {
      id: matched.id,
      synkCode: matched.synk_code,
      name: matched.name,
      photoUrl: matched.photo_url || "",
    },
    request,
  };
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

    const sql = getSql();
    await ensureSynkTables(sql);

    const descriptor = normalizeDescriptor(body.descriptor);
    if (descriptor) {
      const rows = await sql`
        SELECT id, synk_code, name, photo_url, descriptor, enabled
        FROM synk_profiles
        WHERE enabled = TRUE
          AND descriptor IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 200
      `;

      let best = null;
      let bestDistance = Infinity;

      for (const row of rows) {
        let stored = row.descriptor;
        if (typeof stored === "string") {
          try {
            stored = JSON.parse(stored);
          } catch {
            stored = null;
          }
        }
        if (!Array.isArray(stored)) continue;
        const distance = euclideanDistance(descriptor, stored);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = row;
        }
      }

      if (!best || bestDistance > MATCH_THRESHOLD) {
        return json(401, {
          error: "No Synk member matched. Try again or use your Synk code.",
          distance: Number.isFinite(bestDistance) ? bestDistance : null,
        });
      }

      return json(200, await admitSynkMember(sql, best));
    }

    // Fallback: Synk code / name + DOB + secret (like showing ID if biometrics fail)
    const lookup = normalizeLookup(body.synkCode || body.synkId || body.name);
    const secret = normalizeSecret(body.secret);
    const dateOfBirth = normalizeDob(body.dateOfBirth);

    if (!lookup) return json(400, { error: "Look at the camera, or enter your Synk ID" });
    if (!secret) return json(400, { error: "Secret is required for code sign-in" });
    if (!dateOfBirth) return json(400, { error: "Date of birth is required for code sign-in" });

    const codeLookup = lookup.toUpperCase();
    const rows = await sql`
      SELECT id, synk_code, name, date_of_birth, secret_hash, photo_url, enabled
      FROM synk_profiles
      WHERE enabled = TRUE
        AND secret_hash IS NOT NULL
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
      const dob = toDobString(row.date_of_birth);
      if (dob !== dateOfBirth) continue;
      if (!verifySecret(secret, row.secret_hash)) continue;
      matched = row;
      break;
    }

    if (!matched) {
      return json(401, { error: "Could not verify Synk ID" });
    }

    return json(200, await admitSynkMember(sql, matched));
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
