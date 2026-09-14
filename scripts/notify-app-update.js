#!/usr/bin/env node
/**
 * Broadcasts an in-app Community notification when Synk updates.
 * Builds release notes from commits since the previous broadcast only
 * (no repeated carry-over from older updates).
 *
 * Usage:
 *   node scripts/notify-app-update.js [version]
 *   COMMIT_REF=abc node scripts/notify-app-update.js
 *   DRY_RUN=1 node scripts/notify-app-update.js [version]
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

function looksLikeGitSha(value) {
  return /^[0-9a-f]{7,40}$/i.test(String(value || "").trim());
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

function gitCommitSubjectsSince(previousRef, endRef = "HEAD") {
  try {
    const end = String(endRef || "HEAD").trim() || "HEAD";
    const start = String(previousRef || "").trim();
    const format = start
      ? `git log --pretty=format:"%H%x09%s" ${start}..${end}`
      : `git log -20 --pretty=format:"%H%x09%s" ${end}`;
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

function finalizeReleaseNoteSentence(text) {
  let out = scrubCopiedPlatformNames(String(text || ""))
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[,:;.\-\s]+|[,:;.\-\s]+$/g, "")
    .trim();
  if (!out) return "";
  out = out.charAt(0).toUpperCase() + out.slice(1);
  if (!/[.!?]$/.test(out)) out += ".";
  return out;
}

function softenReleaseNoteJargon(text) {
  return String(text || "")
    .replace(/\bUI\b/g, "interface")
    .replace(/\bUX\b/g, "experience")
    .replace(/\bCTA\b/g, "button")
    .replace(/\bCTAs\b/g, "buttons")
    .replace(/\bavatars?\b/gi, (m) => (/s$/i.test(m) ? "profile photos" : "profile photo"))
    .replace(/\binbox\b/gi, "notifications")
    .replace(/\bempty states?\b/gi, "empty screens")
    .replace(/\bchrome\b/gi, "look and feel")
    .replace(/\blayout and look and feel\b/gi, "layout and look")
    .replace(/\bmobile layout\b/gi, "phone layout")
    .replace(/\bon mobile\b/gi, "on phones")
    .replace(/\bmobile\b/gi, "phone")
    .replace(/\bcache\s*bust(?:ing|ed)?\b/gi, "refresh support")
    .replace(/\bdeploy(?:ed|s|ment)?\b/gi, "update")
    .replace(/\brefactor(?:ed|ing)?\b/gi, "cleanup")
    .replace(/\bCSS\b/g, "styling")
    .replace(/\bAPI\b/g, "service")
    .replace(/\bPoC\b/g, "prototype")
    .replace(/\bReddit\b/gi, "")
    .replace(/\bDiscord\b/gi, "")
    .replace(/\bv\d+\b/gi, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function releaseNoteThemePhrases(subject) {
  const text = String(subject || "");
  const phrases = [];
  const flags = {
    yourGroups: false,
    crop: false,
    mobile: false,
  };
  const add = (re, phrase, flagName) => {
    if (!re.test(text)) return;
    const polished = finalizeReleaseNoteSentence(phrase);
    if (polished && !phrases.includes(polished)) phrases.push(polished);
    if (flagName) flags[flagName] = true;
  };

  add(
    /\b(crop|scale|zoom).*(profile|photo|avatar|icon)|(?:profile|photo|avatar|icon).*(crop|scale|zoom)/i,
    "You can now crop and zoom profile photos and icons before saving them, so they look the way you want",
    "crop"
  );
  add(
    /\b(g\/|u\/).*(prefix|label)|remove.*\b(g\/|u\/)|drop.*\b(g\/|u\/)|without.*prefix/i,
    "Group and profile names appear more simply, without extra prefixes in the interface"
  );
  add(
    /\btags?\b/i,
    "Staff can assign tags from group and profile pages, so Community roles and labels are easier to spot"
  );
  add(
    /\bmobile\b/i,
    "Community is easier to use on phones, with a cleaner channel bar and less scrolling before you reach posts",
    "mobile"
  );
  if (!flags.mobile || /\b(navigation|server|redo|rebuild|revise)\b/i.test(text)) {
    add(
      /\b(synk\s+)?(server|channels?|navigation)|redo.*synk|rebuild.*synk|revise.*synk.*(channel|nav|group)/i,
      "The official Synk community is easier to browse, with clearer channel sections and simpler navigation"
    );
  }
  add(
    /\byour\s+groups?\b/i,
    "Fixed a problem where Your Groups could disappear or show an empty feed, so the communities you follow stay easy to find",
    "yourGroups"
  );
  if (!flags.yourGroups) {
    add(
      /\bgroups?\s+page\b|\bcommunity groups?\b/i,
      "The Community groups page is clearer and easier to browse"
    );
  }
  if (!flags.crop) {
    add(
      /\b(avatar|profile photo)s?\b/i,
      "Profile photos show more consistently across the feed, comments, and notifications"
    );
  }
  add(
    /\binbox\b|\bnotifications?\b/i,
    "Notifications are clearer, with profile photos and an easier-to-scan unread layout"
  );
  add(
    /\bempty state|\bempty screen/i,
    "Empty screens in Community now explain what to do next in plain language"
  );
  add(
    /\bsignal\s+teal|no\s+.*orange|restyle.*community|synk\s+palette|classic.*(?:layout|chrome|look)/i,
    "Community styling now follows the Synk look more closely for a cleaner, more familiar feel"
  );
  add(
    /\bloader\b|\bloading animation\b|\bsynk logo loader\b|\bloading skeleton/i,
    "Loading feels smoother, with the Synk logo animation used only when something is actually waiting"
  );
  add(
    /\balt accounts?\b|\bact(?:ive)?\s+alt\b|\bfollow(?:ing)? your main\b|\bme\/profile/i,
    "Alt accounts behave more like regular Community profiles, including profile and follow links"
  );
  add(
    /\brelease notes?\b|\bwhats?\s*new\b|\bconsumer-facing\b/i,
    "Release notes are written in clearer everyday language so updates are easier to understand"
  );
  add(
    /\bfollow lists?\b|\bsocial actions?\b|\bfollow icons?\b/i,
    "Following people is clearer, with profile follow lists and simpler social actions"
  );
  add(
    /\bjoined date\b|\bresponsive\b/i,
    "Profiles and Community pages adapt more cleanly across screen sizes, including Joined date details"
  );

  return phrases;
}

function consumerizeReleaseNoteSubject(subject) {
  const original = scrubCopiedPlatformNames(String(subject || "").trim());
  let text = original
    .replace(/^(chore|fix|feat|docs|refactor|style|test|build|ci)(\([^)]*\))?:\s*/i, "")
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .trim();
  if (!text) return [];

  const themed = releaseNoteThemePhrases(text);
  if (themed.length) return themed;

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
    .replace(/^Settle\b/i, "Settled")
    .replace(/^Refresh\b/i, "Refreshed");

  text = text
    .replace(/\bfor Synk channels\b/gi, "in Synk Community")
    .replace(/\bCommunity v\d+\b/gi, "Community")
    .replace(/\bclassic Synk look and feel\b/gi, "Synk look and feel")
    .replace(/\bpage being overwritten\b/gi, "page getting replaced")
    .replace(/\blook and feel \(v\d+\)\b/gi, "look and feel")
    .replace(/\btoward classic layout and look\b/gi, "with a cleaner classic layout");

  // Expand terse leftovers into member-facing benefit language.
  if (/^Fixed\b/i.test(text) && text.split(/\s+/).length < 14) {
    text = text.replace(/\.$/, "") + ", so things work more reliably for everyone";
  } else if (/^(Added|You can now)\b/i.test(text) && text.split(/\s+/).length < 12) {
    text = text.replace(/\.$/, "") + " in Synk Community";
  } else if (/^(Improved|Polished|Updated|Redesigned|Refreshed|Made)\b/i.test(text) && text.split(/\s+/).length < 14) {
    text = text.replace(/\.$/, "") + " for a smoother everyday experience";
  }

  const polished = finalizeReleaseNoteSentence(text);
  return polished ? [polished] : [];
}

