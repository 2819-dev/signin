"use strict";

const { getSql, json, requireSynkAdmin } = require("./lib/db");
const { ensureSynkCoreTables } = require("./lib/synk");

function csvEscape(value) {
  const raw = String(value == null ? "" : value);
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const auth = await requireSynkAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);
    const q = event.queryStringParameters || {};
    const type = String(q.type || "").trim();
    const search = String(q.q || "").trim();
    const limit = Math.min(500, Math.max(1, Number(q.limit) || 100));
    const format = String(q.format || "json").toLowerCase();

    let rows;
    if (type && search) {
      const like = `%${search}%`;
      rows = await sql`
        SELECT id, event_type, synk_profile_id, app_slug, ip, detail, created_at
        FROM synk_events
        WHERE event_type = ${type}
          AND (
            detail ILIKE ${like}
            OR COALESCE(app_slug, '') ILIKE ${like}
            OR COALESCE(ip, '') ILIKE ${like}
          )
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else if (type) {
      rows = await sql`
        SELECT id, event_type, synk_profile_id, app_slug, ip, detail, created_at
        FROM synk_events
        WHERE event_type = ${type}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else if (search) {
      const like = `%${search}%`;
      rows = await sql`
        SELECT id, event_type, synk_profile_id, app_slug, ip, detail, created_at
        FROM synk_events
        WHERE detail ILIKE ${like}
          OR COALESCE(app_slug, '') ILIKE ${like}
          OR COALESCE(ip, '') ILIKE ${like}
          OR event_type ILIKE ${like}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    } else {
      rows = await sql`
        SELECT id, event_type, synk_profile_id, app_slug, ip, detail, created_at
        FROM synk_events
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }

    const events = rows.map((row) => ({
      id: row.id,
      type: row.event_type,
      profileId: row.synk_profile_id,
      appSlug: row.app_slug,
      ip: row.ip,
      detail: row.detail,
      createdAt: row.created_at,
    }));

    if (format === "csv") {
      const lines = [
        ["createdAt", "type", "appSlug", "ip", "detail", "profileId"].join(","),
        ...events.map((ev) =>
          [ev.createdAt, ev.type, ev.appSlug, ev.ip, ev.detail, ev.profileId]
            .map(csvEscape)
            .join(",")
        ),
      ];
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="synk-activity.csv"',
          "Cache-Control": "no-store",
        },
        body: lines.join("\n"),
      };
    }

    const types = await sql`
      SELECT event_type AS type, COUNT(*)::int AS n
      FROM synk_events
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY event_type
      ORDER BY n DESC
      LIMIT 40
    `;

    return json(200, {
      events,
      types: types.map((row) => ({ type: row.type, count: row.n })),
    });
  } catch (err) {
    console.error("synk-activity error:", err);
    return json(500, { error: "Server error" });
  }
};
