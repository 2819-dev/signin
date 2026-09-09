const { getSql, json, requireAdmin } = require("./lib/db");

const DEFAULTS = {
  isOpen: true,
  urgentEnabled: true,
  chatEnabled: true,
  theme: "light",
  closedTitle: "Closed",
  closedMessage: "Not accepting visitors right now.",
  displayMode: "signin",
  displayTitle: "",
  displayMessage: "",
  displayImageUrl: "",
  displayLink: "",
  displayShowClock: false,
  cameraRotation: 90,
};

const DISPLAY_MODES = new Set([
  "signin",
  "welcome",
  "message",
  "status",
  "schedule",
  "list",
  "image",
  "poster",
  "gallery",
  "clock",
  "countdown",
  "qr",
  "video",
  "embed",
  "blackout",
]);

function normalizeTheme(value) {
  return value === "dark" ? "dark" : "light";
}

function normalizeDisplayMode(value) {
  return DISPLAY_MODES.has(value) ? value : "signin";
}

function normalizeImageUrl(value) {
  const raw = String(value || "").trim().slice(0, 2000);
  if (!raw) return "";
  if (raw.startsWith("/api/display-image")) {
    return raw.slice(0, 200);
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeLink(value) {
  return String(value || "").trim().slice(0, 2000);
}

function normalizeCameraRotation(value) {
  const n = Number(value);
  if (n === 0 || n === 90 || n === 180 || n === 270) return n;
  return 90;
}

function mapSettings(row) {
  if (!row) return { ...DEFAULTS };
  return {
    isOpen: Boolean(row.is_open),
    urgentEnabled: row.urgent_enabled !== false,
    chatEnabled: row.chat_enabled !== false,
    theme: normalizeTheme(row.theme),
    closedTitle: row.closed_title || DEFAULTS.closedTitle,
    closedMessage: row.closed_message || DEFAULTS.closedMessage,
    displayMode: normalizeDisplayMode(row.display_mode),
    displayTitle: row.display_title || "",
    displayMessage: row.display_message || "",
    displayImageUrl: row.display_image_url || "",
    displayLink: row.display_link || "",
    displayShowClock: Boolean(row.display_show_clock),
    cameraRotation: normalizeCameraRotation(row.camera_rotation),
    updatedAt: row.updated_at || null,
  };
}

async function ensureSettings(sql) {
  await sql`
    INSERT INTO kiosk_settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`ALTER TABLE kiosk_settings ADD COLUMN IF NOT EXISTS display_mode TEXT NOT NULL DEFAULT 'signin'`;
  await sql`ALTER TABLE kiosk_settings ADD COLUMN IF NOT EXISTS display_title TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE kiosk_settings ADD COLUMN IF NOT EXISTS display_message TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE kiosk_settings ADD COLUMN IF NOT EXISTS display_image_url TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE kiosk_settings ADD COLUMN IF NOT EXISTS display_link TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE kiosk_settings ADD COLUMN IF NOT EXISTS display_show_clock BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE kiosk_settings ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN NOT NULL DEFAULT TRUE`;
  await sql`ALTER TABLE kiosk_settings ADD COLUMN IF NOT EXISTS camera_rotation INTEGER NOT NULL DEFAULT 90`;

  const rows = await sql`
    SELECT is_open, urgent_enabled, chat_enabled, theme, closed_title, closed_message,
           display_mode, display_title, display_message, display_image_url, display_link, display_show_clock,
           camera_rotation, updated_at
    FROM kiosk_settings
    WHERE id = 1
    LIMIT 1
  `;
  return mapSettings(rows[0]);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  try {
    const sql = getSql();

    if (event.httpMethod === "GET") {
      const settings = await ensureSettings(sql);
      return json(200, { settings });
    }

    if (event.httpMethod === "POST") {
      const auth = requireAdmin(event);
      if (!auth.ok) return auth.response;

      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      await ensureSettings(sql);
      const currentRows = await sql`
        SELECT is_open, urgent_enabled, chat_enabled, theme, closed_title, closed_message,
               display_mode, display_title, display_message, display_image_url, display_link, display_show_clock,
               camera_rotation, updated_at
        FROM kiosk_settings
        WHERE id = 1
        LIMIT 1
      `;
      const current = mapSettings(currentRows[0]);

      const isOpen =
        typeof body.isOpen === "boolean" ? body.isOpen : current.isOpen;
      const urgentEnabled =
        typeof body.urgentEnabled === "boolean"
          ? body.urgentEnabled
          : current.urgentEnabled;
      const chatEnabled =
        typeof body.chatEnabled === "boolean"
          ? body.chatEnabled
          : current.chatEnabled;
      const theme = normalizeTheme(
        typeof body.theme === "string" ? body.theme : current.theme
      );
      const closedTitle = (
        typeof body.closedTitle === "string"
          ? body.closedTitle
          : current.closedTitle
      )
        .trim()
        .slice(0, 80);
      const closedMessage = (
        typeof body.closedMessage === "string"
          ? body.closedMessage
          : current.closedMessage
      )
        .trim()
        .slice(0, 500);

      const displayMode = normalizeDisplayMode(
        typeof body.displayMode === "string" ? body.displayMode : current.displayMode
      );
      const displayTitle = (
        typeof body.displayTitle === "string"
          ? body.displayTitle
          : current.displayTitle
      )
        .trim()
        .slice(0, 120);
      const displayMessage = (
        typeof body.displayMessage === "string"
          ? body.displayMessage
          : current.displayMessage
      )
        .trim()
        .slice(0, 2000);
      const displayImageUrl = normalizeImageUrl(
        typeof body.displayImageUrl === "string"
          ? body.displayImageUrl
          : current.displayImageUrl
      );
      const displayLink = normalizeLink(
        typeof body.displayLink === "string" ? body.displayLink : current.displayLink
      );
      const displayShowClock =
        typeof body.displayShowClock === "boolean"
          ? body.displayShowClock
          : current.displayShowClock;
      const cameraRotation = normalizeCameraRotation(
        body.cameraRotation != null ? body.cameraRotation : current.cameraRotation
      );

      if (!closedTitle) {
        return json(400, { error: "Closed title is required" });
      }
      if (!closedMessage) {
        return json(400, { error: "Closed message is required" });
      }
      if (
        (displayMode === "image" || displayMode === "poster") &&
        !displayImageUrl
      ) {
        return json(400, { error: "Add a photo for this display mode" });
      }
      if (
        (displayMode === "message" ||
          displayMode === "list" ||
          displayMode === "schedule" ||
          displayMode === "welcome") &&
        !displayTitle &&
        !displayMessage
      ) {
        return json(400, { error: "Add a title or message" });
      }
      if (displayMode === "status" && !displayTitle) {
        return json(400, { error: "Add a status title" });
      }
      if (displayMode === "gallery") {
        const galleryLines = displayMessage
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        if (!displayImageUrl && galleryLines.length === 0) {
          return json(400, { error: "Add at least one image for the gallery" });
        }
      }
      if (displayMode === "qr" && !displayLink) {
        return json(400, { error: "Add a link for the QR code" });
      }
      if (displayMode === "video" && !displayLink) {
        return json(400, { error: "Add a video link" });
      }
      if (displayMode === "embed" && !displayLink) {
        return json(400, { error: "Add a page link to embed" });
      }
      if (displayMode === "countdown" && !displayLink) {
        return json(400, { error: "Pick a countdown date and time" });
      }
      if (
        typeof body.displayImageUrl === "string" &&
        body.displayImageUrl.trim() &&
        !displayImageUrl
      ) {
        return json(400, {
          error: "Image URL must start with http://, https://, or be an uploaded image",
        });
      }

      const rows = await sql`
        UPDATE kiosk_settings
        SET is_open = ${isOpen},
            urgent_enabled = ${urgentEnabled},
            chat_enabled = ${chatEnabled},
            theme = ${theme},
            closed_title = ${closedTitle},
            closed_message = ${closedMessage},
            display_mode = ${displayMode},
            display_title = ${displayTitle},
            display_message = ${displayMessage},
            display_image_url = ${displayImageUrl},
            display_link = ${displayLink},
            display_show_clock = ${displayShowClock},
            camera_rotation = ${cameraRotation},
            updated_at = NOW()
        WHERE id = 1
        RETURNING is_open, urgent_enabled, chat_enabled, theme, closed_title, closed_message,
                  display_mode, display_title, display_message, display_image_url, display_link, display_show_clock,
                  camera_rotation, updated_at
      `;

      return json(200, { settings: mapSettings(rows[0]) });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
