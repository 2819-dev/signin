const { getSql, json, requireAdmin, mapRow } = require("./lib/db");
const { notifyAdmins } = require("./lib/push");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  try {
    const sql = getSql();

    if (event.httpMethod === "POST") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      const name = (body.name || "").trim();
      const reason = (body.reason || "").trim();

      if (!name || name.length > 100) {
        return json(400, { error: "Name is required (max 100 characters)" });
      }
      if (!reason || reason.length > 500) {
        return json(400, { error: "Reason is required (max 500 characters)" });
      }

      const settingsRows = await sql`
        SELECT is_open
        FROM kiosk_settings
        WHERE id = 1
        LIMIT 1
      `;
      if (settingsRows.length && settingsRows[0].is_open === false) {
        return json(403, { error: "Not accepting visitors right now" });
      }

      const rows = await sql`
        INSERT INTO visitor_requests (name, reason)
        VALUES (${name}, ${reason})
        RETURNING id, name, reason, status, decline_reason, created_at, resolved_at
      `;

      const request = mapRow(rows[0]);

      try {
        await notifyAdmins({
          title: "New visitor request",
          body: `${request.name}: ${request.reason}`,
          url: "/admin",
          tag: request.id,
        });
      } catch (err) {
        console.error("notifyAdmins failed", err);
      }

      return json(201, { request });
    }

    if (event.httpMethod === "GET") {
      const auth = requireAdmin(event);
      if (!auth.ok) return auth.response;

      const status =
        event.queryStringParameters && event.queryStringParameters.status
          ? event.queryStringParameters.status
          : null;

      let rows;
      if (status === "pending") {
        rows = await sql`
          SELECT id, name, reason, status, decline_reason, created_at, resolved_at
          FROM visitor_requests
          WHERE status = 'pending'
          ORDER BY created_at ASC
        `;
      } else if (status === "recent") {
        rows = await sql`
          SELECT id, name, reason, status, decline_reason, created_at, resolved_at
          FROM visitor_requests
          ORDER BY created_at DESC
          LIMIT 50
        `;
      } else {
        rows = await sql`
          SELECT id, name, reason, status, decline_reason, created_at, resolved_at
          FROM visitor_requests
          WHERE status = 'pending'
             OR created_at > NOW() - INTERVAL '24 hours'
          ORDER BY
            CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
            created_at DESC
        `;
      }

      return json(200, { requests: rows.map(mapRow) });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
