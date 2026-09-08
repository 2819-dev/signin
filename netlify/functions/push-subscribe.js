const { getSql, json, requireAdmin } = require("./lib/db");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const sql = getSql();

    if (event.httpMethod === "POST") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      const endpoint = (body.endpoint || "").trim();
      const p256dh = body.keys && body.keys.p256dh ? String(body.keys.p256dh).trim() : "";
      const authKey = body.keys && body.keys.auth ? String(body.keys.auth).trim() : "";
      const userAgent = (event.headers["user-agent"] || "").slice(0, 300);

      if (!endpoint || !p256dh || !authKey) {
        return json(400, { error: "Invalid push subscription" });
      }

      await sql`
        INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent)
        VALUES (${endpoint}, ${p256dh}, ${authKey}, ${userAgent})
        ON CONFLICT (endpoint) DO UPDATE
        SET p256dh = EXCLUDED.p256dh,
            auth = EXCLUDED.auth,
            user_agent = EXCLUDED.user_agent,
            last_seen_at = NOW()
      `;

      return json(200, { ok: true });
    }

    if (event.httpMethod === "DELETE") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      const endpoint = (body.endpoint || "").trim();
      if (!endpoint) {
        return json(400, { error: "endpoint is required" });
      }

      await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
