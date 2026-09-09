"use strict";

const { getSql, json, requireSynkAdmin } = require("./lib/db");
const { ensureSynkCoreTables } = require("./lib/synk");

function normalizeCameraSide(value) {
  const side = String(value || "")
    .toLowerCase()
    .trim();
  return ["left", "right", "center"].includes(side) ? side : "left";
}

async function ensureKioskCameraColumn(sql) {
  await sql`
    ALTER TABLE kiosk_settings
    ADD COLUMN IF NOT EXISTS camera_side TEXT NOT NULL DEFAULT 'left'
  `;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  const auth = requireSynkAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);
    await ensureKioskCameraColumn(sql);

    if (event.httpMethod === "GET") {
      const settingsRows = await sql`
        SELECT camera_side, updated_at
        FROM kiosk_settings
        WHERE id = 1
        LIMIT 1
      `;
      const row = settingsRows[0] || {};

      const [profileCount, enabledCount, appCount, eventCount, recentFails] =
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
        ]);

      return json(200, {
        cameraSide: normalizeCameraSide(row.camera_side),
        updatedAt: row.updated_at || null,
        stats: {
          members: profileCount[0]?.n || 0,
          membersEnabled: enabledCount[0]?.n || 0,
          apps: appCount[0]?.n || 0,
          events24h: eventCount[0]?.n || 0,
          fails24h: recentFails[0]?.n || 0,
        },
      });
    }

    if (event.httpMethod === "POST" || event.httpMethod === "PUT" || event.httpMethod === "PATCH") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      if (body.cameraSide != null) {
        const raw = String(body.cameraSide || "")
          .toLowerCase()
          .trim();
        if (!["left", "right", "center"].includes(raw)) {
          return json(400, { error: "cameraSide must be left, right, or center" });
        }
        const cameraSide = normalizeCameraSide(raw);
        await sql`
          INSERT INTO kiosk_settings (id)
          VALUES (1)
          ON CONFLICT (id) DO NOTHING
        `;
        await sql`
          UPDATE kiosk_settings
          SET camera_side = ${cameraSide}, updated_at = NOW()
          WHERE id = 1
        `;
      }

      const settingsRows = await sql`
        SELECT camera_side, updated_at
        FROM kiosk_settings
        WHERE id = 1
        LIMIT 1
      `;
      const row = settingsRows[0] || {};
      return json(200, {
        ok: true,
        cameraSide: normalizeCameraSide(row.camera_side),
        updatedAt: row.updated_at || null,
      });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("synk-settings error:", err);
    return json(err.statusCode || 500, { error: err.message || "Server error" });
  }
};
