"use strict";

/**
 * Convert a Vercel (Node) request into a Netlify Functions-style `event`,
 * and write a Netlify-style response back through Vercel's res object.
 */

function normalizeHeaders(req) {
  const out = {};
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (value == null) continue;
    out[String(key).toLowerCase()] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return out;
}

function queryFromUrl(req) {
  const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  const params = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (params[key] == null) params[key] = value;
    else if (Array.isArray(params[key])) params[key].push(value);
    else params[key] = [params[key], value];
  }
  return { params, pathname: url.pathname };
}

function readRawBody(req) {
  if (req.body == null) return "";
  if (Buffer.isBuffer(req.body)) return req.body.toString("base64");
  if (typeof req.body === "string") return req.body;
  if (typeof req.body === "object") return JSON.stringify(req.body);
  return String(req.body);
}

function toNetlifyEvent(req, { functionName = "" } = {}) {
  const headers = normalizeHeaders(req);
  const { params, pathname } = queryFromUrl(req);
  const method = String(req.method || "GET").toUpperCase();
  const isBinary =
    method !== "GET" &&
    method !== "HEAD" &&
    headers["content-type"] &&
    !String(headers["content-type"]).includes("application/json") &&
    !String(headers["content-type"]).includes("text/");

  let body = "";
  let isBase64Encoded = false;
  if (method !== "GET" && method !== "HEAD") {
    if (Buffer.isBuffer(req.body)) {
      body = req.body.toString("base64");
      isBase64Encoded = true;
    } else if (typeof req.body === "string") {
      body = req.body;
      // Vercel may already parse JSON; keep string form for Netlify handlers.
    } else if (req.body && typeof req.body === "object") {
      body = JSON.stringify(req.body);
    }
  }

  return {
    httpMethod: method,
    path: pathname,
    rawUrl: `https://${headers.host || "localhost"}${pathname}`,
    headers,
    multiValueHeaders: Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k, [v]])
    ),
    queryStringParameters: params,
    multiValueQueryStringParameters: Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v : [v]])
    ),
    body,
    isBase64Encoded,
    rawBody: body,
    requestContext: {
      httpMethod: method,
      path: pathname,
      identity: {},
    },
  };
}

async function fromNetlifyResponse(result, res) {
  const status = Number((result && result.statusCode) || 200);
  const headers = (result && result.headers) || {};
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) continue;
    res.setHeader(key, value);
  }
  if (!res.getHeader("Cache-Control")) {
    res.setHeader("Cache-Control", "no-store");
  }

  const body = result && result.body != null ? result.body : "";
  if (result && result.isBase64Encoded) {
    const buf = Buffer.from(String(body), "base64");
    res.statusCode = status;
    res.end(buf);
    return;
  }
  res.statusCode = status;
  if (typeof body === "string") res.end(body);
  else res.end(JSON.stringify(body));
}

function resolveFunctionName(req) {
  const { pathname } = queryFromUrl(req);
  // /api/foo or /api/foo/bar → foo (Netlify function names are single segment)
  const parts = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  return parts[0] || "";
}

module.exports = {
  toNetlifyEvent,
  fromNetlifyResponse,
  resolveFunctionName,
};
