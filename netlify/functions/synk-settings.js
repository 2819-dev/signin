"use strict";

const { getSql, json, requireSynkAdmin } = require("./lib/db");
const { ensureSynkCoreTables } = require("./lib/synk");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  const auth = await requireSynkAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);

    if (event.httpMethod === "GET") {
      const [profileCount, enabledCount, appCount, eventCount, recentFails, activePasses] =
        await Promise.all([
          sql`SELECT COUNT(*)::int AS n FROM synk_profiles`,
          sql`SELECT COUNT(*)::int AS n FROM synk_profiles WHERE enabled = TRUE`,
          sql`SELECT COUNT(*)::int AS n FROM synk_apps`,
          sql`SELECT COUNT(*)::int AS n FROM synk_events WHERE created_at > NOW() - INTERVAL '24 hours'`,
          sql`
            SELECT COUNT(*)::int AS n
            FROM synk_events
            WHERE created_at > NOW() - INTERVAL '24 hours'
              AND event_type ILIKE '%fail%'
          `,
          sql`
            SELECT COUNT(*)::int AS n
            FROM synk_passes
            WHERE consumed_at IS NULL
              AND revoked_at IS NULL
              AND expires_at > NOW()
          `,
        ]);

      return json(200, {
        stats: {
          members: profileCount[0]?.n || 0,
          membersEnabled: enabledCount[0]?.n || 0,
          apps: appCount[0]?.n || 0,
          events24h: eventCount[0]?.n || 0,
          fails24h: recentFails[0]?.n || 0,
          activePasses: activePasses[0]?.n || 0,
        },
      });
    }

    if (event.httpMethod === "POST" || event.httpMethod === "PUT" || event.httpMethod === "PATCH") {
      return json(400, {
        error: "Camera framing is managed per device in the Synk Business portal",
      });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("synk-settings error:", err);
    return json(err.statusCode || 500, { error: err.message || "Server error" });
  }
};
