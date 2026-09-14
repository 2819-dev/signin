/**
 * Example server handler: exchange a Synk pass for your own session.
 * Adapt to Express, Next.js Route Handlers, Cloudflare Workers, etc.
 *
 * Env:
 *   SYNK_API_KEY=sk_live_...
 *   SYNK_APP_SLUG=my-app
 *   SYNK_ORIGIN=https://synkid.netlify.app
 */

async function consumeSynkPass(pass) {
  const origin = String(process.env.SYNK_ORIGIN || "https://synkid.netlify.app").replace(/\/$/, "");
  const apiKey = process.env.SYNK_API_KEY;
  if (!apiKey) throw new Error("SYNK_API_KEY is not set");

  const res = await fetch(`${origin}/api/synk-pass`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Synk-Key": apiKey,
    },
    body: JSON.stringify({
      pass,
      appSlug: process.env.SYNK_APP_SLUG || undefined,
      singleUse: true,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const err = new Error(data.error || "Synk pass rejected");
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/** Netlify Functions-style export */
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*" }, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const pass = String(body.pass || body.synk_pass || "").trim();
    if (!pass) {
      return { statusCode: 400, body: JSON.stringify({ error: "pass required" }) };
    }

    const synk = await consumeSynkPass(pass);
    const profile = synk.profile || {};

    // TODO: upsert your user by profile.synkCode / profile.id and set a cookie/JWT.
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        synkCode: profile.synkCode,
        name: profile.name,
        photoUrl: profile.photoUrl || "",
      }),
    };
  } catch (err) {
    return {
      statusCode: err.status || 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Unauthorized" }),
    };
  }
};

exports.consumeSynkPass = consumeSynkPass;
