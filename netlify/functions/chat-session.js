const { getSql, json, requireAdmin } = require("./lib/db");

function mapSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    lastVisitorMessageAt: row.last_visitor_message_at || null,
  };
}

function mapMessage(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    sender: row.sender,
    body: row.body,
    createdAt: row.created_at,
  };
}

async function ensureChatTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_visitor_message_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      sender TEXT NOT NULL CHECK (sender IN ('visitor', 'admin', 'system')),
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS chat_sessions_status_updated_idx ON chat_sessions (status, last_message_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS chat_messages_session_created_idx ON chat_messages (session_id, created_at ASC)`;
}

async function getSessionMessages(sql, sessionId) {
  const rows = await sql`
    SELECT id, session_id, sender, body, created_at
    FROM chat_messages
    WHERE session_id = ${sessionId}
    ORDER BY created_at ASC
    LIMIT 200
  `;
  return rows.map(mapMessage);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  try {
    const sql = getSql();
    await ensureChatTables(sql);

    if (event.httpMethod === "POST") {
      const rows = await sql`
        INSERT INTO chat_sessions (id)
        VALUES (gen_random_uuid())
        RETURNING id, status, created_at, updated_at, last_message_at, last_visitor_message_at
      `;
      const session = mapSession(rows[0]);

      await sql`
        INSERT INTO chat_messages (session_id, sender, body)
        VALUES (
          ${session.id},
          'system',
          'Message us here and someone will reply soon.'
        )
      `;

      const messages = await getSessionMessages(sql, session.id);
      return json(200, { session, messages });
    }

    if (event.httpMethod === "GET") {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) {
        // Admin list
        const auth = requireAdmin(event);
        if (!auth.ok) return auth.response;

        const rows = await sql`
          SELECT
            s.id,
            s.status,
            s.created_at,
            s.updated_at,
            s.last_message_at,
            s.last_visitor_message_at,
            (
              SELECT body
              FROM chat_messages m
              WHERE m.session_id = s.id
              ORDER BY m.created_at DESC
              LIMIT 1
            ) AS last_body,
            (
              SELECT COUNT(*)::int
              FROM chat_messages m
              WHERE m.session_id = s.id AND m.sender = 'visitor'
            ) AS visitor_count
          FROM chat_sessions s
          WHERE s.status = 'open'
             OR s.last_message_at > NOW() - INTERVAL '2 hours'
          ORDER BY s.last_message_at DESC
          LIMIT 40
        `;

        return json(200, {
          sessions: rows.map((row) => ({
            ...mapSession(row),
            lastBody: row.last_body || "",
            visitorCount: row.visitor_count || 0,
          })),
        });
      }

      const sessionRows = await sql`
        SELECT id, status, created_at, updated_at, last_message_at, last_visitor_message_at
        FROM chat_sessions
        WHERE id = ${id}
        LIMIT 1
      `;
      if (!sessionRows[0]) {
        return json(404, { error: "Chat not found" });
      }

      const messages = await getSessionMessages(sql, id);
      return json(200, {
        session: mapSession(sessionRows[0]),
        messages,
      });
    }

    if (event.httpMethod === "PATCH") {
      const auth = requireAdmin(event);
      if (!auth.ok) return auth.response;

      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      const id = body.id;
      const status = body.status === "closed" ? "closed" : body.status === "open" ? "open" : null;
      if (!id || !status) {
        return json(400, { error: "id and status are required" });
      }

      const rows = await sql`
        UPDATE chat_sessions
        SET status = ${status}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, status, created_at, updated_at, last_message_at, last_visitor_message_at
      `;
      if (!rows[0]) return json(404, { error: "Chat not found" });
      return json(200, { session: mapSession(rows[0]) });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
