"use strict";
const { neon } = require("@neondatabase/serverless");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL required");
const sql = neon(DATABASE_URL);

const NETLIFY_ORIGINS = [
  "https://visitor-signin-kiosk.netlify.app",
  "https://synkid.netlify.app",
];

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS kiosk_media (
      store_name TEXT NOT NULL DEFAULT 'kiosk-media',
      key TEXT NOT NULL,
      content BYTEA NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (store_name, key)
    )
  `;
}

function extractId(url, param = "id") {
  try {
    const u = new URL(url, "https://example.com");
    return u.searchParams.get(param);
  } catch {
    return null;
  }
}

async function fetchBlob(path) {
  let lastErr = null;
  for (const origin of NETLIFY_ORIGINS) {
    const url = origin + path;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = new Error(`${url} -> ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || "application/octet-stream";
      return { buf, contentType, source: url };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("fetch failed");
}

async function upsert(key, buf, contentType, meta = {}) {
  const metaJson = JSON.stringify({ ...meta, migratedFrom: "netlify", migratedAt: new Date().toISOString() });
  await sql`
    INSERT INTO kiosk_media (store_name, key, content, content_type, metadata, updated_at)
    VALUES ('kiosk-media', ${key}, ${buf}, ${contentType}, ${metaJson}::jsonb, NOW())
    ON CONFLICT (store_name, key) DO UPDATE SET
      content = EXCLUDED.content,
      content_type = EXCLUDED.content_type,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
  `;
}

async function migrateOne(label, key, apiPath) {
  try {
    const { buf, contentType, source } = await fetchBlob(apiPath);
    await upsert(key, buf, contentType, { label, source });
    console.log("OK", label, key, buf.length, contentType);
    return true;
  } catch (err) {
    console.error("FAIL", label, key, err.message || err);
    return false;
  }
}

async function main() {
  await ensureTable();
  let ok = 0, fail = 0;

  const avatars = await sql`
    SELECT DISTINCT substring(avatar_url from 'id=([0-9a-f-]{36})') AS id
    FROM synk_community_profiles
    WHERE avatar_url ILIKE '%community-avatar%'
  `;
  for (const row of avatars) {
    if (!row.id) continue;
    const good = await migrateOne(
      "avatar",
      `community-avatar-${row.id}`,
      `/api/community-avatar?id=${row.id}`
    );
    good ? ok++ : fail++;
  }

  const icons = await sql`
    SELECT DISTINCT substring(icon_url from 'id=([0-9a-f-]{36})') AS id
    FROM synk_community_tags
    WHERE icon_url ILIKE '%community-tag-icon%'
  `;
  for (const row of icons) {
    if (!row.id) continue;
    const good = await migrateOne(
      "tag-icon",
      `community-tag-icon-${row.id}`,
      `/api/community-tag-icon?id=${row.id}`
    );
    good ? ok++ : fail++;
  }

  const photos = await sql`
    SELECT DISTINCT substring(photo_url from 'id=([0-9a-f-]{36})') AS id
    FROM synk_profiles
    WHERE photo_url ILIKE '%synk-image%'
  `;
  for (const row of photos) {
    if (!row.id) continue;
    const good = await migrateOne(
      "synk-photo",
      `synk-${row.id}`,
      `/api/synk-image?id=${row.id}`
    );
    good ? ok++ : fail++;
  }

  // display image (single key)
  {
    const good = await migrateOne("display", "display-image", "/api/display-image");
    good ? ok++ : fail++;
  }

  // face images if any
  const faces = await sql`
    SELECT id::text AS id FROM face_profiles LIMIT 200
  `.catch(() => []);
  for (const row of faces || []) {
    if (!row.id) continue;
    const good = await migrateOne("face", `face-${row.id}`, `/api/face-image?id=${row.id}`);
    good ? ok++ : fail++;
  }

  const count = await sql`SELECT COUNT(*)::int AS n FROM kiosk_media`;
  console.log(JSON.stringify({ ok, fail, kiosk_media_rows: count[0].n }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
