const { getSql, json, mapRow } = require("./lib/db");
const { notifyAdmins } = require("./lib/push");
const {
  verifySecret,
  clientIp,
  sleep,
  ensureSynkCoreTables,
  logSynkEvent,
  assertNotRateLimited,
  issuePass,
} = require("./lib/synk");
const { signedPhotoUrl } = require("./lib/synk-admin-auth");

const MATCH_THRESHOLD = 0.52;
const POLICIES = new Set(["pending", "autofill", "auto_admit", "auto_deny"]);

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

function normalizePolicy(value) {
  return POLICIES.has(value) ? value : "pending";
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

function publicProfile(row) {
  return {
    id: row.id,
    synkCode: row.synk_code,
    name: row.name,
    photoUrl: signedPhotoUrl(row.photo_url || ""),
    policy: normalizePolicy(row.policy),
  };
}

async function applyVisitorIntent(sql, matched) {
  const policy = normalizePolicy(matched.policy);

  if (policy === "autofill") {
    return { request: null, policy };
  }

  if (policy === "auto_admit") {
    const inserted = await sql`
      INSERT INTO visitor_requests (name, reason, status, urgent, resolved_at)
      VALUES (${matched.name}, 'Synk ID', 'admitted', FALSE, NOW())
      RETURNING id, name, reason, status, decline_reason, urgent, created_at, resolved_at
    `;
    const request = mapRow(inserted[0]);
    try {
      await notifyAdmins({
        title: "Synk auto-admit",
        body: `${request.name} was admitted via Synk`,
        url: "/admin",
        tag: `visitor-${request.id}`,
        name: request.name,
        reason: request.reason,
      });
    } catch (err) {
      console.error("synk admit notify failed", err.message || err);
    }
    return { request, policy };
  }

  if (policy === "auto_deny") {
    const inserted = await sql`
      INSERT INTO visitor_requests (name, reason, status, decline_reason, urgent, resolved_at)
      VALUES (${matched.name}, 'Synk ID', 'declined', 'Access denied', FALSE, NOW())
      RETURNING id, name, reason, status, decline_reason, urgent, created_at, resolved_at
    `;
    const request = mapRow(inserted[0]);
    try {
      await notifyAdmins({
        title: "Synk auto-deny",
        body: `${request.name} was denied by Synk policy`,
        url: "/admin",
        tag: `visitor-${request.id}`,
        name: request.name,
        reason: request.reason,
      });
    } catch (err) {
      console.error("synk deny notify failed", err.message || err);
    }
    return { request, policy };
  }

  const inserted = await sql`
    INSERT INTO visitor_requests (name, reason, status, urgent)
    VALUES (${matched.name}, 'Synk ID', 'pending', FALSE)
    RETURNING id, name, reason, status, decline_reason, urgent, created_at, resolved_at
  `;
  const request = mapRow(inserted[0]);
  try {
    await notifyAdmins({
      title: "Synk verification request",
      body: `${request.name} verified with Synk ID — needs approval`,
      url: "/admin",
      tag: `visitor-${request.id}`,
      name: request.name,
      reason: request.reason,
    });
  } catch (err) {
    console.error("synk pending notify failed", err.message || err);
  }
  return { request, policy };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const ip = clientIp(event);

  try {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON" });
    }

    const sql = getSql();
    await ensureSynkCoreTables(sql);

    if (!(await assertNotRateLimited(sql, ip))) {
      await sleep(400);
      return json(429, { error: "Too many Synk attempts. Wait a minute and try again." });
    }

    const appSlug = String(body.appSlug || body.app || "synk").trim().slice(0, 80) || "synk";
    const intent = String(body.intent || "").trim().toLowerCase(); // visitor | identity
    const descriptors = Array.isArray(body.descriptors)
      ? body.descriptors.map(normalizeDescriptor).filter(Boolean)
      : [];
    const single = normalizeDescriptor(body.descriptor);
    if (single) descriptors.unshift(single);

    let matched = null;
    let method = null;

    if (descriptors.length) {
      // Liveness-ish: if two frames provided, they must be consistent.
      if (descriptors.length >= 2) {
        const drift = euclideanDistance(descriptors[0], descriptors[1]);
        if (!Number.isFinite(drift) || drift > 0.38) {
          await logSynkEvent(sql, {
            eventType: "verify_fail",
            appSlug,
            ip,
            detail: "unstable biometrics",
          });
          await sleep(350);
          return json(401, { error: "Could not verify Synk ID" });
        }
      }

      const probe = descriptors[0];
      const rows = await sql`
        SELECT id, synk_code, name, photo_url, descriptor, policy, enabled
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
        const distance = euclideanDistance(probe, stored);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = row;
        }
      }

      if (best && bestDistance <= MATCH_THRESHOLD) {
        matched = best;
        method = "biometric";
      }
    } else {
      const lookup = normalizeLookup(body.synkCode || body.synkId || body.name);
      const secret = normalizeSecret(body.secret);
      const dateOfBirth = normalizeDob(body.dateOfBirth);
      if (!lookup || !secret || !dateOfBirth) {
        await logSynkEvent(sql, { eventType: "verify_fail", appSlug, ip, detail: "missing backup fields" });
        await sleep(250);
        return json(400, { error: "Could not verify Synk ID" });
      }

      const codeLookup = lookup.toUpperCase();
      const rows = await sql`
        SELECT id, synk_code, name, date_of_birth, secret_hash, photo_url, policy, enabled
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

      for (const row of rows) {
        if (toDobString(row.date_of_birth) !== dateOfBirth) continue;
        if (!verifySecret(secret, row.secret_hash)) continue;
        matched = row;
        method = "backup";
        break;
      }
    }

    if (!matched) {
      await logSynkEvent(sql, { eventType: "verify_fail", appSlug, ip, detail: method || "no match" });
      await sleep(400);
      return json(401, { error: "Could not verify Synk ID" });
    }

    const pass = await issuePass(sql, {
      profileId: matched.id,
      appSlug,
      purpose: intent === "visitor" ? "visitor" : "identity",
    });

    await logSynkEvent(sql, {
      eventType: "verify_ok",
      profileId: matched.id,
      appSlug,
      ip,
      detail: method || "ok",
    });

    const profile = publicProfile(matched);
    let request = null;
    if (intent === "visitor" || appSlug === "visitor-signin") {
      const bridge = await applyVisitorIntent(sql, matched);
      request = bridge.request;
      profile.policy = bridge.policy;
    }

    return json(200, {
      ok: true,
      product: "synk",
      method,
      profile,
      pass,
      request,
    });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
