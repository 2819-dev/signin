"use strict";

const {
  randomBytes,
  createHmac,
  timingSafeEqual,
  scryptSync,
  createHash,
} = require("crypto");
const { hashSecret, verifySecret } = require("./synk");

const SESSION_TTL_REMEMBER_SEC = 60 * 60 * 24 * 60; // ~2 months when "stay signed in"
const SESSION_TTL_EPHEMERAL_SEC = 60 * 60 * 12; // same-day session when not remembered
const SESSION_TTL_SEC = SESSION_TTL_REMEMBER_SEC; // default / export for callers
const IDLE_TTL_SEC = 60 * 30; // unused by UI; kept for API compatibility
const SCRYPT_KEYLEN = 64;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function sessionSigningSecret() {
  return (
    process.env.SYNK_ADMIN_SESSION_SECRET ||
    process.env.SYNK_ADMIN_SECRET ||
    ""
  );
}

function expectedUsername() {
  return String(process.env.SYNK_ADMIN_USERNAME || "").trim();
}

function expectedPasswordHash() {
  return String(process.env.SYNK_ADMIN_PASSWORD_HASH || "").trim();
}

function expectedTotpSecret() {
  return String(process.env.SYNK_ADMIN_TOTP_SECRET || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function authConfigured() {
  return Boolean(
    expectedUsername() &&
      expectedPasswordHash() &&
      expectedTotpSecret() &&
      sessionSigningSecret()
  );
}

function timingSafeStringEqual(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function decodeBase32(input) {
  const cleaned = String(input || "")
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of cleaned) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val < 0) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function encodeBase32(buffer) {
  const bytes = Buffer.from(buffer);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    if (chunk.length < 5) {
      out += BASE32_ALPHABET[parseInt(chunk.padEnd(5, "0"), 2)];
    } else {
      out += BASE32_ALPHABET[parseInt(chunk, 2)];
    }
  }
  return out;
}

function generateTotpSecret() {
  return encodeBase32(randomBytes(20));
}

function hotp(secretBuf, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secretBuf).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1e6).padStart(6, "0");
}

