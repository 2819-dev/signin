"use strict";

const {
  randomBytes,
  createHmac,
  timingSafeEqual,
  scryptSync,
  createHash,
} = require("crypto");
const { hashSecret, verifySecret } = require("./synk");

const SESSION_TTL_SEC = 60 * 60 * 24 * 365 * 10; // far-future JWT bookkeeping; sessions end only on logout
const SESSION_TTL_REMEMBER_SEC = SESSION_TTL_SEC; // alias kept for callers
const SESSION_TTL_EPHEMERAL_SEC = SESSION_TTL_SEC; // alias kept for callers
const IDLE_TTL_SEC = 0; // unused; no idle auto-lock
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
  // Sessions can be issued as long as we can sign tokens.
  // Bootstrap admin credentials may live in env and/or synk_admins.
  return Boolean(sessionSigningSecret());
}

function bootstrapEnvConfigured() {
  return Boolean(
    expectedUsername() && expectedPasswordHash() && expectedTotpSecret() && sessionSigningSecret()
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

  await sql`
    CREATE TABLE IF NOT EXISTS synk_admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      totp_secret TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS synk_admins_username_idx
    ON synk_admins (username)
  `;

  await seedBootstrapAdmin(sql);
}

async function seedBootstrapAdmin(sql) {
  if (!bootstrapEnvConfigured()) return;
  const username = expectedUsername();
  const passwordHash = expectedPasswordHash();
  const totpSecret = expectedTotpSecret();

  const existing = await sql`
    SELECT id FROM synk_admins WHERE LOWER(username) = ${username.toLowerCase()} LIMIT 1
  `;
  if (existing[0]) return;

  await sql`
    INSERT INTO synk_admins (username, password_hash, totp_secret, enabled)
    VALUES (${username}, ${passwordHash}, ${totpSecret}, TRUE)
  `;
}

function normalizeAdminUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .slice(0, 64);
}

