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
  scrubCopiedPlatformNames,
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
  if (isBetaOnlyReleaseNoteBlock(subject)) return true;
  // Keep this strict so infrastructure commits that merely mention "beta"
  // (e.g. release-note scrubbing) stay in the public Improvements section.
  return /\b(beta\s+testers?|for\s+testers?|testing\s+(tab|portal|console|desk|agenda|shift)|clock[\s-]?in|tester\s+agenda)\b/i.test(
    String(subject || "")
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

function polishReleaseNoteSubject(subject) {
  let text = scrubCopiedPlatformNames(String(subject || "").trim());
  text = text
    .replace(/^(chore|fix|feat|docs|refactor|style|test|build|ci)(\([^)]*\))?:\s*/i, "")
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .trim();
  if (!text) return "";

  text = text.charAt(0).toUpperCase() + text.slice(1);
  text = text
    .replace(/^(Redo|Redesign)\b/i, "Redesigned")
    .replace(/^Fix\b/i, "Fixed")
    .replace(/^Add\b/i, "Added")
    .replace(/^Update\b/i, "Updated")
    .replace(/^Improve\b/i, "Improved")
    .replace(/^Remove\b/i, "Removed")
    .replace(/^Polish\b/i, "Polished")
    .replace(/^Clean up\b/i, "Cleaned up")
    .replace(/^Make\b/i, "Made")
    .replace(/^Re-?enable\b/i, "Re-enabled");
  return scrubCopiedPlatformNames(text).trim();
}

function categorizeReleaseNoteSubject(subject, isBeta) {
  if (isBeta) return "testing";
  const text = String(subject || "").toLowerCase();
  if (/\b(fix(?:ed|es)?|bug|crash|hotfix|patch|resolve[sd]?|repair(?:ed)?|broken|regression)\b/.test(text)) {
    return "fixes";
  }
  if (
    /\b(add(?:ed)?|new|launch(?:ed)?|introduce[sd]?|creat(?:e|ed)|enable[sd]?|ship(?:ped)?)\b/.test(
      text
    )
  ) {
    return "new";
  }
  return "improvements";
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
  const buckets = {
    new: [],
    improvements: [],
    fixes: [],
    testing: [],
  };

  for (const row of commits) {
    const rawSubject = String(row.subject || "").trim();
    if (!rawSubject) continue;
    if (isSensitiveReleaseNoteBlock(rawSubject)) continue;
    if (/^stamp (public )?version\b/i.test(rawSubject)) continue;
    if (/^merge\b/i.test(rawSubject)) continue;

    const isBeta = commitLooksBetaOnly(rawSubject);
    const subject = polishReleaseNoteSubject(rawSubject);
    if (!subject) continue;

    const key = normalizeCommitSubject(subject);
    if (!key) continue;
    if (seenBefore.has(key)) continue;
    if (seenNow.has(key)) continue;
    seenNow.add(key);

    const category = categorizeReleaseNoteSubject(subject, isBeta);
    const line = category === "testing" ? `- [beta] ${subject}` : `- ${subject}`;
    buckets[category].push(line);
  }

  // Always include at least the current update, even if it's a one-line change.
  if (!buckets.new.length && !buckets.improvements.length && !buckets.fixes.length && !buckets.testing.length) {
    buckets.improvements.push(
      `- Synk update ${short || "latest"} is live. Refresh or reopen the app to get it.`
    );
  }

  const parts = [];
  const pushSection = (title, lines) => {
    if (!lines.length) return;
    if (parts.length) parts.push("");
    parts.push(`## ${title}`, "", ...lines);
  };

  pushSection("New", buckets.new);
  pushSection("Improvements", buckets.improvements);
  pushSection("Fixes", buckets.fixes);
  pushSection("For beta testers", buckets.testing);
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

  // Auto-refresh tester agenda from each update's release notes.
  // Set CLEAR_BETA_AGENDA=0 to keep manual agenda items across deploys.
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
    if (result.betaPushSent != null) {
      console.log(`Sent ${result.betaPushSent} beta shift push notification(s) to testers.`);
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}