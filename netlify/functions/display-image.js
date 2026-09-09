const { getStore, connectLambda } = require("@netlify/blobs");
const { json } = require("./lib/db");

exports.handler = async (event) => {
  try {
    connectLambda(event);
    const store = getStore("kiosk-media");
    const result = await store.getWithMetadata("display-image", {
      type: "arrayBuffer",
    });

    if (!result || !result.data) {
      return {
        statusCode: 404,
        headers: { "Cache-Control": "no-store" },
        body: "No image uploaded",
      };
    }

    const contentType =
      (result.metadata && result.metadata.contentType) || "image/jpeg";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60",
      },
      body: Buffer.from(result.data).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error(err);
    return json(500, { error: "Could not load image" });
  }
};
