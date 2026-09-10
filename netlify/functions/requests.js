const { getSql, json, requireAdmin, mapRow } = require("./lib/db");
const { expireTimedOutRequests } = require("./lib/request-timeout");
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
      const urgent = Boolean(body.urgent);

      if (!name || name.length > 100) {
        return json(400, { error: "Name is required (max 100 characters)" });
      }
      if (!reason || reason.length > 500) {
        return json(400, { error: "Reason is required (max 500 characters)" });
      }

      const settingsRows = await sql`
        SELECT is_open, urgent_enabled
        FROM kiosk_settings
        WHERE id = 1
        LIMIT 1
      `;
      const closed = settingsRows.length && settingsRows[0].is_open === false;
      const urgentAllowed =
        !settingsRows.length || settingsRows[0].urgent_enabled !== false;
      const isUrgent = urgent && urgentAllowed;

      if (closed && !isUrgent) {
        return json(403, {
          error: urgent
            ? "Urgent sign in is turned off"
            : "Not accepting visitors right now",
        });
      }

      const rows = await sql`
        INSERT INTO visitor_requests (name, reason, urgent)
        VALUES (${name}, ${reason}, ${isUrgent})
        RETURNING id, name, reason, status, decline_reason, urgent, created_at, resolved_at
      `;

      const request = mapRow(rows[0]);

      try {
        await notifyAdmins({
          title: request.urgent ? "Urgent" : "Request",
          body: request.name || "Visitor",
          url: "/admin",
          tag: `visitor-${request.id}`,
          type: request.urgent ? "urgent" : "request",
          urgent: request.urgent,
          name: request.name,
          reason: request.reason,
        });
      } catch (err) {
        console.error("notifyAdmins failed", err);
      }

      return json(201, { request });
    }

    if (event.httpMethod === "GET") {
      const auth = requireAdmin(event);
      if (!auth.ok) return auth.response;

      await expireTimedOutRequests(sql);

      const status =
        event.queryStringParameters && event.queryStringParameters.status
          ? event.queryStringParameters.status
          : null;

      let rows;
      if (status === "pending") {
        rows = await sql`
          SELECT id, name, reason, status, decline_reason, urgent, created_at, resolved_at
          FROM visitor_requests
          WHERE status = 'pending'
          ORDER BY urgent DESC, created_at ASC
        `;
      } else if (status === "recent") {
        rows = await sql`
          SELECT id, name, reason, status, decline_reason, urgent, created_at, resolved_at
          FROM visitor_requests
          WHERE status = 'pending'
             OR (
               status IN ('admitted', 'declined', 'timed_out')
               AND resolved_at > NOW() - INTERVAL '10 seconds'
             )
          ORDER BY urgent DESC, created_at DESC
          LIMIT 50
        `;
      } else {
        rows = await sql`
          SELECT id, name, reason, status, decline_reason, urgent, created_at, resolved_at
          FROM visitor_requests
          WHERE status = 'pending'
             OR (
               status IN ('admitted', 'declined')
               AND resolved_at > NOW() - INTERVAL '10 seconds'
             )
          ORDER BY
            CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
            urgent DESC,
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
