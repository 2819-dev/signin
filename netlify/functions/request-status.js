const { getSql, json, mapRow } = require("./lib/db");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const id =
      (event.queryStringParameters && event.queryStringParameters.id) ||
      (event.path || "").split("/").filter(Boolean).pop();

    if (!id || id === "request-status") {
      return json(400, { error: "Request id is required" });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT id, name, reason, status, decline_reason, created_at, resolved_at
      FROM visitor_requests
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!rows.length) {
      return json(404, { error: "Not found" });
    }

    return json(200, { request: mapRow(rows[0]) });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
