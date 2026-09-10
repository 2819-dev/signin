"use strict";

const { neon } = require("@neondatabase/serverless");
const {
  authConfigured,
  extractSessionToken,
  verifySessionToken,
  assertSessionActive,
} = require("./synk-admin-auth");

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(url);
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function requireAdmin(event) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) {
    return { ok: false, response: json(500, { error: "ADMIN_SECRET is not configured" }) };
  }

  const header = event.headers["x-admin-secret"] || event.headers["X-Admin-Secret"];
  const querySecret =
    event.queryStringParameters && event.queryStringParameters.secret
      ? event.queryStringParameters.secret
      : null;
  const provided = header || querySecret;

  if (!provided || provided !== expected) {
    return { ok: false, response: json(401, { error: "Unauthorized" }) };
  }

  return { ok: true };
}

async function requireSynkAdmin(event) {
  if (!authConfigured()) {
    return {
      ok: false,
      response: json(500, {
        error: "Synk Admin auth is not configured (set SYNK_ADMIN_SESSION_SECRET)",
      }),
    };
  }

  const token = extractSessionToken(event);
  const claims = verifySessionToken(token);
  if (!claims) {
    return { ok: false, response: json(401, { error: "Unauthorized" }) };
  }

  try {
    const sql = getSql();
    const active = await assertSessionActive(sql, claims, token);
    if (!active) {
      return { ok: false, response: json(401, { error: "Session revoked" }) };
    }
  } catch (err) {
    console.error("synk admin session check failed", err);
    return { ok: false, response: json(500, { error: "Session validation failed" }) };
  }

  return { ok: true, claims, token };
}

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    reason: row.reason,
    status: row.status,
    declineReason: row.decline_reason,
    urgent: Boolean(row.urgent),
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

module.exports = { getSql, json, requireAdmin, requireSynkAdmin, mapRow };