async function findAdminByUsername(sql, username) {
  await ensureAdminSessionTables(sql);
  const normalized = normalizeAdminUsername(username);
  if (!normalized) return null;
  const rows = await sql`
    SELECT id, username, password_hash, totp_secret, enabled, created_at, updated_at
    FROM synk_admins
    WHERE LOWER(username) = ${normalized}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function listAdmins(sql) {
  await ensureAdminSessionTables(sql);
  const rows = await sql`
    SELECT id, username, enabled, created_at, updated_at
    FROM synk_admins
    ORDER BY created_at ASC
    LIMIT 100
  `;
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    enabled: row.enabled !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function createAdminUser(sql, { username, password }) {
  await ensureAdminSessionTables(sql);
  const normalized = normalizeAdminUsername(username);
  if (!normalized || normalized.length < 3) {
    const err = new Error("Username must be at least 3 characters");
    err.statusCode = 400;
    throw err;
  }
  const pass = String(password || "");
  if (pass.length < 8) {
    const err = new Error("Password must be at least 8 characters");
    err.statusCode = 400;
    throw err;
  }
  const totpSecret = generateTotpSecret();
  try {
    const rows = await sql`
      INSERT INTO synk_admins (username, password_hash, totp_secret, enabled)
      VALUES (${normalized}, ${hashPassword(pass)}, ${totpSecret}, TRUE)
      RETURNING id, username, enabled, created_at, updated_at
    `;
    return {
      admin: {
        id: rows[0].id,
        username: rows[0].username,
        enabled: true,
        createdAt: rows[0].created_at,
        updatedAt: rows[0].updated_at,
      },
      totpSecret,
      otpauthUrl: otpauthUrl({ username: normalized, secret: totpSecret }),
    };
  } catch (err) {
    if (String(err.message || "").includes("unique") || err.code === "23505") {
      const conflict = new Error("That username is already taken");
      conflict.statusCode = 409;
      throw conflict;
    }
    throw err;
  }
}

async function setAdminEnabled(sql, { id, enabled }) {
  await ensureAdminSessionTables(sql);
  const rows = await sql`
    UPDATE synk_admins
    SET enabled = ${Boolean(enabled)}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, username, enabled, created_at, updated_at
  `;
  if (!rows[0]) {
    const err = new Error("Admin not found");
    err.statusCode = 404;
    throw err;
  }
  if (!enabled) {
    await revokeSession(sql, { username: rows[0].username });
  }
  return {
    id: rows[0].id,
    username: rows[0].username,
    enabled: rows[0].enabled !== false,
    createdAt: rows[0].created_at,
    updatedAt: rows[0].updated_at,
  };
}

async function changeAdminPassword(sql, { username, currentPassword, newPassword, totp }) {
  await ensureAdminSessionTables(sql);
  const admin = await findAdminByUsername(sql, username);
  if (!admin || !admin.enabled) {
    const err = new Error("Admin not found");
    err.statusCode = 404;
    throw err;
  }
  if (!verifyPassword(currentPassword, admin.password_hash)) {
    const err = new Error("Current password is incorrect");
    err.statusCode = 401;
    throw err;
  }
  if (!verifyTotp(admin.totp_secret, totp)) {
    const err = new Error("Invalid 2FA code");
    err.statusCode = 401;
    throw err;
  }
  const next = String(newPassword || "");
  if (next.length < 8) {
    const err = new Error("New password must be at least 8 characters");
    err.statusCode = 400;
    throw err;
  }
  if (next === String(currentPassword || "")) {
    const err = new Error("New password must be different");
    err.statusCode = 400;
    throw err;
  }
  await sql`
    UPDATE synk_admins
    SET password_hash = ${hashPassword(next)}, updated_at = NOW()
    WHERE id = ${admin.id}
  `;
  return { ok: true, username: admin.username };
}

async function deleteAdminUser(sql, { id, actorUsername }) {
  await ensureAdminSessionTables(sql);
  const rows = await sql`
    SELECT id, username FROM synk_admins WHERE id = ${id} LIMIT 1
  `;
  if (!rows[0]) {
    const err = new Error("Admin not found");
    err.statusCode = 404;
    throw err;
  }
  if (normalizeAdminUsername(rows[0].username) === normalizeAdminUsername(actorUsername)) {
    const err = new Error("You cannot remove your own admin account");
    err.statusCode = 400;
    throw err;
  }
  const enabledCount = await sql`SELECT COUNT(*)::int AS n FROM synk_admins WHERE enabled = TRUE`;
  const target = await sql`SELECT enabled FROM synk_admins WHERE id = ${id} LIMIT 1`;
  if (target[0]?.enabled && (enabledCount[0]?.n || 0) <= 1) {
    const err = new Error("Keep at least one enabled admin");
    err.statusCode = 400;
    throw err;
  }
  await revokeSession(sql, { username: rows[0].username });
  await sql`DELETE FROM synk_admins WHERE id = ${id}`;
  return { ok: true };
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
  // Sessions remain valid until revoked (logout). Token exp is informational only.
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
  // Always persistent until logout/revoke. `remember` kept for API compatibility.
  const ttlSec = SESSION_TTL_SEC;
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
    rem: 1,
  });
  await sql`
    UPDATE synk_admin_sessions
    SET token_hash = ${hashToken(token)}
    WHERE id = ${sid}
  `;
  return {
    token,
    expiresAt: null,
    expiresIn: null,
    idleTimeoutSec: IDLE_TTL_SEC,
    sessionId: sid,
    remember: true,
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
  if (row.token_hash !== hashToken(token)) return false;
  await sql`
    UPDATE synk_admin_sessions
    SET last_seen_at = NOW(),
        expires_at = NOW() + INTERVAL '10 years'
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

async function listSessions(sql, username = null) {
  await ensureAdminSessionTables(sql);
  const rows = username
    ? await sql`
        SELECT id, username, ip, user_agent, created_at, last_seen_at, expires_at, revoked_at
        FROM synk_admin_sessions
        WHERE username = ${username}
          AND (revoked_at IS NULL OR revoked_at > NOW() - INTERVAL '7 days')
        ORDER BY created_at DESC
        LIMIT 50
      `
    : await sql`
        SELECT id, username, ip, user_agent, created_at, last_seen_at, expires_at, revoked_at
        FROM synk_admin_sessions
        WHERE revoked_at IS NULL OR revoked_at > NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 50
      `;
  return rows.map((row) => ({
    id: row.id,
    username: row.username || "",
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
  if (!authConfigured() && !(await hasAnyAdmin(sql))) {
    const err = new Error("Synk Admin login is not configured");
    err.statusCode = 500;
    throw err;
  }

  await ensureAdminSessionTables(sql);
  let admin = await findAdminByUsername(sql, username);

  // Legacy env bootstrap fallback (first deploy / before table seed completes).
  if (
    !admin &&
    bootstrapEnvConfigured() &&
    normalizeAdminUsername(username) === normalizeAdminUsername(expectedUsername())
  ) {
    const passOk = verifyPassword(password, expectedPasswordHash());
    const totpOk = verifyTotp(expectedTotpSecret(), totp);
    if (!passOk || !totpOk) {
      const err = new Error("Invalid username, password, or 2FA code");
      err.statusCode = 401;
      throw err;
    }
    await seedBootstrapAdmin(sql);
    admin = await findAdminByUsername(sql, expectedUsername());
  }

  if (!admin || !admin.enabled) {
    const err = new Error("Invalid username, password, or 2FA code");
    err.statusCode = 401;
    throw err;
  }

  const passOk = verifyPassword(password, admin.password_hash);
  const totpOk = verifyTotp(admin.totp_secret, totp);
  if (!passOk || !totpOk) {
    const err = new Error("Invalid username, password, or 2FA code");
    err.statusCode = 401;
    throw err;
  }

  return createAdminSession(sql, {
    username: admin.username,
    ip,
    userAgent,
    remember: true,
  });
}

async function hasAnyAdmin(sql) {
  try {
    await ensureAdminSessionTables(sql);
    const rows = await sql`SELECT id FROM synk_admins WHERE enabled = TRUE LIMIT 1`;
    return Boolean(rows[0]);
  } catch {
    return false;
  }
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
  bootstrapEnvConfigured,
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
  listAdmins,
  createAdminUser,
  setAdminEnabled,
  changeAdminPassword,
  deleteAdminUser,
  findAdminByUsername,
  ensureAdminSessionTables,
  normalizeAdminUsername,
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
