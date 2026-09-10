"use strict";

const { getSql, json } = require("./lib/db");
const {
  authConfigured,
  loginWithPasswordAndTotp,
} = require("./lib/synk-admin-auth");
const { ensureSynkCoreTables, logSynkEvent, clientIp } = require("./lib/synk");

function requestIp(event) {
  try {
    return clientIp(event) || "";
  } catch {
    const headers = event.headers || {};
    const forwarded = headers["x-forwarded-for"] || "";
    return (
      headers["x-nf-client-connection-ip"] ||
      String(forwarded).split(",")[0].trim() ||
      ""
    );
  }
}

function userAgent(event) {
  const headers = event.headers || {};
  return headers["user-agent"] || headers["User-Agent"] || "";
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    if (!authConfigured()) {
      return json(500, {
        error:
          "Synk Admin login is not configured. Set SYNK_ADMIN_USERNAME, SYNK_ADMIN_PASSWORD_HASH, SYNK_ADMIN_TOTP_SECRET, and SYNK_ADMIN_SESSION_SECRET.",
      });
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON" });
    }

    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const totp = String(body.totp || body.code || body.otp || "").trim();
    const remember = body.remember !== false && body.staySignedIn !== false;
    if (!username || !password || !totp) {
      return json(400, { error: "Username, password, and 2FA code are required" });
    }

    const sql = getSql();
    await ensureSynkCoreTables(sql);
    const ip = requestIp(event);

    if (ip) {
      const recent = await sql`
        SELECT COUNT(*)::int AS n
        FROM synk_events
        WHERE event_type = 'admin_login_fail'
          AND ip = ${ip}
          AND created_at > NOW() - INTERVAL '15 minutes'
      `;
      if ((recent[0]?.n || 0) >= 12) {
        return json(429, { error: "Too many failed login attempts. Try again later." });
      }
    }

    try {
      const session = await loginWithPasswordAndTotp(sql, {
        username,
        password,
        totp,
        ip,
        userAgent: userAgent(event),
        remember,
      });
      await logSynkEvent(sql, {
        eventType: "admin_login_ok",
        ip,
        detail: username,
      });
      return json(200, {
        ok: true,
        token: session.token,
        expiresAt: session.expiresAt,
        expiresIn: session.expiresIn,
        idleTimeoutSec: session.idleTimeoutSec,
        sessionId: session.sessionId,
        remember: session.remember,
      });
    } catch (err) {
      await logSynkEvent(sql, {
        eventType: "admin_login_fail",
        ip,
        detail: username || "unknown",
      });
      return json(err.statusCode || 401, { error: err.message || "Unauthorized" });
    }
  } catch (err) {
    console.error("synk-admin-login error:", err);
    return json(500, { error: "Server error" });
  }
};
