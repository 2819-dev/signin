"use strict";

const { getSql, json, requireSynkAdmin } = require("./lib/db");

function mapMessage(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    sender: row.sender,
    body: row.body,
    createdAt: row.created_at,
  };
}

async function ensureSynkChatTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS synk_chat_sessions (
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
    CREATE TABLE IF NOT EXISTS synk_chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES synk_chat_sessions(id) ON DELETE CASCADE,
      sender TEXT NOT NULL CHECK (sender IN ('visitor', 'admin', 'system')),
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON" });
    }

    const sessionId = String(body.sessionId || "").trim();
    const text = String(body.body || "").trim().slice(0, 1000);
    let sender = body.sender === "admin" ? "admin" : "visitor";

    if (!sessionId) return json(400, { error: "sessionId is required" });
    if (!text) return json(400, { error: "Message is required" });

    if (sender === "admin") {
      const auth = await requireSynkAdmin(event);
      if (!auth.ok) return auth.response;
    }

    const sql = getSql();
    await ensureSynkChatTables(sql);

    const sessions = await sql`
      SELECT id, status, visitor_name
      FROM synk_chat_sessions
      WHERE id = ${sessionId}
      LIMIT 1
    `;
    if (!sessions[0]) return json(404, { error: "Chat not found" });
    if (sessions[0].status === "closed" && sender === "visitor") {
      return json(403, { error: "This chat is closed" });
    }
    if (sender === "visitor" && !(sessions[0].visitor_name || "").trim()) {
      return json(400, { error: "Enter your name before messaging" });
    }

    const rows = await sql`
      INSERT INTO synk_chat_messages (session_id, sender, body)
      VALUES (${sessionId}, ${sender}, ${text})
      RETURNING id, session_id, sender, body, created_at
    `;

    if (sender === "visitor") {
      await sql`
        UPDATE synk_chat_sessions
        SET updated_at = NOW(),
            last_message_at = NOW(),
            last_visitor_message_at = NOW(),
            status = 'open',
            closed_at = NULL
        WHERE id = ${sessionId}
      `;
    } else {
      await sql`
        UPDATE synk_chat_sessions
        SET updated_at = NOW(),
            last_message_at = NOW(),
            status = 'open',
            closed_at = NULL
        WHERE id = ${sessionId}
      `;
    }

    return json(200, { message: mapMessage(rows[0]) });
  } catch (err) {
    console.error("synk-chat-message error:", err);
    return json(500, { error: "Server error" });
  }
};
