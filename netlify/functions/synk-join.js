"use strict";

const { randomUUID } = require("crypto");
const { getStore, connectLambda } = require("@netlify/blobs");
const { getSql, json, requireSynkAdmin } = require("./lib/db");
const {
  ensureSynkCoreTables,
  logSynkEvent,
  clientIp,
  hashSecret,
  generateSynkCode,
} = require("./lib/synk");
const { signedPhotoUrl } = require("./lib/synk-admin-auth");
const { sendEmail, normalizeEmail } = require("./lib/email");

const MAX_BYTES = 3.5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseJsonBody(event) {
  let raw = event && event.body != null ? event.body : "{}";
  if (event && event.isBase64Encoded) {
    try {
      raw = Buffer.from(String(raw), "base64").toString("utf8");
    } catch {
      const err = new Error("Invalid JSON");
      err.statusCode = 400;
      throw err;
    }
  }
  if (typeof raw !== "string") {
    // Some runtimes may already parse JSON bodies.
    if (raw && typeof raw === "object") return raw;
    raw = String(raw || "{}");
  }
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    const err = new Error("Invalid JSON");
    err.statusCode = 400;
    throw err;
  }
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

function normalizeDob(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  if (year < 1900 || year > new Date().getUTCFullYear()) return null;
  return raw;
}

function normalizeSecret(value) {
  return String(value || "").trim();
}

function normalizeNote(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 300);
}

function normalizeDescriptor(value) {
  if (!Array.isArray(value) || value.length < 64) return null;
  const nums = value.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (nums.length < 64 || nums.length > 512) return null;
  return nums;
}

function toDobString(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : raw.slice(0, 10);
}

function descriptorSqlValue(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value);
}

function mapRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email || "",
    dateOfBirth: toDobString(row.date_of_birth),
    photoUrl: signedPhotoUrl(row.photo_url || ""),
    note: row.note || "",
    status: row.status || "pending",
    hasSecret: Boolean(row.secret_hash),
    hasBiometrics: row.descriptor != null,
    profileId: row.profile_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
  };
}

async function uniqueSynkCode(sql) {
  for (let i = 0; i < 12; i += 1) {
    const code = generateSynkCode();
    const rows = await sql`SELECT id FROM synk_profiles WHERE synk_code = ${code} LIMIT 1`;
    if (!rows[0]) return code;
  }
  throw new Error("Could not allocate Synk ID");
}

async function saveJoinPhoto(event, body) {
  const contentType = String(body.contentType || body.photoContentType || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
  if (!ALLOWED.has(contentType)) {
    const err = new Error("Use a JPG, PNG, or WebP face photo");
    err.statusCode = 400;
    throw err;
  }
  const raw = String(body.photoData || body.data || "");
  const base64 = raw.includes(",") ? raw.split(",").pop() : raw;
  if (!base64) {
    const err = new Error("Face photo is required");
    err.statusCode = 400;
    throw err;
  }
  let buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    const err = new Error("Could not read face photo");
    err.statusCode = 400;
    throw err;
  }
  if (!buffer.length) {
    const err = new Error("Could not read face photo");
    err.statusCode = 400;
    throw err;
  }
  if (buffer.length > MAX_BYTES) {
    const err = new Error("Photo is too large (max about 3MB)");
    err.statusCode = 400;
    throw err;
  }

  connectLambda(event);
  const store = getStore("kiosk-media");
  const id = randomUUID();
  await store.set(`synk-${id}`, buffer, {
    metadata: {
      contentType,
      updatedAt: new Date().toISOString(),
      fileName: String(body.fileName || "join.jpg").slice(0, 120),
      source: "synk-join",
    },
  });
  return `/api/synk-image?id=${encodeURIComponent(id)}&v=${Date.now()}`;
}

