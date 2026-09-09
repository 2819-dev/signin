const { getStore, connectLambda } = require("@netlify/blobs");
const { json, requireSynkAdmin } = require("./lib/db");
const { randomUUID } = require("crypto");

const MAX_BYTES = 3.5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const auth = requireSynkAdmin(event);
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const contentType = String(body.contentType || "").toLowerCase().split(";")[0].trim();
  if (!ALLOWED.has(contentType)) {
    return json(400, { error: "Use a JPG, PNG, or WebP" });
  }

  const raw = String(body.data || "");
  const base64 = raw.includes(",") ? raw.split(",").pop() : raw;
  if (!base64) return json(400, { error: "Missing image data" });

  let buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return json(400, { error: "Could not read image data" });
  }

  if (!buffer.length) return json(400, { error: "Could not read image" });
  if (buffer.length > MAX_BYTES) {
    return json(400, { error: "Image too large (max about 3MB)" });
  }

  try {
    connectLambda(event);
    const store = getStore("kiosk-media");
    const id = randomUUID();
    const key = `synk-${id}`;
    await store.set(key, buffer, {
      metadata: {
        contentType,
        updatedAt: new Date().toISOString(),
        fileName: String(body.fileName || "").slice(0, 120),
      },
    });

    return json(200, {
      id,
      url: `/api/synk-image?id=${encodeURIComponent(id)}&v=${Date.now()}`,
      contentType,
      bytes: buffer.length,
    });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Could not save image" });
  }
};
