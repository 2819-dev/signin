const { getSql, json } = require("./lib/db");
const {
  ensureSynkCoreTables,
  consumePass,
  requireSynkApp,
  verifySignedClaims,
  clientIp,
  logSynkEvent,
} = require("./lib/synk");
const { signedPhotoUrl } = require("./lib/synk-admin-auth");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON" });
    }

    const sql = getSql();
    await ensureSynkCoreTables(sql);

    const appAuth = await requireSynkApp(sql, event, body);
    if (!appAuth.ok) {
      return json(401, { error: appAuth.error || "Unauthorized" });
    }

    const token = String(body.pass || body.token || body.passToken || "").trim();
    const assertion = String(body.assertion || "").trim();
    const singleUse = body.singleUse !== false;

    let result = null;
    if (token) {
      result = await consumePass(sql, token, {
        appSlug: body.enforceApp === true ? appAuth.app.slug : null,
        singleUse,
      });
    } else if (assertion) {
      const claims = verifySignedClaims(assertion);
      if (!claims || claims.typ !== "synk_pass") {
        return json(401, { error: "Invalid Synk assertion" });
      }
      const rows = await sql`
        SELECT id, synk_code, name, photo_url, policy, enabled
        FROM synk_profiles
        WHERE id = ${claims.pid}
        LIMIT 1
      `;
      if (!rows[0] || rows[0].enabled === false) {
        return json(401, { error: "Invalid Synk assertion" });
      }
      result = {
        ok: true,
        pass: {
          id: claims.passId || null,
          appSlug: claims.app,
          purpose: claims.purpose,
          expiresAt: new Date(Number(claims.exp)).toISOString(),
        },
        profile: {
          id: rows[0].id,
          synkCode: rows[0].synk_code,
          name: rows[0].name,
          photoUrl: signedPhotoUrl(rows[0].photo_url || ""),
          policy: rows[0].policy || "pending",
        },
      };
    } else {
      return json(400, { error: "Pass or assertion required" });
    }

    if (result.ok && result.profile) {
      result.profile.photoUrl = signedPhotoUrl(result.profile.photoUrl || "");
    }

    if (!result.ok) {
      await logSynkEvent(sql, {
        eventType: "pass_reject",
        appSlug: appAuth.app.slug,
        ip: clientIp(event),
        detail: result.error || "reject",
      });
      return json(401, { error: result.error || "Invalid Synk pass" });
    }

    await logSynkEvent(sql, {
      eventType: "pass_ok",
      profileId: result.profile.id,
      appSlug: appAuth.app.slug,
      ip: clientIp(event),
      detail: singleUse ? "consumed" : "checked",
    });

    return json(200, {
      ok: true,
      product: "synk",
      app: appAuth.app,
      profile: result.profile,
      pass: result.pass,
    });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
