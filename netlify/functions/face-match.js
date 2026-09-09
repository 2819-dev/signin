const { getSql, json, mapRow } = require("./lib/db");
const { notifyAdmins } = require("./lib/push");

const MATCH_THRESHOLD = 0.55;

function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const d = Number(a[i]) - Number(b[i]);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function normalizeDescriptor(value) {
  if (!Array.isArray(value) || value.length < 64) return null;
  const nums = value.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (nums.length < 64 || nums.length > 512) return null;
  return nums;
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

    const descriptor = normalizeDescriptor(body.descriptor);
    if (!descriptor) {
      return json(400, { error: "Face data is required" });
    }

    const sql = getSql();
    await ensureFaceTables(sql);

    const rows = await sql`
      SELECT id, name, policy, descriptor, photo_url, enabled
      FROM face_profiles
      WHERE enabled = TRUE
      ORDER BY updated_at DESC
      LIMIT 100
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
      return json(200, {
        match: null,
        distance: Number.isFinite(bestDistance) ? bestDistance : null,
      });
    }

    const match = {
      id: best.id,
      name: best.name,
      policy: best.policy,
      photoUrl: best.photo_url || "",
      distance: bestDistance,
    };

    if (best.policy === "autofill") {
      return json(200, { match, request: null });
    }

    if (best.policy === "auto_admit") {
      const inserted = await sql`
        INSERT INTO visitor_requests (name, reason, status, urgent, resolved_at)
        VALUES (
          ${best.name},
          'Face sign-in',
          'admitted',
          FALSE,
          NOW()
        )
        RETURNING id, name, reason, status, decline_reason, urgent, created_at, resolved_at
      `;
      const request = mapRow(inserted[0]);
      try {
        await notifyAdmins({
          title: "Face auto-admit",
          body: `${request.name} signed in with face`,
          url: "/admin",
          tag: `visitor-${request.id}`,
          name: request.name,
          reason: request.reason,
        });
      } catch (err) {
        console.error("face admit notify failed", err.message || err);
      }
      return json(200, { match, request });
    }

    if (best.policy === "auto_deny") {
      const inserted = await sql`
        INSERT INTO visitor_requests (name, reason, status, decline_reason, urgent, resolved_at)
        VALUES (
          ${best.name},
          'Face sign-in',
          'declined',
          'Access denied',
          FALSE,
          NOW()
        )
        RETURNING id, name, reason, status, decline_reason, urgent, created_at, resolved_at
      `;
      const request = mapRow(inserted[0]);
      try {
        await notifyAdmins({
          title: "Face auto-deny",
          body: `${request.name} was denied by face policy`,
          url: "/admin",
          tag: `visitor-${request.id}`,
          name: request.name,
          reason: request.reason,
        });
      } catch (err) {
        console.error("face deny notify failed", err.message || err);
      }
      return json(200, { match, request });
    }

    return json(200, { match, request: null });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
