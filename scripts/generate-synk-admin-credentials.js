#!/usr/bin/env node
"use strict";

/**
 * Generate Synk Admin username/password/TOTP credentials.
 * Usage: node scripts/generate-synk-admin-credentials.js
 */

const { randomBytes } = require("crypto");
const {
  hashPassword,
  generateTotpSecret,
  otpauthUrl,
} = require("../netlify/functions/lib/synk-admin-auth");

function randomPassword(bytes = 18) {
  return randomBytes(bytes).toString("base64url");
}

const username = process.env.SYNK_ADMIN_USERNAME_INPUT || "synk-admin";
const password = process.env.SYNK_ADMIN_PASSWORD_INPUT || randomPassword();
const passwordHash = hashPassword(password);
const totpSecret = generateTotpSecret();
const sessionSecret = randomBytes(32).toString("hex");
const otpauth = otpauthUrl({ username, secret: totpSecret });

const out = {
  SYNK_ADMIN_USERNAME: username,
  SYNK_ADMIN_PASSWORD: password,
  SYNK_ADMIN_PASSWORD_HASH: passwordHash,
  SYNK_ADMIN_TOTP_SECRET: totpSecret,
  SYNK_ADMIN_SESSION_SECRET: sessionSecret,
  OTPAUTH_URL: otpauth,
};

process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
