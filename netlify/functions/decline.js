const { getSql, json, requireAdmin, mapRow } = require("./lib/db");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON" });
    }

    const id = (body.id || "").trim();
    const declineReason = (body.declineReason || "").trim();

    if (!id) {
      return json(400, { error: "Request id is required" });
    }
    if (!declineReason || declineReason.length > 500) {
      return json(400, { error: "Decline reason is required (max 500 characters)" });
    }

    const sql = getSql();
    const rows = await sql`
      UPDATE visitor_requests
      SET status = 'declined',
          decline_reason = ${declineReason},
          resolved_at = NOW()
      WHERE id = ${id} AND status = 'pending'
      RETURNING id, name, reason, status, decline_reason, created_at, resolved_at
    `;

    if (!rows.length) {
      return json(404, { error: "Pending request not found" });
    }

    return json(200, { request: mapRow(rows[0]) });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
