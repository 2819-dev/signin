"use strict";

const { getSql, json, requireSynkAdmin } = require("./lib/db");
const {
  ensureSynkCoreTables,
  listActivePasses,
  revokePass,
  logSynkEvent,
  clientIp,
} = require("./lib/synk");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});

  const auth = await requireSynkAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);
    const ip = (() => {
      try {
        return clientIp(event);
      } catch {
        return "";
      }
    })();

    if (event.httpMethod === "GET") {
      const q = event.queryStringParameters || {};
      const profileId = String(q.profileId || "").trim() || null;
      const limit = Number(q.limit) || 50;
      const passes = await listActivePasses(sql, { profileId, limit });
      const countRows = await sql`
        SELECT COUNT(*)::int AS n
        FROM synk_passes
        WHERE consumed_at IS NULL
          AND revoked_at IS NULL
          AND expires_at > NOW()
      `;
      return json(200, {
        passes,
        activeCount: countRows[0]?.n || 0,
      });
    }

    if (event.httpMethod === "POST" || event.httpMethod === "DELETE") {
      let body = {};
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        body = {};
      }
      const action = String(body.action || event.queryStringParameters?.action || "revoke");
      const passId = String(body.passId || body.id || event.queryStringParameters?.id || "").trim();
      const profileId = String(body.profileId || "").trim();

      if (action === "revoke" && passId) {
        const result = await revokePass(sql, { passId });
        if (!result.count) return json(404, { error: "Pass not found or already inactive" });
        await logSynkEvent(sql, {
          eventType: "admin_pass_revoke",
          profileId: result.profileId,
          ip,
          detail: passId,
        });
        return json(200, { ok: true, revoked: 1 });
      }

      if ((action === "revoke-member" || action === "revoke-profile") && profileId) {
        const result = await revokePass(sql, { profileId });
        await logSynkEvent(sql, {
          eventType: "admin_pass_revoke_member",
          profileId,
          ip,
          detail: `revoked=${result.count}`,
        });
        return json(200, { ok: true, revoked: result.count });
      }

      return json(400, { error: "Unknown action" });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("synk-passes error:", err);
    return json(500, { error: "Server error" });
  }
};
