const { getSql, json, requireAdmin } = require("./lib/db");

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function mapSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    visitorName: row.visitor_name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    lastVisitorMessageAt: row.last_visitor_message_at || null,
    closedAt: row.closed_at || null,
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
      visitor_name TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_visitor_message_at TIMESTAMPTZ,
      closed_at TIMESTAMPTZ
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
  await sql`ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS visitor_name TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ`;
  await sql`CREATE INDEX IF NOT EXISTS chat_sessions_status_updated_idx ON chat_sessions (status, last_message_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS chat_sessions_closed_at_idx ON chat_sessions (status, closed_at)`;
  await sql`CREATE INDEX IF NOT EXISTS chat_messages_session_created_idx ON chat_messages (session_id, created_at ASC)`;
}

async function purgeOldClosedChats(sql) {
  await sql`
    DELETE FROM chat_sessions
    WHERE status = 'closed'
      AND COALESCE(closed_at, updated_at) < NOW() - INTERVAL '5 minutes'
  `;
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

async function getSessionRow(sql, id) {
  const sessionRows = await sql`
    SELECT
      id,
      status,
      visitor_name,
      created_at,
      updated_at,
      last_message_at,
      last_visitor_message_at,
      closed_at
    FROM chat_sessions
    WHERE id = ${id}
    LIMIT 1
  `;
  return sessionRows[0] || null;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  try {
    const sql = getSql();
    await ensureChatTables(sql);
    await purgeOldClosedChats(sql);

    if (event.httpMethod === "POST") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      const name = normalizeName(body.name);
      if (!name) {
        return json(400, { error: "Name is required" });
      }

      const rows = await sql`
        INSERT INTO chat_sessions (id, visitor_name)
        VALUES (gen_random_uuid(), ${name})
        RETURNING
          id,
          status,
          visitor_name,
          created_at,
          updated_at,
          last_message_at,
          last_visitor_message_at,
          closed_at
      `;
      const session = mapSession(rows[0]);

      await sql`
        INSERT INTO chat_messages (session_id, sender, body)
        VALUES (
          ${session.id},
          'system',
          ${`Hi ${name} — message us here and someone will reply soon.`}
        )
      `;

      const messages = await getSessionMessages(sql, session.id);
      return json(200, { session, messages });
    }

    if (event.httpMethod === "GET") {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) {
        const auth = requireAdmin(event);
        if (!auth.ok) return auth.response;

        const rows = await sql`
          SELECT
            s.id,
            s.status,
            s.visitor_name,
            s.created_at,
            s.updated_at,
            s.last_message_at,
            s.last_visitor_message_at,
            s.closed_at,
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
             OR (
               s.status = 'closed'
               AND COALESCE(s.closed_at, s.updated_at) > NOW() - INTERVAL '5 minutes'
             )
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

      const sessionRow = await getSessionRow(sql, id);
      if (!sessionRow) {
        return json(404, { error: "Chat not found" });
      }

      // Hide chats that were closed long enough to be purged.
      if (
        sessionRow.status === "closed" &&
        sessionRow.closed_at &&
        new Date(sessionRow.closed_at).getTime() < Date.now() - 5 * 60 * 1000
      ) {
        return json(404, { error: "Chat not found" });
      }

      const messages = await getSessionMessages(sql, id);
      return json(200, {
        session: mapSession(sessionRow),
        messages,
      });
    }

    if (event.httpMethod === "PATCH") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      const id = body.id;
      if (!id) return json(400, { error: "id is required" });

      // Visitor can set name once if missing.
      if (typeof body.name === "string" && body.status == null) {
        const name = normalizeName(body.name);
        if (!name) return json(400, { error: "Name is required" });

        const existing = await getSessionRow(sql, id);
        if (!existing) return json(404, { error: "Chat not found" });
        if (existing.visitor_name) {
          return json(200, { session: mapSession(existing) });
        }

        const rows = await sql`
          UPDATE chat_sessions
          SET visitor_name = ${name}, updated_at = NOW()
          WHERE id = ${id}
            AND (visitor_name IS NULL OR visitor_name = '')
          RETURNING
            id,
            status,
            visitor_name,
            created_at,
            updated_at,
            last_message_at,
            last_visitor_message_at,
            closed_at
        `;
        if (!rows[0]) {
          const again = await getSessionRow(sql, id);
          return json(200, { session: mapSession(again) });
        }
        return json(200, { session: mapSession(rows[0]) });
      }

      const auth = requireAdmin(event);
      if (!auth.ok) return auth.response;

      const status = body.status === "closed" ? "closed" : body.status === "open" ? "open" : null;
      if (!status) {
        return json(400, { error: "id and status are required" });
      }

      const rows =
        status === "closed"
          ? await sql`
              UPDATE chat_sessions
              SET status = 'closed',
                  closed_at = NOW(),
                  updated_at = NOW()
              WHERE id = ${id}
              RETURNING
                id,
                status,
                visitor_name,
                created_at,
                updated_at,
                last_message_at,
                last_visitor_message_at,
                closed_at
            `
          : await sql`
              UPDATE chat_sessions
              SET status = 'open',
                  closed_at = NULL,
                  updated_at = NOW()
              WHERE id = ${id}
              RETURNING
                id,
                status,
                visitor_name,
                created_at,
                updated_at,
                last_message_at,
                last_visitor_message_at,
                closed_at
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
