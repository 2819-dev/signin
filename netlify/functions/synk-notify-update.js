"use strict";

const { getSql, json, requireAdmin } = require("./lib/db");
const { ensureSynkCoreTables, broadcastAppUpdate } = require("./lib/synk");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const gate = requireAdmin(event);
  if (!gate.ok) return gate.response;

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (_) {
    return json(400, { error: "Invalid JSON" });
  }

  const version = String(body.version || body.v || "").trim();
  if (!version) return json(400, { error: "version required" });

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);
    const result = await broadcastAppUpdate(sql, {
      version,
      body: body.body || body.message || undefined,
    });
    if (!result.ok) return json(400, { error: result.error || "Broadcast failed" });
    return json(200, result);
  } catch (err) {
    console.error("synk-notify-update failed", err);
    return json(500, { error: err.message || "Broadcast failed" });
  }
};
