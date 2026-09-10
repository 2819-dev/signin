"use strict";

const { getStore, connectLambda } = require("@netlify/blobs");
const { json, requireSynkAdmin } = require("./lib/db");
const { verifyMediaToken } = require("./lib/synk-admin-auth");

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

  const token = event.queryStringParameters && event.queryStringParameters.token;
  let allowed = false;
  if (token && verifyMediaToken(token, id)) {
    allowed = true;
  } else {
    const auth = await requireSynkAdmin(event);
    allowed = auth.ok;
  }

  if (!allowed) {
    return json(401, { error: "Unauthorized" });
  }

  try {
    connectLambda(event);
    const store = getStore("kiosk-media");
    const key = `synk-${id}`;
    const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (!result || !result.data) {
      return json(404, { error: "Image not found" });
    }

    const contentType =
      (result.metadata && result.metadata.contentType) || "image/jpeg";
    const buffer = Buffer.from(result.data);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
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
