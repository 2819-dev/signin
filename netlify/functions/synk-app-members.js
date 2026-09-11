"use strict";

const { getSql, json, requireAdmin } = require("./lib/db");
const {
  ensureSynkCoreTables,
  listRecentAppMembers,
  setMemberAppPolicy,
  normalizeVerifyAction,
} = require("./lib/synk");
const { requireBusinessSession } = require("./lib/synk-business-auth");

const VISITOR_APP_SLUG = "visitor-signin";

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 80);
}

function normalizeId(value) {
  return String(value || "").trim();
}

function parseBody(event) {
  if (!event.body) return {};
  let raw = event.body;
  if (event.isBase64Encoded) {
    raw = Buffer.from(raw, "base64").toString("utf8");
  }
  try {
    return JSON.parse(raw || "{}");
  } catch {
    const err = new Error("Invalid JSON");
    err.statusCode = 400;
    throw err;
  }
}

async function resolveAccess(event, sql, requestedSlug) {
  const admin = requireAdmin(event);
  if (admin.ok) {
    // Visitor Sign-In staff only manage members who used visitor-signin.
    return { ok: true, appSlug: VISITOR_APP_SLUG, via: "visitor-admin" };
  }

  const biz = await requireBusinessSession(sql, event);
  if (!biz.ok) {
    return {
      ok: false,
      response: json(biz.status || 401, { error: biz.error || "Unauthorized" }),
    };
  }

  const apps = await sql`
    SELECT slug
    FROM synk_apps
    WHERE business_id = ${biz.business.id}
      AND enabled = TRUE
    ORDER BY created_at ASC
  `;
  if (!apps.length) {
    return { ok: false, response: json(403, { error: "No Synk app linked to this business" }) };
  }

  const allowed = new Set(apps.map((row) => String(row.slug || "").toLowerCase()));
  let appSlug = normalizeSlug(requestedSlug);
  if (!appSlug) {
    appSlug = String(apps[0].slug || "").toLowerCase();
  }
  if (!allowed.has(appSlug)) {
    return { ok: false, response: json(403, { error: "That app is not linked to your business" }) };
  }

  return {
    ok: true,
    appSlug,
    via: "business",
    businessId: biz.business.id,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);

    if (event.httpMethod === "GET") {
      const qs = event.queryStringParameters || {};
      const access = await resolveAccess(event, sql, qs.appSlug || qs.app);
      if (!access.ok) return access.response;

      const listed = await listRecentAppMembers(sql, access.appSlug, {
        days: qs.days,
        limit: qs.limit,
      });

      return json(200, {
        ok: true,
        appSlug: listed.appSlug,
        appDefault: listed.appDefault,
        members: listed.members,
      });
    }

    if (event.httpMethod === "POST" || event.httpMethod === "PATCH") {
      let body;
      try {
        body = parseBody(event);
      } catch (err) {
        return json(err.statusCode || 400, { error: err.message || "Invalid JSON" });
      }

      const access = await resolveAccess(event, sql, body.appSlug || body.app);
      if (!access.ok) return access.response;

      const profileId = normalizeId(body.profileId || body.id || body.memberId);
      if (!profileId) {
        return json(400, { error: "Member is required" });
      }

      const result = await setMemberAppPolicy(sql, access.appSlug, profileId, body.policy);
      if (!result.ok) {
        return json(403, { error: result.error || "Could not update policy" });
      }

      return json(200, {
        ok: true,
        appSlug: access.appSlug,
        profileId,
        policy: normalizeVerifyAction(result.policy),
        hasOverride: Boolean(result.hasOverride),
      });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("synk-app-members error", err);
    return json(500, { error: "Server error" });
  }
};
