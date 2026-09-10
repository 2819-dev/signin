"use strict";

const { getSql, json, requireSynkAdmin } = require("./lib/db");
const {
  listSessions,
  revokeSession,
  expectedUsername,
} = require("./lib/synk-admin-auth");
const { ensureSynkCoreTables, logSynkEvent, clientIp } = require("./lib/synk");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});

  const auth = await requireSynkAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);
    const username = auth.claims.sub || expectedUsername();

    if (event.httpMethod === "GET") {
      const sessions = await listSessions(sql, username);
      const marked = sessions.map((s) => ({
        ...s,
        current: String(s.id) === String(auth.claims.sid),
      }));
      return json(200, {
        username,
        sessionId: auth.claims.sid,
        expiresAt: null,
        idleTimeoutSec: 0,
        sessionTtlSec: null,
        persistent: true,
        sessions: marked,
      });
    }

    if (event.httpMethod === "POST" || event.httpMethod === "DELETE") {
      let body = {};
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        body = {};
      }
      const action = String(body.action || event.queryStringParameters?.action || "logout");
      const ip = (() => {
        try {
          return clientIp(event);
        } catch {
          return "";
        }
      })();

      if (action === "logout") {
        await revokeSession(sql, { token: auth.token });
        await logSynkEvent(sql, { eventType: "admin_logout", ip, detail: username });
        return json(200, { ok: true });
      }

      if (action === "revoke" && body.sessionId) {
        await revokeSession(sql, { sessionId: String(body.sessionId) });
        await logSynkEvent(sql, {
          eventType: "admin_session_revoke",
          ip,
          detail: String(body.sessionId),
        });
        return json(200, { ok: true });
      }

      if (action === "revoke-all") {
        await revokeSession(sql, { username });
        await logSynkEvent(sql, { eventType: "admin_session_revoke_all", ip, detail: username });
        return json(200, { ok: true, revokedAll: true });
      }

      return json(400, { error: "Unknown action" });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("synk-admin-session error:", err);
    return json(500, { error: "Server error" });
  }
};
