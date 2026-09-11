#!/usr/bin/env node
/**
 * Broadcasts an in-app Community notification to every member when Synk updates.
 * Dedupes by version so the same deploy stamp is only announced once.
 *
 * Usage:
 *   node scripts/notify-app-update.js [version]
 *   COMMIT_REF=abc node scripts/notify-app-update.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");
const {
  ensureSynkCoreTables,
  broadcastAppUpdate,
} = require("../netlify/functions/lib/synk");

function readVersionFromFile() {
  const candidates = [
    path.join(__dirname, "..", "public", "version.json"),
    path.join(__dirname, "..", "synk-id", "public", "version.json"),
  ];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      const v = String((data && data.v) || "").trim();
      if (v) return v;
    } catch (_) {}
  }
  return "";
}

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || "";
  if (!dbUrl) {
    console.error("DATABASE_URL is not set; skipping app-update notifications.");
    process.exit(0);
  }

  const version =
    String(process.argv[2] || "").trim() ||
    String(process.env.COMMIT_REF || process.env.COMMIT_REF || process.env.DEPLOY_ID || process.env.BUILD_ID || "").trim() ||
    readVersionFromFile();

  if (!version) {
    console.error("No version provided; skipping app-update notifications.");
    process.exit(0);
  }

  const sql = neon(dbUrl);
  await ensureSynkCoreTables(sql);
  const result = await broadcastAppUpdate(sql, {
    version,
    body: "Synk was updated. Refresh or reopen the app to get the latest.",
  });

  if (!result.ok) {
    console.error(result.error || "Broadcast failed");
    process.exit(1);
  }

  if (result.alreadyBroadcast) {
    console.log(
      `App update ${result.version} already notified (${result.notified} users).`
    );
  } else {
    console.log(
      `Notified ${result.notified} users about app update ${result.version}.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
