const webpush = require("web-push");
const { getSql } = require("./db");

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey };
}

async function notifyAdmins(payload) {
  const { publicKey } = configureWebPush();
  void publicKey;

  const sql = getSql();
  const rows = await sql`
    SELECT id, endpoint, p256dh, auth
    FROM push_subscriptions
  `;

  if (!rows.length) {
    return { sent: 0, removed: 0 };
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          },
          body,
          {
            TTL: 60,
            urgency: "high",
          }
        );
        sent += 1;
        await sql`
          UPDATE push_subscriptions
          SET last_seen_at = NOW()
          WHERE id = ${row.id}
        `;
      } catch (err) {
        const status = err && err.statusCode;
        if (status === 404 || status === 410) {
          await sql`DELETE FROM push_subscriptions WHERE id = ${row.id}`;
          removed += 1;
        } else {
          console.error("push failed", status || err.message || err);
        }
      }
    })
  );

  return { sent, removed };
}

module.exports = { configureWebPush, notifyAdmins };
