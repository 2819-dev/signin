"use strict";

const { createHmac, timingSafeEqual, randomBytes } = require("crypto");
const { hashSecret, verifySecret, hashToken } = require("./synk");

const BUSINESS_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function businessSigningSecret() {
  return (
    process.env.SYNK_BUSINESS_SESSION_SECRET ||
    process.env.SYNK_ADMIN_SESSION_SECRET ||
    process.env.SYNK_ADMIN_SECRET ||
    ""
  );
}

function b64urlJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function parseB64urlJson(value) {
  const padded = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return JSON.parse(Buffer.from(padded + pad, "base64").toString("utf8"));
}

function signBusinessToken(payload) {
  const secret = businessSigningSecret();
  if (!secret) throw new Error("Business session secret is not configured");
  const body = b64urlJson(payload);
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyBusinessToken(token) {
  const secret = businessSigningSecret();
  if (!secret) return null;
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const left = Buffer.from(String(sig));
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = parseB64urlJson(body);
    if (!payload || payload.typ !== "synk_business") return null;
    if (payload.exp && Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractBusinessToken(event) {
  const headers = event.headers || {};
  const auth = headers.authorization || headers.Authorization || "";
  if (String(auth).toLowerCase().startsWith("bearer ")) {
    return String(auth).slice(7).trim();
  }
  const header =
    headers["x-synk-business-session"] || headers["X-Synk-Business-Session"] || "";
  if (header) return String(header).trim();
  try {
    const body = JSON.parse(event.body || "{}");
    if (body.sessionToken) return String(body.sessionToken).trim();
  } catch (_) {}
  return "";
}

async function createBusinessSession(sql, { businessId, ip = null, userAgent = null }) {
  const expiresAtMs = Date.now() + BUSINESS_SESSION_TTL_MS;
  const expiresAt = new Date(expiresAtMs).toISOString();
  const placeholder = hashToken(randomBytes(32).toString("hex"));
  const rows = await sql`
    INSERT INTO synk_business_sessions (business_id, token_hash, ip, user_agent, expires_at)
    VALUES (
      ${businessId},
      ${placeholder},
      ${ip},
      ${userAgent},
      ${expiresAt}::timestamptz
    )
    RETURNING id
  `;
  const sessionId = rows[0].id;
  const sessionToken = signBusinessToken({
    typ: "synk_business",
    sid: sessionId,
    bid: businessId,
    exp: expiresAtMs,
  });
  await sql`
    UPDATE synk_business_sessions
    SET token_hash = ${hashToken(sessionToken)}
    WHERE id = ${sessionId}
  `;
  return { sessionToken, expiresAt, sessionId };
}

async function requireBusinessSession(sql, event) {
  const token = extractBusinessToken(event);
  if (!token) return { ok: false, status: 401, error: "Sign in required" };
  const payload = verifyBusinessToken(token);
  if (!payload || !payload.sid || !payload.bid) {
    return { ok: false, status: 401, error: "Session expired. Sign in again." };
  }
  const rows = await sql`
    SELECT s.id, s.business_id, s.expires_at, s.revoked_at,
           b.id AS biz_id, b.name, b.email, b.contact_name, b.status
    FROM synk_business_sessions s
    JOIN synk_business_accounts b ON b.id = s.business_id
    WHERE s.id = ${payload.sid}
      AND s.token_hash = ${hashToken(token)}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.revoked_at) {
    return { ok: false, status: 401, error: "Session expired. Sign in again." };
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, status: 401, error: "Session expired. Sign in again." };
  }
  if (row.status !== "approved") {
    return { ok: false, status: 403, error: "Business account is not approved yet" };
  }
  await sql`UPDATE synk_business_sessions SET last_seen_at = NOW() WHERE id = ${row.id}`;
  return {
    ok: true,
    sessionId: row.id,
    business: {
      id: row.biz_id,
      name: row.name,
      email: row.email,
      contactName: row.contact_name || "",
      status: row.status,
    },
  };
}

module.exports = {
  BUSINESS_SESSION_TTL_MS,
  hashSecret,
  verifySecret,
  createBusinessSession,
  requireBusinessSession,
  extractBusinessToken,
};
