const { getSql, json, requireAdmin } = require("./lib/db");

const DEFAULTS = {
  isOpen: true,
  closedTitle: "Closed",
  closedMessage: "Not accepting visitors right now.",
};

function mapSettings(row) {
  if (!row) return { ...DEFAULTS };
  return {
    isOpen: Boolean(row.is_open),
    closedTitle: row.closed_title || DEFAULTS.closedTitle,
    closedMessage: row.closed_message || DEFAULTS.closedMessage,
    updatedAt: row.updated_at || null,
  };
}

async function ensureSettings(sql) {
  await sql`
    INSERT INTO kiosk_settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `;
  const rows = await sql`
    SELECT is_open, closed_title, closed_message, updated_at
    FROM kiosk_settings
    WHERE id = 1
    LIMIT 1
  `;
  return mapSettings(rows[0]);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  try {
    const sql = getSql();

    if (event.httpMethod === "GET") {
      const settings = await ensureSettings(sql);
      return json(200, { settings });
    }

    if (event.httpMethod === "POST") {
      const auth = requireAdmin(event);
      if (!auth.ok) return auth.response;

      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      await ensureSettings(sql);
      const current = await ensureSettings(sql);

      const isOpen =
        typeof body.isOpen === "boolean" ? body.isOpen : current.isOpen;
      const closedTitle = (
        typeof body.closedTitle === "string"
          ? body.closedTitle
          : current.closedTitle
      )
        .trim()
        .slice(0, 80);
      const closedMessage = (
        typeof body.closedMessage === "string"
          ? body.closedMessage
          : current.closedMessage
      )
        .trim()
        .slice(0, 500);

      if (!closedTitle) {
        return json(400, { error: "Closed title is required" });
      }
      if (!closedMessage) {
        return json(400, { error: "Closed message is required" });
      }

      const rows = await sql`
        UPDATE kiosk_settings
        SET is_open = ${isOpen},
            closed_title = ${closedTitle},
            closed_message = ${closedMessage},
            updated_at = NOW()
        WHERE id = 1
        RETURNING is_open, closed_title, closed_message, updated_at
      `;

      return json(200, { settings: mapSettings(rows[0]) });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