async function notifyJoinDecision({ email, name, accepted, synkCode }) {
  if (!email) return { ok: false, skipped: true };
  if (accepted) {
    return sendEmail({
      to: email,
      subject: "Your Synk request was accepted",
      text:
        `Hi ${name || "there"},\n\n` +
        `Your Synk membership request was accepted.` +
        (synkCode ? ` Your Synk ID is ${synkCode}.` : "") +
        `\n\nYou can log in at https://synkid.netlify.app/verify\n\n— Synk\n`,
      html:
        `<p>Hi ${name || "there"},</p>` +
        `<p>Your Synk membership request was <strong>accepted</strong>.` +
        (synkCode ? ` Your Synk ID is <strong>${synkCode}</strong>.` : "") +
        `</p><p><a href="https://synkid.netlify.app/verify">Log in to Synk</a></p><p>— Synk</p>`,
    });
  }
  return sendEmail({
    to: email,
    subject: "Your Synk request was declined",
    text:
      `Hi ${name || "there"},\n\n` +
      `Your Synk membership request was declined.\n\n— Synk\n`,
    html:
      `<p>Hi ${name || "there"},</p>` +
      `<p>Your Synk membership request was <strong>declined</strong>.</p>` +
      `<p>— Synk</p>`,
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(204, {});

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);
    let ip = "";
    try {
      ip = clientIp(event) || "";
    } catch {
      ip = "";
    }

    if (event.httpMethod === "GET") {
      const auth = await requireSynkAdmin(event);
      if (!auth.ok) return auth.response;
      const q = event.queryStringParameters || {};
      const status = String(q.status || "").trim().toLowerCase();
      const limit = Math.min(100, Math.max(1, Number(q.limit) || 50));
      const rows = status
        ? await sql`
            SELECT *
            FROM synk_join_requests
            WHERE status = ${status}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT *
            FROM synk_join_requests
            ORDER BY
              CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
              created_at DESC
            LIMIT ${limit}
          `;
      return json(200, {
        requests: rows.map(mapRequest),
        pendingCount: rows.filter((r) => r.status === "pending").length,
      });
    }

    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    let body;
    try {
      body = parseJsonBody(event);
    } catch (err) {
      return json(400, { error: err.message || "Invalid JSON" });
    }

    const action = String(body.action || "create").trim().toLowerCase();

    if (action === "create" || action === "submit") {
      if (ip) {
        const recent = await sql`
          SELECT COUNT(*)::int AS n
          FROM synk_join_requests
          WHERE ip = ${ip}
            AND created_at > NOW() - INTERVAL '1 hour'
        `;
        if ((recent[0]?.n || 0) >= 8) {
          return json(429, { error: "Too many join requests from this network. Try again later." });
        }
      }

      const name = normalizeName(body.name);
      const email = normalizeEmail(body.email);
      const dateOfBirth = normalizeDob(body.dateOfBirth || body.dob);
      const secret = normalizeSecret(body.secret);
      const note = normalizeNote(body.note || body.reason);
      const descriptor = normalizeDescriptor(body.descriptor);

      if (!name) return json(400, { error: "Name is required" });
      if (!email) return json(400, { error: "A valid email is required" });
      if (!dateOfBirth) return json(400, { error: "Date of birth is required" });
      if (!descriptor) return json(400, { error: "A clear face photo is required" });
      if (secret && secret.length < 4) {
        return json(400, { error: "Backup secret must be at least 4 characters" });
      }
      if (secret.length > 200) return json(400, { error: "Backup secret is too long" });

      const photoUrl = await saveJoinPhoto(event, body);
      const secretHash = secret ? hashSecret(secret) : null;
      const rows = await sql`
        INSERT INTO synk_join_requests (
          name, email, date_of_birth, secret_hash, photo_url, descriptor, note, status, ip
        )
        VALUES (
          ${name},
          ${email},
          ${dateOfBirth}::date,
          ${secretHash},
          ${photoUrl},
          ${descriptorSqlValue(descriptor)}::jsonb,
          ${note},
          'pending',
          ${ip || null}
        )
        RETURNING *
      `;
      await logSynkEvent(sql, {
        eventType: "join_request_create",
        ip,
        detail: `${name}<${email}>`,
      });
      return json(201, {
        ok: true,
        request: {
          id: rows[0].id,
          status: "pending",
          email: rows[0].email || email,
          createdAt: rows[0].created_at,
        },
      });
    }

    const auth = await requireSynkAdmin(event);
    if (!auth.ok) return auth.response;

    const id = String(body.id || body.requestId || "").trim();
    if (!id) return json(400, { error: "id is required" });

    const existing = await sql`
      SELECT * FROM synk_join_requests WHERE id = ${id} LIMIT 1
    `;
    if (!existing[0]) return json(404, { error: "Join request not found" });
    const req = existing[0];
    if (req.status !== "pending") {
      return json(400, { error: `Request is already ${req.status}` });
    }

    if (action === "deny" || action === "reject" || action === "decline") {
      const rows = await sql`
        UPDATE synk_join_requests
        SET status = 'denied', reviewed_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      await logSynkEvent(sql, {
        eventType: "join_request_deny",
        ip,
        detail: req.name,
      });
      const mail = await notifyJoinDecision({
        email: req.email,
        name: req.name,
        accepted: false,
      });
      return json(200, {
        ok: true,
        request: mapRequest(rows[0]),
        email: mail,
      });
    }

    if (action === "approve" || action === "accept") {
      const synkCode = await uniqueSynkCode(sql);
      const policy = ["pending", "autofill", "auto_admit", "auto_deny"].includes(body.policy)
        ? body.policy
        : "pending";
      const email = normalizeEmail(req.email) || "";
      const profileRows = await sql`
        INSERT INTO synk_profiles (
          synk_code, name, email, date_of_birth, secret_hash, photo_url, descriptor, policy, enabled
        )
        VALUES (
          ${synkCode},
          ${req.name},
          ${email},
          ${toDobString(req.date_of_birth)}::date,
          ${req.secret_hash},
          ${req.photo_url || ""},
          ${descriptorSqlValue(req.descriptor)}::jsonb,
          ${policy},
          TRUE
        )
        RETURNING id, synk_code, name, email, date_of_birth, photo_url, policy, enabled, created_at, updated_at
      `;
      const profile = profileRows[0];
      const rows = await sql`
        UPDATE synk_join_requests
        SET status = 'approved',
            reviewed_at = NOW(),
            updated_at = NOW(),
            profile_id = ${profile.id}
        WHERE id = ${id}
        RETURNING *
      `;
      await logSynkEvent(sql, {
        eventType: "join_request_approve",
        profileId: profile.id,
        ip,
        detail: profile.synk_code,
      });
      const mail = await notifyJoinDecision({
        email: profile.email || email,
        name: profile.name,
        accepted: true,
        synkCode: profile.synk_code,
      });
      return json(200, {
        ok: true,
        request: mapRequest(rows[0]),
        profile: {
          id: profile.id,
          synkCode: profile.synk_code,
          name: profile.name,
          email: profile.email || email,
          dateOfBirth: toDobString(profile.date_of_birth),
          policy: profile.policy,
          enabled: profile.enabled !== false,
        },
        email: mail,
      });
    }

    return json(400, { error: "Unknown action" });
  } catch (err) {
    console.error("synk-join error:", err);
    return json(err.statusCode || 500, { error: err.message || "Server error" });
  }
};
