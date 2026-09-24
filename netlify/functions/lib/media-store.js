"use strict";

/**
 * Drop-in replacement for @netlify/blobs used by visitor/Synk media APIs.
 * Stores binary objects in Neon (kiosk_media) so the apps can run on Vercel
 * without Netlify Blobs.
 */

const { getSql } = require("./db");

let ensured = false;

async function ensureMediaTable(sql) {
  if (ensured) return;
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
  ensured = true;
}

function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === "string") return Buffer.from(value);
  throw new Error("Unsupported blob value type");
}

function connectLambda(_event) {
  // No-op: retained for Netlify Blobs call-site compatibility.
}

function getStore(storeName = "kiosk-media") {
  const name = String(storeName || "kiosk-media").trim() || "kiosk-media";

  return {
    async set(key, value, opts = {}) {
      const sql = getSql();
      await ensureMediaTable(sql);
      const buffer = toBuffer(value);
      const metadata =
        opts && opts.metadata && typeof opts.metadata === "object" ? opts.metadata : {};
      const contentType =
        String(
          (metadata && metadata.contentType) ||
            opts.contentType ||
            "application/octet-stream"
        ) || "application/octet-stream";
      const metaJson = JSON.stringify(metadata || {});
      await sql`
        INSERT INTO kiosk_media (store_name, key, content, content_type, metadata, updated_at)
        VALUES (
          ${name},
          ${String(key)},
          ${buffer},
          ${contentType},
          ${metaJson}::jsonb,
          NOW()
        )
        ON CONFLICT (store_name, key) DO UPDATE SET
          content = EXCLUDED.content,
          content_type = EXCLUDED.content_type,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `;
      return { key: String(key) };
    },

    async get(key, opts = {}) {
      const result = await this.getWithMetadata(key, opts);
      return result ? result.data : null;
    },

    async getWithMetadata(key, opts = {}) {
      const sql = getSql();
      await ensureMediaTable(sql);
      const rows = await sql`
        SELECT content, content_type, metadata
        FROM kiosk_media
        WHERE store_name = ${name}
          AND key = ${String(key)}
        LIMIT 1
      `;
      if (!rows[0]) return null;
      const row = rows[0];
      const content = Buffer.isBuffer(row.content)
        ? row.content
        : Buffer.from(row.content || []);
      const type = String(opts.type || "arrayBuffer").toLowerCase();
      let data;
      if (type === "text") data = content.toString("utf8");
      else if (type === "json") data = JSON.parse(content.toString("utf8") || "null");
      else if (type === "blob") data = content;
      else if (type === "stream") data = content;
      else data = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength);

      const metadata =
        row.metadata && typeof row.metadata === "object"
          ? { ...row.metadata, contentType: row.content_type || row.metadata.contentType }
          : { contentType: row.content_type || "application/octet-stream" };

      return { data, metadata };
    },

    async delete(key) {
      const sql = getSql();
      await ensureMediaTable(sql);
      await sql`
        DELETE FROM kiosk_media
        WHERE store_name = ${name}
          AND key = ${String(key)}
      `;
    },
  };
}

module.exports = {
  connectLambda,
  getStore,
};
