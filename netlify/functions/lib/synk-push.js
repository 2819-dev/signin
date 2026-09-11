"use strict";

const webpush = require("web-push");

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

function configureSynkWebPush() {
  const cfg = getVapidConfig();
  if (!cfg) throw new Error("VAPID keys are not configured");
  webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
  return cfg;
}

async function ensureSynkPushTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS synk_push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      user_agent TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (endpoint)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_push_subscriptions_profile_idx
    ON synk_push_subscriptions (synk_profile_id)
  `;
}

async function saveSynkPushSubscription(
  sql,
  { profileId, endpoint, p256dh, auth, userAgent = "" } = {}
) {
  const id = String(profileId || "").trim();
  const ep = String(endpoint || "").trim();
  const key = String(p256dh || "").trim();
  const secret = String(auth || "").trim();
  if (!id || !ep || !key || !secret) {
    return { ok: false, error: "Invalid push subscription" };
  }
  await ensureSynkPushTables(sql);
  await sql`
    INSERT INTO synk_push_subscriptions (
      synk_profile_id, endpoint, p256dh, auth, user_agent
    )
    VALUES (
      ${id},
      ${ep},
      ${key},
      ${secret},
      ${String(userAgent || "").slice(0, 300)}
    )
    ON CONFLICT (endpoint) DO UPDATE
    SET synk_profile_id = EXCLUDED.synk_profile_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        last_seen_at = NOW()
  `;
  return { ok: true };
}

async function deleteSynkPushSubscription(sql, { profileId = null, endpoint = "" } = {}) {
  const ep = String(endpoint || "").trim();
  if (!ep) return { ok: false, error: "endpoint required" };
  await ensureSynkPushTables(sql);
  if (profileId) {
    await sql`
      DELETE FROM synk_push_subscriptions
      WHERE endpoint = ${ep}
        AND synk_profile_id = ${profileId}
    `;
  } else {
    await sql`DELETE FROM synk_push_subscriptions WHERE endpoint = ${ep}`;
  }
  return { ok: true };
}

async function notifySynkProfile(sql, profileId, payload = {}) {
  const id = String(profileId || "").trim();
  if (!id) return { sent: 0, removed: 0, skipped: true };
  const cfg = getVapidConfig();
  if (!cfg) return { sent: 0, removed: 0, skipped: true, reason: "vapid-missing" };

  try {
    configureSynkWebPush();
    await ensureSynkPushTables(sql);
  } catch (err) {
    console.error("synk push configure failed", err && err.message ? err.message : err);
    return { sent: 0, removed: 0, skipped: true };
  }

  const rows = await sql`
    SELECT id, endpoint, p256dh, auth
    FROM synk_push_subscriptions
    WHERE synk_profile_id = ${id}
  `;
  if (!rows.length) return { sent: 0, removed: 0 };

  const body = JSON.stringify({
    title: String(payload.title || "Synk").slice(0, 120),
    body: String(payload.body || payload.description || "").slice(0, 240),
    url: String(payload.url || "/community/inbox").slice(0, 300),
    tag: String(payload.tag || payload.type || "synk-notification").slice(0, 120),
    type: String(payload.type || "notification").slice(0, 40),
  });

  let sent = 0;
  let removed = 0;
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
          { TTL: 60 * 60, urgency: "high" }
        );
        sent += 1;
        await sql`
          UPDATE synk_push_subscriptions
          SET last_seen_at = NOW()
          WHERE id = ${row.id}
        `;
      } catch (err) {
        const status = err && err.statusCode;
        if (status === 404 || status === 410) {
          await sql`DELETE FROM synk_push_subscriptions WHERE id = ${row.id}`;
          removed += 1;
        } else {
          console.error("synk push failed", status || (err && err.message) || err);
        }
      }
    })
  );

  return { sent, removed };
}

async function broadcastSynkPush(sql, payload = {}) {
  const cfg = getVapidConfig();
  if (!cfg) return { sent: 0, removed: 0, skipped: true, reason: "vapid-missing" };

  try {
    configureSynkWebPush();
    await ensureSynkPushTables(sql);
  } catch (err) {
    console.error("synk push configure failed", err && err.message ? err.message : err);
    return { sent: 0, removed: 0, skipped: true };
  }

  const rows = await sql`
    SELECT id, endpoint, p256dh, auth
    FROM synk_push_subscriptions
  `;
  if (!rows.length) return { sent: 0, removed: 0 };

  const body = JSON.stringify({
    title: String(payload.title || "Synk").slice(0, 120),
    body: String(payload.body || payload.description || "").slice(0, 240),
    url: String(payload.url || "/community/inbox").slice(0, 300),
    tag: String(payload.tag || payload.type || "synk-notification").slice(0, 120),
    type: String(payload.type || "notification").slice(0, 40),
  });

  let sent = 0;
  let removed = 0;
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
          { TTL: 60 * 60, urgency: "normal" }
        );
        sent += 1;
        await sql`
          UPDATE synk_push_subscriptions
          SET last_seen_at = NOW()
          WHERE id = ${row.id}
        `;
      } catch (err) {
        const status = err && err.statusCode;
        if (status === 404 || status === 410) {
          await sql`DELETE FROM synk_push_subscriptions WHERE id = ${row.id}`;
          removed += 1;
        } else {
          console.error("synk broadcast push failed", status || (err && err.message) || err);
        }
      }
    })
  );

  return { sent, removed };
}

function notificationPushPayload({ kind, actorUsername, body, postId = null } = {}) {
  const actor = String(actorUsername || "").trim() || "Someone";
  const k = String(kind || "").trim().toLowerCase().replace(/-/g, "_");
  const text = String(body || "").trim();
  if (k === "dm" || k === "message") {
    return {
      title: "New message",
      body: text || `${actor} sent you a message.`,
      url: `/community/inbox?tab=messages&dm=${encodeURIComponent(actor)}`,
      tag: `dm-${actor}`,
      type: "dm",
    };
  }
  if (k === "friend_request") {
    return {
      title: "Friend request",
      body: text || `${actor} sent you a friend request.`,
      url: "/community/inbox",
      tag: `friend-request-${actor}`,
      type: "notification",
    };
  }
  if (k === "friend_accept" || k === "friend_accepted") {
    return {
      title: "Friend request accepted",
      body: text || `${actor} accepted your friend request.`,
      url: `/user/${encodeURIComponent(actor)}`,
      tag: `friend-accept-${actor}`,
      type: "notification",
    };
  }
  if (k === "app_update" || k === "app_updated" || k === "update") {
    return {
      title: "App updated",
      body: text || "Synk was updated. Refresh to get the latest.",
      url: "/community/inbox",
      tag: "app-update",
      type: "notification",
    };
  }
  const url = postId
    ? `/community/post/${encodeURIComponent(postId)}`
    : "/community/inbox";
  return {
    title:
      k === "comment"
        ? "New comment"
        : k === "reply" || k.includes("reply")
          ? "New reply"
          : "Notification",
    body: text || `${actor} sent you a notification.`,
    url,
    tag: `${k || "note"}-${actor || "synk"}`,
    type: "notification",
  };
}

module.exports = {
  getVapidConfig,
  configureSynkWebPush,
  ensureSynkPushTables,
  saveSynkPushSubscription,
  deleteSynkPushSubscription,
  notifySynkProfile,
  broadcastSynkPush,
  notificationPushPayload,
};
