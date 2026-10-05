"use strict";

/**
 * Single Vercel serverless entry for all /api/* routes.
 * Dynamically loads the matching Netlify-style handler from netlify/functions.
 */

const fs = require("fs");
const path = require("path");
const {
  toNetlifyEvent,
  fromNetlifyResponse,
  resolveFunctionName,
} = require("./_bridge");

const FUNCTIONS_DIR = path.join(__dirname, "..", "netlify", "functions");

// Touch static requires so Vercel packs the function sources + shared libs.
// (Dynamic require alone can omit files from the serverless bundle.)
const libDir = path.join(__dirname, "..", "netlify", "functions", "lib");
for (const name of [
  "db",
  "media-store",
  "synk",
  "synk-push",
  "synk-admin-auth",
  "synk-business-auth",
  "email",
  "push",
  "request-timeout",
]) {
  const file = path.join(libDir, `${name}.js`);
  if (fs.existsSync(file)) require(file);
}

function loadHandler(name) {
  const safe = String(name || "").replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe) return null;
  const file = path.join(FUNCTIONS_DIR, `${safe}.js`);
  if (!fs.existsSync(file)) return null;
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(file);
}

module.exports = async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, X-Admin-Secret, X-Synk-Hub-Session, Authorization"
      );
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.end();
      return;
    }

    const name = resolveFunctionName(req);
    const mod = loadHandler(name);
    if (!mod || typeof mod.handler !== "function") {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: `Unknown API: ${name || "(empty)"}` }));
      return;
    }

    const event = toNetlifyEvent(req, { functionName: name });
    const result = await mod.handler(event, {});
    await fromNetlifyResponse(result || { statusCode: 204, body: "" }, res);
  } catch (err) {
    console.error("api bridge failed", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: err.message || "Internal error" }));
  }
};

// Ensure Vercel includes every Netlify function file in this serverless bundle.
module.exports.config = {
  includeFiles: ["netlify/functions/**"],
};
