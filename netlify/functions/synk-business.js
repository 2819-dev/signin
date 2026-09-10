"use strict";

const { getSql, json, requireSynkAdmin } = require("./lib/db");
const {
  ensureSynkCoreTables,
  seedVisitorSignInBusiness,
  generateApiKey,
  hashSecret,
  verifySecret,
  logSynkEvent,
  normalizeVerifyAction,
  clientIp,
  normalizeCameraSide,
  generateDevicePairingCode,
  mapBusinessDevice,
  getAppSynkStatus,
} = require("./lib/synk");
const {
  createBusinessSession,
  requireBusinessSession,
  extractBusinessToken,
  verifyBusinessToken,
} = require("./lib/synk-business-auth");

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 160);
}

function normalizeNote(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function mapBusiness(row) {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name || "",
    email: row.email,
    status: row.status,
    note: row.note || "",
    hasPassword: Boolean(row.password_hash),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at || null,
  };
}

function mapApp(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    enabled: row.enabled !== false,
    verifyAction: normalizeVerifyAction(row.verify_action),
    businessId: row.business_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeDeviceName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function normalizePairingCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

async function listBusinessDevices(sql, businessId) {
  const rows = await sql`
    SELECT id, name, camera_side, pairing_code, created_at, updated_at, last_seen_at
    FROM synk_business_devices
    WHERE business_id = ${businessId}
    ORDER BY created_at ASC
  `;
  return rows.map(mapBusinessDevice);
}

async function createUniquePairingCode(sql) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateDevicePairingCode();
    const clash = await sql`
      SELECT id FROM synk_business_devices WHERE pairing_code = ${code} LIMIT 1
    `;
    if (!clash[0]) return code;
  }
  throw new Error("Could not allocate a pairing code");
}

