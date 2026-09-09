const { randomBytes, scryptSync, timingSafeEqual } = require("crypto");

const SCRYPT_KEYLEN = 64;

function hashSecret(secret) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(secret), salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

function verifySecret(secret, stored) {
  if (!stored || typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  let derived;
  try {
    derived = scryptSync(String(secret), salt, SCRYPT_KEYLEN).toString("hex");
  } catch {
    return false;
  }
  try {
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(derived, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function generateSynkCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return `SK-${out.slice(0, 4)}-${out.slice(4)}`;
}

module.exports = { hashSecret, verifySecret, generateSynkCode };
