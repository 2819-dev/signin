const { json } = require("./lib/db");
const { configureWebPush } = require("./lib/push");

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  if (event.httpMethod !== "GET") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const { publicKey } = configureWebPush();
    return json(200, { publicKey });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Push is not configured" });
  }
};