function verifyTotp(secretBase32, token, { window = 1, step = 30 } = {}) {
  const cleaned = String(token || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  let secretBuf;
  try {
    secretBuf = decodeBase32(secretBase32);
  } catch {
    return false;
  }
  if (!secretBuf.length) return false;
  const counter = Math.floor(Date.now() / 1000 / step);
  for (let w = -window; w <= window; w += 1) {
    const expected = hotp(secretBuf, counter + w);
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(cleaned, "utf8");
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

function hashPassword(password) {
  return hashSecret(password);
}

function verifyPassword(password, storedHash) {
  if (storedHash && storedHash.includes(":")) {
    return verifySecret(password, storedHash);
  }
  if (storedHash && storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;
    try {
      const derived = scryptSync(String(password), parts[1], SCRYPT_KEYLEN).toString("hex");
      const a = Buffer.from(parts[2], "hex");
      const b = Buffer.from(derived, "hex");
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
  return false;
}

function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

async function ensureAdminSessionTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS synk_admin_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      ip TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_admin_sessions_user_idx
    ON synk_admin_sessions (username, revoked_at, expires_at DESC)
  `;
}

function signClaims(claims) {
  const secret = sessionSigningSecret();
  if (!secret) throw new Error("Session signing secret missing");
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifySessionToken(token) {
  const secret = sessionSigningSecret();
  if (!secret || !token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let claims;
  try {
    claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!claims || claims.role !== "synk-admin") return null;
  if (!claims.exp || Math.floor(Date.now() / 1000) >= Number(claims.exp)) return null;
  if (!claims.sub || !claims.sid) return null;
  return claims;
}

function extractSessionToken(event) {
  const headers = event.headers || {};
  const auth =
    headers.authorization ||
    headers.Authorization ||
    headers["x-synk-admin-session"] ||
    headers["X-Synk-Admin-Session"] ||
    "";
  if (!auth) return "";
  const raw = String(auth);
  if (raw.toLowerCase().startsWith("bearer ")) return raw.slice(7).trim();
  return raw.trim();
}

async function createAdminSession(sql, { username, ip = "", userAgent = "", remember = true } = {}) {
  await ensureAdminSessionTables(sql);
  const now = Math.floor(Date.now() / 1000);
  const ttlSec = remember ? SESSION_TTL_REMEMBER_SEC : SESSION_TTL_EPHEMERAL_SEC;
  const expiresAt = new Date((now + ttlSec) * 1000);
  const sidRows = await sql`
    INSERT INTO synk_admin_sessions (username, token_hash, ip, user_agent, expires_at)
    VALUES (
      ${String(username)},
      ${"pending:" + randomBytes(8).toString("hex")},
      ${ip ? String(ip).slice(0, 80) : null},
      ${userAgent ? String(userAgent).slice(0, 240) : null},
      ${expiresAt.toISOString()}::timestamptz
    )
    RETURNING id
  `;
  const sid = sidRows[0].id;
  const token = signClaims({
    role: "synk-admin",
    sub: String(username),
    sid: String(sid),
    iat: now,
    exp: now + ttlSec,
    rem: remember ? 1 : 0,
  });
  await sql`
    UPDATE synk_admin_sessions
    SET token_hash = ${hashToken(token)}
    WHERE id = ${sid}
  `;
  return {
    token,
    expiresAt: expiresAt.toISOString(),
    expiresIn: ttlSec,
    idleTimeoutSec: IDLE_TTL_SEC,
    sessionId: sid,
    remember: Boolean(remember),
  };
}

async function assertSessionActive(sql, claims, token) {
  await ensureAdminSessionTables(sql);
  const rows = await sql`
    SELECT id, token_hash, revoked_at, expires_at
    FROM synk_admin_sessions
    WHERE id = ${claims.sid}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.revoked_at) return false;
  if (new Date(row.expires_at).getTime() <= Date.now()) return false;
  if (row.token_hash !== hashToken(token)) return false;
  await sql`
    UPDATE synk_admin_sessions
    SET last_seen_at = NOW()
    WHERE id = ${claims.sid}
  `;
  return true;
}

async function revokeSession(sql, { sessionId = null, token = null, username = null } = {}) {
  await ensureAdminSessionTables(sql);
  if (sessionId) {
    await sql`
      UPDATE synk_admin_sessions
      SET revoked_at = NOW()
      WHERE id = ${sessionId} AND revoked_at IS NULL
    `;
    return;
  }
  if (token) {
    await sql`
      UPDATE synk_admin_sessions
      SET revoked_at = NOW()
      WHERE token_hash = ${hashToken(token)} AND revoked_at IS NULL
    `;
    return;
  }
  if (username) {
    await sql`
      UPDATE synk_admin_sessions
      SET revoked_at = NOW()
      WHERE username = ${username} AND revoked_at IS NULL
    `;
  }
}

async function listSessions(sql, username) {
  await ensureAdminSessionTables(sql);
  const rows = await sql`
    SELECT id, ip, user_agent, created_at, last_seen_at, expires_at, revoked_at
    FROM synk_admin_sessions
    WHERE username = ${username}
      AND (revoked_at IS NULL OR revoked_at > NOW() - INTERVAL '7 days')
    ORDER BY created_at DESC
    LIMIT 30
  `;
  return rows.map((row) => ({
    id: row.id,
    ip: row.ip || "",
    userAgent: row.user_agent || "",
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    revoked: Boolean(row.revoked_at),
  }));
}

function otpauthUrl({ username, secret, issuer = "Synk Admin" }) {
  const label = encodeURIComponent(`${issuer}:${username}`);
  const q = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${q.toString()}`;
}

async function loginWithPasswordAndTotp(
  sql,
  { username, password, totp, ip = "", userAgent = "", remember = true } = {}
) {
  if (!authConfigured()) {
    const err = new Error("Synk Admin login is not configured");
    err.statusCode = 500;
    throw err;
  }

  const userOk = timingSafeStringEqual(username, expectedUsername());
  const passOk = verifyPassword(password, expectedPasswordHash());
  const totpOk = verifyTotp(expectedTotpSecret(), totp);

  if (!userOk || !passOk || !totpOk) {
    const err = new Error("Invalid username, password, or 2FA code");
    err.statusCode = 401;
    throw err;
  }

  return createAdminSession(sql, {
    username: expectedUsername(),
    ip,
    userAgent,
    remember: remember !== false,
  });
}

function signMediaToken(imageId, ttlSec = 60 * 30) {
  const secret = sessionSigningSecret();
  if (!secret) throw new Error("Signing secret missing");
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body = Buffer.from(JSON.stringify({ id: imageId, exp })).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return { token: `${body}.${sig}`, exp };
}

function verifyMediaToken(token, imageId) {
  const secret = sessionSigningSecret();
  if (!secret || !token || !token.includes(".")) return false;
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  let claims;
  try {
    claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (!claims || claims.id !== imageId) return false;
  if (!claims.exp || Math.floor(Date.now() / 1000) >= Number(claims.exp)) return false;
  return true;
}

function signedPhotoUrl(photoUrl) {
  if (!photoUrl) return "";
  const match = String(photoUrl).match(/[?&]id=([0-9a-f-]{36})/i);
  if (!match) return photoUrl;
  const id = match[1];
  try {
    const { token } = signMediaToken(id);
    return `/api/synk-image?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`;
  } catch {
    return photoUrl;
  }
}

module.exports = {
  authConfigured,
  hashPassword,
  verifyPassword,
  generateTotpSecret,
  verifyTotp,
  verifySessionToken,
  extractSessionToken,
  loginWithPasswordAndTotp,
  createAdminSession,
  assertSessionActive,
  revokeSession,
  listSessions,
  ensureAdminSessionTables,
  otpauthUrl,
  encodeBase32,
  signMediaToken,
  verifyMediaToken,
  signedPhotoUrl,
  SESSION_TTL_SEC,
  SESSION_TTL_REMEMBER_SEC,
  SESSION_TTL_EPHEMERAL_SEC,
  IDLE_TTL_SEC,
  expectedUsername,
};