function polishReleaseNoteSubjects(subject) {
  return consumerizeReleaseNoteSubject(subject);
}

function categorizeReleaseNoteSubject(subject, isBeta) {
  if (isBeta) return "testing";
  const text = String(subject || "").toLowerCase();
  if (/\b(fix(?:ed|es)?|bug|crash|hotfix|patch|resolve[sd]?|repair(?:ed)?|broken|regression|disappear)\b/.test(text)) {
    return "fixes";
  }
  if (
    /\b(you can now|add(?:ed)?|new|launch(?:ed)?|introduce[sd]?|creat(?:e|ed)|enable[sd]?|ship(?:ped)?|can assign)\b/.test(
      text
    )
  ) {
    return "new";
  }
  return "improvements";
}

function isGenericFallbackNotes(notes) {
  const text = String(notes || "").trim();
  if (!text) return true;
  return /^##\s*Improvements\s*\n+\s*-\s*Synk update\b/i.test(text);
}

function buildReleaseNotesFromGit(version, { previousVersion = "", previousNotes = "", endRef = "" } = {}) {
  const short = String(version || "").slice(0, 10);
  const tip = String(endRef || "").trim() || (looksLikeGitSha(version) ? String(version).trim() : "HEAD");
  let commits = gitCommitSubjectsSince(previousVersion, tip);

  // If the previous version isn't a reachable git ref, fall back near this tip.
  if ((!commits || !commits.length) && previousVersion) {
    commits = gitCommitSubjectsSince("", tip);
  }
  if (!commits.length) {
    commits = gitCommitSubjectsSince("", tip);
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
    const polishedList = polishReleaseNoteSubjects(rawSubject);
    for (const subject of polishedList) {
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
  }

  // Always include at least the current update, even if it's a one-line change.
  if (!buckets.new.length && !buckets.improvements.length && !buckets.fixes.length && !buckets.testing.length) {
    buckets.improvements.push(
      `- Synk update ${short || "latest"} is live. Refresh or reopen the app to get the latest improvements.`
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

async function getRecentAppUpdateBroadcasts(sql, limit = 5) {
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 5));
  return sql`
    SELECT version, body, notes, created_at
    FROM synk_app_update_broadcasts
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `;
}

async function main() {
  const dryRun = String(process.env.DRY_RUN || "").trim() === "1";
  const dbUrl = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || "";
  if (!dbUrl && !dryRun) {
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

  let sql = null;
  let previousVersion = "";
  let previousNotes = "";
  let existingNotesForVersion = "";

  if (dbUrl) {
    sql = neon(dbUrl);
    await ensureSynkCoreTables(sql);

    // Auto-refresh tester agenda from each update's release notes.
    // Set CLEAR_BETA_AGENDA=0 to keep manual agenda items across deploys.
    if (!dryRun && String(process.env.CLEAR_BETA_AGENDA || "1").trim() !== "0") {
      try {
        const cleared = await clearAllBetaAgendaItems(sql);
        console.log(`Cleared ${cleared.cleared} beta agenda item(s).`);
      } catch (err) {
        console.error("Could not clear beta agenda:", err.message || err);
      }
    }

    const recent = await getRecentAppUpdateBroadcasts(sql, 10);
    const idx = recent.findIndex((row) => row.version === version);
    if (idx >= 0) {
      existingNotesForVersion = String(recent[idx].notes || "");
      // recent is newest-first, so the next row is the prior broadcast.
      if (recent[idx + 1]) {
        previousVersion = String(recent[idx + 1].version || "");
        previousNotes = String(recent[idx + 1].notes || "");
      }
    } else if (recent[0]) {
      previousVersion = String(recent[0].version || "");
      previousNotes = String(recent[0].notes || "");
    } else {
      const previous = await getAppUpdateReleaseNotes(sql, "latest");
      if (previous && previous.version && previous.version !== version) {
        previousVersion = previous.version;
        previousNotes = previous.notes || previous.body || "";
      }
    }
  }

  const notes = buildReleaseNotesFromGit(version, {
    previousVersion,
    previousNotes,
    endRef: looksLikeGitSha(version) ? version : "HEAD",
  });

  // Avoid clobbering richer stored notes with the generic fallback during a refresh.
  const finalNotes =
    isGenericFallbackNotes(notes) && existingNotesForVersion && !isGenericFallbackNotes(existingNotesForVersion)
      ? existingNotesForVersion
      : notes;

  const body =
    "Synk has a new update. Open Release notes for a clear summary of what changed, then refresh or reopen the app to get it.";

  if (dryRun) {
    console.log(`DRY_RUN version=${version}`);
    console.log(`baseline=${previousVersion || "(none)"}`);
    console.log("---notes---");
    console.log(finalNotes);
    return;
  }

  const result = await broadcastAppUpdate(sql, {
    version,
    body,
    notes:
      finalNotes ||
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

module.exports = {
  buildReleaseNotesFromGit,
  polishReleaseNoteSubjects,
  consumerizeReleaseNoteSubject,
  isGenericFallbackNotes,
};
