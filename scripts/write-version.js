#!/usr/bin/env node
/**
 * Writes a deploy version stamp so Guided Access kiosks can force-refresh
 * when a new build goes live (no Safari refresh chrome available).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outFile = path.join(root, "public", "version.json");

const v =
  process.env.COMMIT_REF ||
  process.env.COMMIT_REF ||
  process.env.DEPLOY_ID ||
  process.env.BUILD_ID ||
  `local-${Date.now()}`;

const payload = {
  v: String(v),
  t: Date.now(),
};

fs.writeFileSync(outFile, `${JSON.stringify(payload)}\n`, "utf8");
console.log(`Wrote ${path.relative(root, outFile)} → ${payload.v}`);