function userAgent(event) {
  const headers = event.headers || {};
  return String(headers["user-agent"] || headers["User-Agent"] || "").slice(0, 240);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);

    let body = {};
    if (event.httpMethod !== "GET" && event.httpMethod !== "DELETE") {
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

    // Public: request a Synk Business account (API key path).
    if (event.httpMethod === "POST" && (action === "request" || action === "apply")) {
      const name = normalizeName(body.name || body.companyName);
      const contactName = normalizeName(body.contactName || body.contact);
      const email = normalizeEmail(body.email);
      const password = String(body.password || "").trim();
      const note = normalizeNote(body.note || body.useCase);
      if (!name) return json(400, { error: "Business name is required" });
      if (!email || !email.includes("@")) return json(400, { error: "A valid email is required" });
      if (password.length < 8) {
        return json(400, { error: "Password must be at least 8 characters" });
      }

      try {
        const rows = await sql`
          INSERT INTO synk_business_accounts (
            name, contact_name, email, password_hash, status, note
          )
          VALUES (
            ${name},
            ${contactName || name},
            ${email},
            ${hashSecret(password)},
            'pending',
            ${note}
          )
          RETURNING id, name, contact_name, email, password_hash, status, note, created_at, updated_at, reviewed_at
        `;
        await logSynkEvent(sql, {
          eventType: "business_request",
          ip: clientIp(event),
          detail: name,
        });
        return json(201, {
          ok: true,
          message: "Request submitted. Synk will review and approve API access.",
          business: mapBusiness(rows[0]),
        });
      } catch (err) {
        if (String(err.message || "").includes("unique") || err.code === "23505") {
          return json(409, { error: "A business account with that email already exists" });
        }
        throw err;
      }
    }

    // Public: business portal login.
    if (event.httpMethod === "POST" && action === "login") {
      const email = normalizeEmail(body.email);
      const password = String(body.password || "").trim();
      if (!email || !password) return json(400, { error: "Email and password are required" });
      const rows = await sql`
        SELECT id, name, contact_name, email, password_hash, status, note, created_at, updated_at, reviewed_at
        FROM synk_business_accounts
        WHERE LOWER(email) = ${email}
        LIMIT 1
      `;
      const row = rows[0];
      if (!row || !row.password_hash || !verifySecret(password, row.password_hash)) {
        await logSynkEvent(sql, {
          eventType: "business_login_fail",
          ip: clientIp(event),
          detail: email,
        });
        return json(401, { error: "Invalid email or password" });
      }
      if (row.status !== "approved") {
        return json(403, {
          error:
            row.status === "pending"
              ? "Your Synk Business account is still pending approval"
              : "This Synk Business account is not active",
        });
      }
      const session = await createBusinessSession(sql, {
        businessId: row.id,
        ip: clientIp(event),
        userAgent: userAgent(event),
      });
      await logSynkEvent(sql, {
        eventType: "business_login_ok",
        appSlug: null,
        ip: clientIp(event),
        detail: row.name,
      });
      return json(200, {
        ok: true,
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt,
        business: mapBusiness(row),
      });
    }

    // Public: look up a paired device's camera framing (used by kiosk tablets).
    if (event.httpMethod === "GET" && action === "device-config") {
      const code = normalizePairingCode(
        (event.queryStringParameters &&
          (event.queryStringParameters.code || event.queryStringParameters.pair)) ||
          ""
      );
      if (!code || code.length < 6) {
        return json(400, { error: "A valid device pairing code is required" });
      }
      const rows = await sql`
        SELECT d.id, d.name, d.camera_side, d.pairing_code, d.created_at, d.updated_at, d.last_seen_at,
               d.business_id,
               b.status AS business_status,
               b.name AS business_name
        FROM synk_business_devices d
        JOIN synk_business_accounts b ON b.id = d.business_id
        WHERE d.pairing_code = ${code}
        LIMIT 1
      `;
      const row = rows[0];
      if (!row || row.business_status !== "approved") {
        return json(404, { error: "Device not found" });
      }
      await sql`
        UPDATE synk_business_devices
        SET last_seen_at = NOW()
        WHERE id = ${row.id}
      `;
      return json(200, {
        ok: true,
        device: mapBusinessDevice(row),
        business: {
          id: row.business_id,
          name: row.business_name || "",
          status: row.business_status,
        },
      });
    }

    // Public: whether Sign in with Synk is enabled/paired for an app.
    if (event.httpMethod === "GET" && action === "app-status") {
      const appSlug = String(
        (event.queryStringParameters &&
          (event.queryStringParameters.app ||
            event.queryStringParameters.slug ||
            event.queryStringParameters.appSlug)) ||
          ""
      )
        .trim()
        .slice(0, 80);
      const status = await getAppSynkStatus(sql, appSlug);
      return json(status.ok ? 200 : 200, status);
    }

    // Business portal session routes (member-facing dashboard).
    const businessPortalActions = new Set([
      "logout",
      "rotate-key",
      "save-settings",
      "session",
      "create-device",
      "update-device",
      "delete-device",
      "pair-app",
    ]);
    // Only treat Authorization as a business session when the token is actually a
    // business JWT. Synk Admin also sends Bearer tokens on GET /synk-business.
    const bearerOrBusinessToken = extractBusinessToken(event);
    const verifiedBusinessToken = bearerOrBusinessToken
      ? verifyBusinessToken(bearerOrBusinessToken)
      : null;
    const wantsBusinessPortal =
      (event.httpMethod === "GET" && Boolean(verifiedBusinessToken)) ||
      (event.httpMethod === "POST" && businessPortalActions.has(action));

    if (wantsBusinessPortal) {
      const auth = await requireBusinessSession(sql, event);
      if (!auth.ok) return json(auth.status || 401, { error: auth.error || "Unauthorized" });

      if (event.httpMethod === "POST" && action === "logout") {
        await sql`
          UPDATE synk_business_sessions
          SET revoked_at = NOW()
          WHERE id = ${auth.sessionId}
        `;
        return json(200, { ok: true });
      }

      const apps = await sql`
        SELECT id, slug, name, enabled, verify_action, business_id, created_at, updated_at
        FROM synk_apps
        WHERE business_id = ${auth.business.id}
        ORDER BY created_at ASC
      `;

      if (event.httpMethod === "POST" && action === "rotate-key") {
        const appId = String(body.appId || body.id || "").trim();
        const app = apps.find((row) => String(row.id) === appId) || apps[0];
        if (!app) return json(404, { error: "No API app found for this business" });
        const apiKey = generateApiKey();
        const rows = await sql`
          UPDATE synk_apps
          SET api_key_hash = ${hashSecret(apiKey)}, updated_at = NOW()
          WHERE id = ${app.id} AND business_id = ${auth.business.id}
          RETURNING id, slug, name, enabled, verify_action, business_id, created_at, updated_at
        `;
        await logSynkEvent(sql, {
          eventType: "business_key_rotate",
          appSlug: rows[0].slug,
          ip: clientIp(event),
          detail: auth.business.name,
        });
        return json(200, { ok: true, app: mapApp(rows[0]), apiKey });
      }

      if (event.httpMethod === "POST" && action === "save-settings") {
        const appId = String(body.appId || body.id || "").trim();
        const app = apps.find((row) => String(row.id) === appId) || apps[0];
        if (!app) return json(404, { error: "No API app found for this business" });
        const verifyAction = normalizeVerifyAction(body.verifyAction || body.policy);
        const rows = await sql`
          UPDATE synk_apps
          SET verify_action = ${verifyAction}, updated_at = NOW()
          WHERE id = ${app.id} AND business_id = ${auth.business.id}
          RETURNING id, slug, name, enabled, verify_action, business_id, created_at, updated_at
        `;
        await logSynkEvent(sql, {
          eventType: "business_settings",
          appSlug: rows[0].slug,
          ip: clientIp(event),
          detail: verifyAction,
        });
        return json(200, { ok: true, app: mapApp(rows[0]) });
      }

      if (event.httpMethod === "POST" && action === "create-device") {
        const name = normalizeDeviceName(body.name || body.deviceName || "Front desk");
        if (!name) return json(400, { error: "Device name is required" });
        const cameraSide = normalizeCameraSide(body.cameraSide || body.camera);
        const pairingCode = await createUniquePairingCode(sql);
        const rows = await sql`
          INSERT INTO synk_business_devices (business_id, name, camera_side, pairing_code)
          VALUES (${auth.business.id}, ${name}, ${cameraSide}, ${pairingCode})
          RETURNING id, name, camera_side, pairing_code, created_at, updated_at, last_seen_at
        `;
        await logSynkEvent(sql, {
          eventType: "business_device_create",
          ip: clientIp(event),
          detail: `${name}:${pairingCode}`,
        });
        return json(201, { ok: true, device: mapBusinessDevice(rows[0]) });
      }

      
      if (event.httpMethod === "POST" && action === "pair-app") {
        const appSlug = String(body.appSlug || body.app || body.slug || "")
          .trim()
          .slice(0, 80);
        if (!appSlug) return json(400, { error: "appSlug is required" });

        const appRows = await sql`
          SELECT id, slug, name, enabled, business_id, verify_action
          FROM synk_apps
          WHERE slug = ${appSlug}
          LIMIT 1
        `;
        let app = appRows[0];
        if (!app) {
          // Create a lightweight app owned by this business so Sign in with Synk can turn on.
          const apiKey = generateApiKey();
          const inserted = await sql`
            INSERT INTO synk_apps (slug, name, api_key_hash, business_id, verify_action, enabled)
            VALUES (
              ${appSlug},
              ${body.appName ? String(body.appName).trim().slice(0, 120) : appSlug},
              ${hashSecret(apiKey)},
              ${auth.business.id},
              'pending',
              TRUE
            )
            RETURNING id, slug, name, enabled, business_id, verify_action
          `;
          app = inserted[0];
        } else if (app.business_id && app.business_id !== auth.business.id) {
          return json(409, {
            error: "This application is already paired with another Synk Business account",
            code: "owned_elsewhere",
          });
        } else if (!app.business_id) {
          const updated = await sql`
            UPDATE synk_apps
            SET business_id = ${auth.business.id},
                enabled = TRUE,
                updated_at = NOW()
            WHERE id = ${app.id}
            RETURNING id, slug, name, enabled, business_id, verify_action
          `;
          app = updated[0];
        } else if (app.enabled === false) {
          const updated = await sql`
            UPDATE synk_apps
            SET enabled = TRUE, updated_at = NOW()
            WHERE id = ${app.id}
            RETURNING id, slug, name, enabled, business_id, verify_action
          `;
          app = updated[0];
        }

        // Pair this installation/device so the tablet is linked to the business.
        const deviceName = String(body.deviceName || body.name || "Sign-in tablet")
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 80) || "Sign-in tablet";
        const cameraSide = normalizeCameraSide(body.cameraSide || body.camera || "left");
        const pairingCode = await createUniquePairingCode(sql);
        const deviceRows = await sql`
          INSERT INTO synk_business_devices (business_id, name, camera_side, pairing_code)
          VALUES (${auth.business.id}, ${deviceName}, ${cameraSide}, ${pairingCode})
          RETURNING id, name, camera_side, pairing_code, created_at, updated_at, last_seen_at
        `;

        await logSynkEvent(sql, {
          eventType: "business_pair_app",
          appSlug,
          ip: clientIp(event),
          detail: `${app.slug}:${pairingCode}`,
        });

        const status = await getAppSynkStatus(sql, appSlug);
        return json(200, {
          ok: true,
          app: status.app,
          business: status.business,
          device: mapBusinessDevice(deviceRows[0]),
          status,
        });
      }

      if (event.httpMethod === "POST" && action === "update-device") {
        const deviceId = String(body.deviceId || body.id || "").trim();
        if (!deviceId) return json(400, { error: "deviceId is required" });
        const existing = await sql`
          SELECT id, name, camera_side, pairing_code, created_at, updated_at, last_seen_at
          FROM synk_business_devices
          WHERE id = ${deviceId} AND business_id = ${auth.business.id}
          LIMIT 1
        `;
        if (!existing[0]) return json(404, { error: "Device not found" });
        const name =
          body.name != null || body.deviceName != null
            ? normalizeDeviceName(body.name || body.deviceName)
            : existing[0].name;
        if (!name) return json(400, { error: "Device name is required" });
        const cameraSide =
          body.cameraSide != null || body.camera != null
            ? normalizeCameraSide(body.cameraSide || body.camera)
            : normalizeCameraSide(existing[0].camera_side);
        const rows = await sql`
          UPDATE synk_business_devices
          SET name = ${name}, camera_side = ${cameraSide}, updated_at = NOW()
          WHERE id = ${deviceId} AND business_id = ${auth.business.id}
          RETURNING id, name, camera_side, pairing_code, created_at, updated_at, last_seen_at
        `;
        await logSynkEvent(sql, {
          eventType: "business_device_update",
          ip: clientIp(event),
          detail: `${name}:${cameraSide}`,
        });
        return json(200, { ok: true, device: mapBusinessDevice(rows[0]) });
      }

      if (event.httpMethod === "POST" && action === "delete-device") {
        const deviceId = String(body.deviceId || body.id || "").trim();
        if (!deviceId) return json(400, { error: "deviceId is required" });
        const rows = await sql`
          DELETE FROM synk_business_devices
          WHERE id = ${deviceId} AND business_id = ${auth.business.id}
          RETURNING id, name, pairing_code
        `;
        if (!rows[0]) return json(404, { error: "Device not found" });
        await logSynkEvent(sql, {
          eventType: "business_device_delete",
          ip: clientIp(event),
          detail: rows[0].name,
        });
        return json(200, { ok: true });
      }

      const devices = await listBusinessDevices(sql, auth.business.id);
      return json(200, {
        ok: true,
        business: auth.business,
        apps: apps.map(mapApp),
        devices,
      });
    }

    // Synk Admin: review business accounts.
    const admin = await requireSynkAdmin(event);
    if (!admin.ok) return admin.response;

    if (event.httpMethod === "GET") {
      await seedVisitorSignInBusiness(sql);
      const rows = await sql`
        SELECT id, name, contact_name, email, password_hash, status, note, created_at, updated_at, reviewed_at
        FROM synk_business_accounts
        ORDER BY
          CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
          created_at DESC
        LIMIT 200
      `;
      return json(200, { businesses: rows.map(mapBusiness) });
    }

    if (event.httpMethod === "POST" && action === "approve") {
      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id is required" });
      const existing = await sql`
        SELECT * FROM synk_business_accounts WHERE id = ${id} LIMIT 1
      `;
      if (!existing[0]) return json(404, { error: "Business request not found" });
      const biz = existing[0];
      if (biz.status === "denied") {
        return json(400, { error: "Denied requests cannot be approved" });
      }

      const password =
        typeof body.password === "string" && body.password.trim().length >= 8
          ? body.password.trim()
          : null;
      const updated = await sql`
        UPDATE synk_business_accounts
        SET
          status = 'approved',
          reviewed_at = NOW(),
          updated_at = NOW(),
          password_hash = COALESCE(${password ? hashSecret(password) : null}, password_hash)
        WHERE id = ${id}
        RETURNING id, name, contact_name, email, password_hash, status, note, created_at, updated_at, reviewed_at
      `;

      let apiKey = null;
      let app = null;
      const apps = await sql`
        SELECT id, slug, name, enabled, verify_action, business_id, created_at, updated_at
        FROM synk_apps
        WHERE business_id = ${id}
        ORDER BY created_at ASC
        LIMIT 1
      `;
      if (!apps[0]) {
        const slugBase = normalizeSlug(biz.name) || "business";
        let slug = slugBase;
        let attempt = 0;
        while (attempt < 8) {
          const clash = await sql`SELECT id FROM synk_apps WHERE slug = ${slug} LIMIT 1`;
          if (!clash[0]) break;
          attempt += 1;
          slug = `${slugBase}-${attempt + 1}`;
        }
        apiKey = generateApiKey();
        const created = await sql`
          INSERT INTO synk_apps (slug, name, api_key_hash, business_id, verify_action)
          VALUES (
            ${slug},
            ${biz.name},
            ${hashSecret(apiKey)},
            ${id},
            'pending'
          )
          RETURNING id, slug, name, enabled, verify_action, business_id, created_at, updated_at
        `;
        app = mapApp(created[0]);
      } else {
        app = mapApp(apps[0]);
      }

      await logSynkEvent(sql, {
        eventType: "business_approve",
        appSlug: app && app.slug,
        detail: biz.name,
      });
      return json(200, {
        ok: true,
        business: mapBusiness(updated[0]),
        app,
        apiKey,
      });
    }

    if (event.httpMethod === "POST" && action === "deny") {
      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id is required" });
      const rows = await sql`
        UPDATE synk_business_accounts
        SET status = 'denied', reviewed_at = NOW(), updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name, contact_name, email, password_hash, status, note, created_at, updated_at, reviewed_at
      `;
      if (!rows[0]) return json(404, { error: "Business request not found" });
      await logSynkEvent(sql, { eventType: "business_deny", detail: rows[0].name });
      return json(200, { ok: true, business: mapBusiness(rows[0]) });
    }

    if (event.httpMethod === "POST" && action === "set-password") {
      const id = String(body.id || "").trim();
      const password = String(body.password || "").trim();
      if (!id) return json(400, { error: "id is required" });
      if (password.length < 8) return json(400, { error: "Password must be at least 8 characters" });
      const rows = await sql`
        UPDATE synk_business_accounts
        SET password_hash = ${hashSecret(password)}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name, contact_name, email, password_hash, status, note, created_at, updated_at, reviewed_at
      `;
      if (!rows[0]) return json(404, { error: "Business account not found" });
      return json(200, { ok: true, business: mapBusiness(rows[0]) });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("synk-business error:", err);
    return json(500, { error: "Server error" });
  }
};
