const { getSql, json, requireSynkAdmin } = require("./lib/db");
const { ensureSynkCoreTables, ensureSynkPlacesTable } = require("./lib/synk");

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function normalizeDescription(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

function normalizeWebsite(value) {
  const raw = String(value || "").trim().slice(0, 500);
  if (!raw) return "";
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeLogoUrl(value) {
  const raw = String(value || "").trim().slice(0, 800);
  if (!raw) return "";
  if (raw.startsWith("/api/synk-image") || raw.startsWith("/api/")) return raw;
  if (raw.startsWith("data:image/")) return raw.slice(0, 0); // reject inline data URLs in DB
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeSortOrder(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-9999, Math.min(9999, Math.round(n)));
}

function mapPlace(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    websiteUrl: row.website_url || "",
    logoUrl: row.logo_url || "",
    sortOrder: Number(row.sort_order) || 0,
    enabled: row.enabled !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  try {
    const sql = getSql();
    await ensureSynkCoreTables(sql);
    await ensureSynkPlacesTable(sql);

    if (event.httpMethod === "GET") {
      const admin = await requireSynkAdmin(event);
      const isAdmin = Boolean(admin.ok);

      const rows = isAdmin
        ? await sql`
            SELECT id, name, description, website_url, logo_url, sort_order, enabled, created_at, updated_at
            FROM synk_places
            ORDER BY sort_order ASC, name ASC
            LIMIT 200
          `
        : await sql`
            SELECT id, name, description, website_url, logo_url, sort_order, enabled, created_at, updated_at
            FROM synk_places
            WHERE enabled = TRUE
            ORDER BY sort_order ASC, name ASC
            LIMIT 200
          `;

      return json(200, { places: rows.map(mapPlace) });
    }

    const auth = await requireSynkAdmin(event);
    if (!auth.ok) return auth.response;

    if (event.httpMethod === "POST") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      const name = normalizeName(body.name);
      if (!name) return json(400, { error: "Name is required" });

      const description = normalizeDescription(body.description);
      const websiteUrl = normalizeWebsite(body.websiteUrl || body.website);
      const logoUrl = normalizeLogoUrl(body.logoUrl || body.logo);
      const sortOrder = normalizeSortOrder(body.sortOrder);
      const enabled = body.enabled !== false;

      if ((body.websiteUrl || body.website) && !websiteUrl) {
        return json(400, { error: "Website must be an http(s) URL" });
      }
      if ((body.logoUrl || body.logo) && !logoUrl) {
        return json(400, { error: "Logo must be an uploaded image path or http(s) URL" });
      }

      const rows = await sql`
        INSERT INTO synk_places (name, description, website_url, logo_url, sort_order, enabled)
        VALUES (${name}, ${description}, ${websiteUrl}, ${logoUrl}, ${sortOrder}, ${enabled})
        RETURNING id, name, description, website_url, logo_url, sort_order, enabled, created_at, updated_at
      `;
      return json(201, { place: mapPlace(rows[0]) });
    }

    if (event.httpMethod === "PATCH") {
      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id is required" });

      const existing = await sql`
        SELECT id, name, description, website_url, logo_url, sort_order, enabled
        FROM synk_places
        WHERE id = ${id}
        LIMIT 1
      `;
      if (!existing[0]) return json(404, { error: "Place not found" });

      const name =
        typeof body.name === "string" ? normalizeName(body.name) : existing[0].name;
      if (!name) return json(400, { error: "Name is required" });

      const description =
        typeof body.description === "string"
          ? normalizeDescription(body.description)
          : existing[0].description || "";

      let websiteUrl = existing[0].website_url || "";
      if (typeof body.websiteUrl === "string" || typeof body.website === "string") {
        const raw = body.websiteUrl != null ? body.websiteUrl : body.website;
        websiteUrl = normalizeWebsite(raw);
        if (String(raw || "").trim() && !websiteUrl) {
          return json(400, { error: "Website must be an http(s) URL" });
        }
      }

      let logoUrl = existing[0].logo_url || "";
      if (typeof body.logoUrl === "string" || typeof body.logo === "string") {
        const raw = body.logoUrl != null ? body.logoUrl : body.logo;
        logoUrl = normalizeLogoUrl(raw);
        if (String(raw || "").trim() && !logoUrl) {
          return json(400, { error: "Logo must be an uploaded image path or http(s) URL" });
        }
      }

      const sortOrder =
        body.sortOrder != null ? normalizeSortOrder(body.sortOrder) : Number(existing[0].sort_order) || 0;
      const enabled =
        typeof body.enabled === "boolean" ? body.enabled : existing[0].enabled !== false;

      const rows = await sql`
        UPDATE synk_places
        SET
          name = ${name},
          description = ${description},
          website_url = ${websiteUrl},
          logo_url = ${logoUrl},
          sort_order = ${sortOrder},
          enabled = ${enabled},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name, description, website_url, logo_url, sort_order, enabled, created_at, updated_at
      `;
      return json(200, { place: mapPlace(rows[0]) });
    }

    if (event.httpMethod === "DELETE") {
      const id =
        (event.queryStringParameters && event.queryStringParameters.id) ||
        (() => {
          try {
            return JSON.parse(event.body || "{}").id;
          } catch {
            return "";
          }
        })();
      const placeId = String(id || "").trim();
      if (!placeId) return json(400, { error: "id is required" });

      const rows = await sql`
        DELETE FROM synk_places
        WHERE id = ${placeId}
        RETURNING id
      `;
      if (!rows[0]) return json(404, { error: "Place not found" });
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error("synk-places error:", err);
    return json(500, { error: "Server error" });
  }
};
