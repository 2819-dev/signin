"use strict";

const { getSql, json, requireSynkAdmin } = require("./lib/db");
const {
  listAdmins,
  createAdminUser,
  setAdminEnabled,
  changeAdminPassword,
  deleteAdminUser,
  ensureAdminSessionTables,
} = require("./lib/synk-admin-auth");
const { ensureSynkCoreTables, logSynkEvent, clientIp } = require("./lib/synk");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});

  const auth = await requireSynkAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);
    await ensureAdminSessionTables(sql);
    const actor = auth.claims.sub || "";
    const ip = (() => {
      try {
        return clientIp(event);
      } catch {
        return "";
      }
    })();

    if (event.httpMethod === "GET") {
      const admins = await listAdmins(sql);
      return json(200, { username: actor, admins });
    }

    if (event.httpMethod !== "POST" && event.httpMethod !== "PATCH" && event.httpMethod !== "DELETE") {
      return json(405, { error: "Method not allowed" });
    }

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON" });
    }
    const action = String(body.action || "").trim().toLowerCase();

    if (action === "change-password") {
      await changeAdminPassword(sql, {
        username: actor,
        currentPassword: body.currentPassword || body.password || "",
        newPassword: body.newPassword || body.nextPassword || "",
        totp: body.totp || body.code || "",
      });
      await logSynkEvent(sql, { eventType: "admin_password_change", ip, detail: actor });
      return json(200, { ok: true });
    }

    if (action === "create" || action === "add") {
      const created = await createAdminUser(sql, {
        username: body.username,
        password: body.password,
      });
      await logSynkEvent(sql, {
        eventType: "admin_user_create",
        ip,
        detail: created.admin.username,
      });
      return json(201, {
        ok: true,
        admin: created.admin,
        totpSecret: created.totpSecret,
        otpauthUrl: created.otpauthUrl,
      });
    }

    if (action === "enable" || action === "disable" || action === "set-enabled") {
      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id is required" });
      const enabled =
        action === "enable" ? true : action === "disable" ? false : body.enabled !== false;
      const admin = await setAdminEnabled(sql, { id, enabled });
      await logSynkEvent(sql, {
        eventType: enabled ? "admin_user_enable" : "admin_user_disable",
        ip,
        detail: admin.username,
      });
      return json(200, { ok: true, admin });
    }

    if (action === "delete" || action === "remove") {
      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id is required" });
      await deleteAdminUser(sql, { id, actorUsername: actor });
      await logSynkEvent(sql, { eventType: "admin_user_delete", ip, detail: id });
      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("synk-admin-users error:", err);
    return json(err.statusCode || 500, { error: err.message || "Server error" });
  }
};
