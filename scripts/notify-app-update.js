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

function softenReleaseNoteJargon(text) {
  return String(text || "")
    .replace(/\bUI\b/g, "interface")
    .replace(/\bUX\b/g, "experience")
    .replace(/\bCTA\b/g, "button")
    .replace(/\bCTAs\b/g, "buttons")
    .replace(/\bavatars?\b/gi, (m) => (/s$/i.test(m) ? "profile photos" : "profile photo"))
    .replace(/\binbox\b/gi, "notifications inbox")
    .replace(/\bempty states?\b/gi, "empty screens")
    .replace(/\bchrome\b/gi, "look and feel")
    .replace(/\blayout and chrome\b/gi, "layout and look")
    .replace(/\bmobile layout\b/gi, "phone layout")
    .replace(/\bon mobile\b/gi, "on phones")
    .replace(/\bmobile\b/gi, "phone")
    .replace(/\bcache\s*bust(?:ing|ed)?\b/gi, "refresh support")
    .replace(/\bdeploy(?:ed|s|ment)?\b/gi, "update")
    .replace(/\brefactor(?:ed|ing)?\b/gi, "cleanup")
    .replace(/\bCSS\b/g, "styling")
    .replace(/\bAPI\b/g, "service")
    .replace(/\bPoC\b/g, "prototype")
    .replace(/\bv\d+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function consumerizeReleaseNoteSubject(subject) {
  const original = scrubCopiedPlatformNames(String(subject || "").trim());
  let text = original
    .replace(/^(chore|fix|feat|docs|refactor|style|test|build|ci)(\([^)]*\))?:\s*/i, "")
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .trim();
  if (!text) return "";

  // Prefer clear product language for common Synk Community themes.
  const patterns = [
    [
      /\b(crop|scale).*(profile|photo|avatar|icon)|(?:profile|photo|avatar|icon).*(crop|scale)/i,
      "You can now crop and zoom profile photos and icons before saving them",
    ],
    [
      /\b(g\/|u\/).*(prefix|label)|remove.*\b(g\/|u\/)|drop.*\b(g\/|u\/)/i,
      "Group and profile names are shown more simply, without extra prefixes",
    ],
    [
      /\btags?\b.*\b(group|profile|user)|(?:group|profile|user).*\btags?\b/i,
      "Tags can be managed from group and profile pages, making Community roles easier to spot",
    ],
    [
      /\b(synk\s+)?(server|channels?|navigation).*(group|community)|redo.*synk|rebuild.*synk|revise.*synk.*channel/i,
      "The official Synk community is easier to browse, with clearer channels and simpler navigation",
    ],
    [
      /\bmobile\b.*\b(community|channel|layout|polish)|community.*\bmobile\b/i,
      "Community is easier to use on phones, with a cleaner channel bar and less scrolling to reach posts",
    ],
    [
      /\b(your\s+)?groups?\b.*\b(broken|overwrite|empty|fix)|fix.*\b(your\s+)?groups?\b/i,
      "Fixed a problem where Your Groups could disappear or show an empty feed",
    ],
    [
      /\b(avatar|profile photo).*\b(inbox|feed|comment)|(?:inbox|feed|comment).*\b(avatar|profile photo)/i,
      "Profile photos now show more consistently across the feed, comments, and inbox",
    ],
    [
      /\b(empty state|empty screen).*(inbox|feed|comment)|(?:inbox|feed|comment).*(empty state|empty screen)/i,
      "Empty screens in Community now explain what to do next in clearer language",
    ],
    [
      /\bsignal\s+teal|no\s+.*orange|restyle.*community|synk\s+palette/i,
      "Community styling now follows the Synk look more closely",
    ],
    [
      /\bloader\b|\bloading animation\b|\bsynk logo loader\b/i,
      "Loading feels smoother, with the Synk logo animation used only when something is actually waiting",
    ],
    [
      /\balt accounts?\b|\bact(?:ive)?\s+alt\b/i,
      "Alt accounts behave more like regular Community profiles, including profile and follow links",
    ],
    [
      /\binbox\b.*\bunread|\bunread\b.*\binbox|\bnotification.*avatar/i,
      "Notifications are clearer, with profile photos and a simpler unread layout",
    ],
  ];
  for (const [re, phrase] of patterns) {
    if (!re.test(text)) continue;
    const polished = String(phrase || "").trim();
    if (!polished) continue;
    return /[.!?]$/.test(polished) ? polished : `${polished}.`;
  }

  text = softenReleaseNoteJargon(text);
  text = text
    .replace(/^(Redo|Redesign)\b/i, "Redesigned")
    .replace(/^Revise\b/i, "Improved")
    .replace(/^Fix\b/i, "Fixed")
    .replace(/^Add\b/i, "Added")
    .replace(/^Update\b/i, "Updated")
    .replace(/^Improve\b/i, "Improved")
    .replace(/^Remove\b/i, "Removed")
    .replace(/^Polish\b/i, "Polished")
    .replace(/^Clean up\b/i, "Cleaned up")
    .replace(/^Make\b/i, "Made")
    .replace(/^Allow\b/i, "You can now")
    .replace(/^Keep revising\b/i, "Continued refining")
    .replace(/^Re-?enable\b/i, "Re-enabled")
    .replace(/^Treat\b/i, "Updated how we treat")
    .replace(/^Point\b/i, "Updated")
    .replace(/^Show\b/i, "Now shows")
    .replace(/^Settle\b/i, "Settled");

  // Turn leftover engineering phrasing into member-facing wording.
  text = text
    .replace(/\bfor Synk channels\b/gi, "in Synk Community")
    .replace(/\bCommunity v\d+\b/gi, "Community")
    .replace(/\bclassic Synk look and feel\b/gi, "Synk look and feel")
    .replace(/\bempty screens\b/gi, "empty screens")
    .replace(/\bpage being overwritten\b/gi, "page getting replaced")
    .replace(/\blook and feel \(v\d+\)\b/gi, "look and feel");

  text = text.replace(/\s+/g, " ").replace(/^[,:;.\-\s]+|[,:;.\-\s]+$/g, "").trim();
  if (!text) return "";
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[.!?]$/.test(text)) text += ".";
  return scrubCopiedPlatformNames(text).trim();
}

function polishReleaseNoteSubject(subject) {
  return consumerizeReleaseNoteSubject(subject);
}

function categorizeReleaseNoteSubject(subject, isBeta) {
  if (isBeta) return "testing";
  const text = String(subject || "").toLowerCase();
  if (/\b(fix(?:ed|es)?|bug|crash|hotfix|patch|resolve[sd]?|repair(?:ed)?|broken|regression)\b/.test(text)) {
    return "fixes";
  }
  if (
    /\b(you can now|add(?:ed)?|new|launch(?:ed)?|introduce[sd]?|creat(?:e|ed)|enable[sd]?|ship(?:ped)?)\b/.test(
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

  pushSection("New features", buckets.new);
  pushSection("Improvements", buckets.improvements);
  pushSection("Bug fixes", buckets.fixes);
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
    body: "Synk has a new update with product improvements. Refresh or reopen the app to get the latest.",
    notes:
      notes ||
      "## Improvements\n\n- Synk has a new update with product improvements and fixes. Refresh or reopen the app to get the latest.",
  });

  if (!result.ok) {
    console.error(result.error || "Broadcast failed");
    process.exit(1);
  }

  if (result.alreadyBroadcast) {
    console.log(
      `App update ${result.version} already notified (${result.notified} users).`
    );
    if (result.notesRefreshed) {
      console.log("Refreshed stored release notes with consumer-facing copy.");
    }
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