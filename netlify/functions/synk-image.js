"use strict";

const { getStore, connectLambda } = require("@netlify/blobs");
const { getSql, json, requireSynkAdmin } = require("./lib/db");
const { verifyMediaToken } = require("./lib/synk-admin-auth");

async function isPlaceLogo(id) {
  try {
    const sql = getSql();
    const needle = `%id=${id}%`;
    const rows = await sql`
      SELECT 1
      FROM synk_places
      WHERE logo_url ILIKE ${needle}
      LIMIT 1
    `;
    return Boolean(rows[0]);
  } catch (err) {
    console.error("place logo lookup failed", err);
    return false;
  }
}

function isPublicMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return false;
  const access = String(metadata.access || "").toLowerCase();
  const purpose = String(metadata.purpose || "").toLowerCase();
  return access === "public" || purpose === "place-logo" || purpose === "public";
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return json(400, { error: "Valid id is required" });
  }

  try {
    connectLambda(event);
    const store = getStore("kiosk-media");
    const key = `synk-${id}`;
    const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (!result || !result.data) {
      return json(404, { error: "Image not found" });
    }

    const metadata = result.metadata || {};
    const token = event.queryStringParameters && event.queryStringParameters.token;
    let allowed = false;
    let cacheControl = "private, max-age=300";

    if (token && verifyMediaToken(token, id)) {
      allowed = true;
    } else if (isPublicMetadata(metadata)) {
      allowed = true;
      cacheControl = "public, max-age=86400";
    } else if (await isPlaceLogo(id)) {
      allowed = true;
      cacheControl = "public, max-age=86400";
    } else {
      const auth = await requireSynkAdmin(event);
      allowed = auth.ok;
    }

    if (!allowed) {
      return json(401, { error: "Unauthorized" });
    }

    const contentType = metadata.contentType || "image/jpeg";
    const buffer = Buffer.from(result.data);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        "X-Content-Type-Options": "nosniff",
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error(err);
    return json(500, { error: "Could not load image" });
  }
};
