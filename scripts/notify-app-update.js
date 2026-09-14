#!/usr/bin/env node
/**
 * Broadcasts an in-app Community notification when Synk updates.
 * Builds release notes from commits since the previous broadcast only
 * (no repeated carry-over from older updates).
 *
 * Usage:
 *   node scripts/notify-app-update.js [version]
 *   COMMIT_REF=abc node scripts/notify-app-update.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { neon } = require("@neondatabase/serverless");
const {
  ensureSynkCoreTables,
  broadcastAppUpdate,
  clearAllBetaAgendaItems,
  getAppUpdateReleaseNotes,
  isSensitiveReleaseNoteBlock,
  isBetaOnlyReleaseNoteBlock,
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

function normalizeCommitSubject(subject) {
  return String(subject || "")
    .trim()
    .replace(/^[0-9a-f]{7,40}\s+/i, "")
    .replace(/^(chore|fix|feat|docs|refactor|style|test|build|ci)(\([^)]*\))?:\s*/i, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function commitLooksBetaOnly(subject) {
  return (
    isBetaOnlyReleaseNoteBlock(subject) ||
    /\b(beta|tester|testing|agenda|clock[\s-]?in)\b/i.test(subject)
  );
}

function gitCommitSubjectsSince(previousRef) {
  try {
    const range = previousRef ? `${previousRef}..HEAD` : "HEAD";
    const format = previousRef
      ? 'git log --pretty=format:"%H%x09%s" ' + range
      : 'git log -1 --pretty=format:"%H%x09%s"';
    const raw = execSync(format, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 2 * 1024 * 1024,
    }).trim();
    if (!raw) return [];
    return raw
      .split("\n")
      .map((line) => {
        const tab = line.indexOf("\t");
        if (tab === -1) return { hash: "", subject: line.trim() };
        return {
          hash: line.slice(0, tab).trim(),
          subject: line.slice(tab + 1).trim(),
        };
      })
      .filter((row) => row.subject);
  } catch (_) {
    return [];
  }
}

function subjectsFromNotes(notes) {
  const set = new Set();
  String(notes || "")
    .split("\n")
    .forEach((line) => {
      const cleaned = String(line || "")
        .replace(/^\s*([-*•+]|\d+[.)])\s+/, "")
        .replace(/^#+\s*/, "")
        .replace(/^\s*\[beta\]\s*/i, "")
        .trim();
      if (!cleaned) return;
      set.add(normalizeCommitSubject(cleaned));
    });
  return set;
}

function buildReleaseNotesFromGit(version, { previousVersion = "", previousNotes = "" } = {}) {
  const short = String(version || "").slice(0, 10);
  let commits = gitCommitSubjectsSince(previousVersion);

  // If the previous version isn't a reachable git ref, fall back to this commit only.
  if ((!commits || !commits.length) && previousVersion) {
    commits = gitCommitSubjectsSince("");
  }
  if (!commits.length) {
    commits = gitCommitSubjectsSince("");
  }

  const seenBefore = subjectsFromNotes(previousNotes);
  const seenNow = new Set();
  const everyone = [];
  const beta = [];

  for (const row of commits) {
    const subject = String(row.subject || "").trim();
    if (!subject) continue;
    if (isSensitiveReleaseNoteBlock(subject)) continue;
    if (/^stamp (public )?version\b/i.test(subject)) continue;
    if (/^merge\b/i.test(subject)) continue;

    const key = normalizeCommitSubject(subject);
    if (!key) continue;
    if (seenBefore.has(key)) continue;
    if (seenNow.has(key)) continue;
    seenNow.add(key);

    if (commitLooksBetaOnly(subject)) {
      beta.push(`- [beta] ${subject}`);
    } else {
      everyone.push(`- ${subject}`);
    }
  }

  // Always include at least the current update, even if it's a one-line change.
  if (!everyone.length && !beta.length) {
    everyone.push(
      `- Synk update ${short || "latest"} is live. Refresh or reopen the app to get it.`
    );
  }

  const parts = [
    short ? `## What's new (${short})` : "## What's new",
    "",
    ...everyone,
  ];
  if (beta.length) {
    parts.push("", "## For beta testers", "", ...beta);
  }
  return parts.join("\n");
}

async function main() {
  const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || "";
  if (!dbUrl) {
    console.error("DATABASE_URL is not set; skipping app-update notifications.");
    process.exit(0);
  }

  const version =
    String(process.argv[2] || "").trim() ||
    String(process.env.COMMIT_REF || process.env.DEPLOY_ID || process.env.BUILD_ID || "").trim() ||
    readVersionFromFile();

  if (!version) {
    console.error("No version provided; skipping app-update notifications.");
    process.exit(0);
  }

  const sql = neon(dbUrl);
  await ensureSynkCoreTables(sql);

  // Clear existing agenda while the Testing portal is redesigned.
  // Set CLEAR_BETA_AGENDA=0 to keep manual items on later deploys.
  if (String(process.env.CLEAR_BETA_AGENDA || "1").trim() !== "0") {
    try {
      const cleared = await clearAllBetaAgendaItems(sql);
      console.log(`Cleared ${cleared.cleared} beta agenda item(s).`);
    } catch (err) {
      console.error("Could not clear beta agenda:", err.message || err);
    }
  }

  const previous = await getAppUpdateReleaseNotes(sql, "latest");
  const previousVersion =
    previous && previous.version && previous.version !== version ? previous.version : "";
  const notes = buildReleaseNotesFromGit(version, {
    previousVersion,
    previousNotes: previous ? previous.notes || previous.body || "" : "",
  });

  const result = await broadcastAppUpdate(sql, {
    version,
    body: "Synk was updated. Refresh or reopen the app to get the latest.",
    notes:
      notes ||
      "Synk was updated with improvements and fixes. Refresh to get the latest.",
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
    if (result.agendaCreated) {
      console.log(`Added ${result.agendaCreated} beta testing agenda item(s).`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
