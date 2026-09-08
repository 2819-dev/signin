const { neon } = require("@neondatabase/serverless");

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

module.exports = { getSql, json, requireAdmin, mapRow };
