"use strict";

const {
  randomBytes,
  createHmac,
  timingSafeEqual,
  scryptSync,
} = require("crypto");
const { hashSecret, verifySecret } = require("./synk");

const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days
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
  // Prefer salt:hash from hashSecret/verifySecret.
  if (storedHash && storedHash.includes(":")) {
    return verifySecret(password, storedHash);
  }
  // Fallback: legacy scrypt$salt$hash
  if (storedHash && storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const hash = parts[2];
    try {
      const derived = scryptSync(String(password), salt, SCRYPT_KEYLEN).toString("hex");
      const a = Buffer.from(hash, "hex");
      const b = Buffer.from(derived, "hex");
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
  return false;
}

function mintSessionToken(username) {
  const secret = sessionSigningSecret();
  if (!secret) throw new Error("Session signing secret missing");
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    role: "synk-admin",
    sub: String(username),
    iat: now,
    exp: now + SESSION_TTL_SEC,
    nonce: randomBytes(8).toString("base64url"),
  };
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return {
    token: `${body}.${sig}`,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
    expiresIn: SESSION_TTL_SEC,
  };
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
  if (!claims.sub) return null;
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

function loginWithPasswordAndTotp({ username, password, totp }) {
  if (!authConfigured()) {
    const err = new Error("Synk Admin login is not configured");
    err.statusCode = 500;
    throw err;
  }

  const userOk = timingSafeStringEqual(username, expectedUsername());
  const passOk = verifyPassword(password, expectedPasswordHash());
  const totpOk = verifyTotp(expectedTotpSecret(), totp);

  // Always check all three to reduce timing oracles a bit.
  if (!userOk || !passOk || !totpOk) {
    const err = new Error("Invalid username, password, or 2FA code");
    err.statusCode = 401;
    throw err;
  }

  return mintSessionToken(expectedUsername());
}

module.exports = {
  authConfigured,
  hashPassword,
  verifyPassword,
  generateTotpSecret,
  verifyTotp,
  mintSessionToken,
  verifySessionToken,
  extractSessionToken,
  loginWithPasswordAndTotp,
  otpauthUrl,
  encodeBase32,
  SESSION_TTL_SEC,
};
