"use strict";

const { getSql, json, requireSynkAdmin } = require("./lib/db");
const {
  ensureSynkCoreTables,
  createAdminActAsHandoff,
  claimAdminActAsHandoff,
} = require("./lib/synk");

function synkIdOriginFromEvent(event) {
  const fromEnv = String(process.env.SYNK_ID_ORIGIN || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://synkid.netlify.app";
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);

    let body = {};
    if (event.httpMethod !== "GET") {
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }
    }

    const action = String(
      body.action ||
        (event.queryStringParameters && event.queryStringParameters.action) ||
        ""
    )
      .trim()
      .toLowerCase();

    // Public one-time claim (opened from Synk ID).
    if (event.httpMethod === "POST" && (action === "claim" || action === "redeem")) {
      try {
        const claimed = await claimAdminActAsHandoff(sql, {
          token: body.token || body.handoffToken || body.code,
        });
        return json(200, {
          ok: true,
          profile: claimed.profile,
          hubSession: claimed.hubSession,
          actAs: claimed.actAs,
          nextPath: claimed.nextPath,
          expiresAt: claimed.expiresAt,
        });
      } catch (err) {
        const code = err && err.code;
        const status =
          code === "BAD_TOKEN" || code === "USED" || code === "EXPIRED"
            ? 400
            : code === "DISABLED"
              ? 403
              : 400;
        return json(status, { error: err.message || "Could not claim act-as link" });
      }
    }

    // Admin-only: start acting as a member.
    if (event.httpMethod === "POST" && (action === "start" || action === "create" || !action)) {
      const auth = await requireSynkAdmin(event);
      if (!auth.ok) return auth.response;

      const profileId = String(body.profileId || body.id || "").trim();
      if (!profileId) return json(400, { error: "Select a member first" });

      try {
        const handoff = await createAdminActAsHandoff(sql, {
          profileId,
          adminUsername: (auth.claims && (auth.claims.sub || auth.claims.username)) || "",
          nextPath: body.nextPath || body.next || "/hub",
          synkIdOrigin: body.synkIdOrigin || body.origin || synkIdOriginFromEvent(event),
        });
        return json(200, {
          ok: true,
          url: handoff.url,
          expiresAt: handoff.expiresAt,
          handoffExpiresAt: handoff.handoffExpiresAt,
          profile: handoff.profile,
          nextPath: handoff.nextPath,
        });
      } catch (err) {
        const code = err && err.code;
        const status = code === "NOT_FOUND" ? 404 : code === "DISABLED" ? 403 : 400;
        return json(status, { error: err.message || "Could not start act-as session" });
      }
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("synk-admin-act-as error:", err);
    return json(500, { error: "Server error" });
  }
};
