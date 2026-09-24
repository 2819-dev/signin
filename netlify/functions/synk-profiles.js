const { getSql, json, requireSynkAdmin } = require("./lib/db");
const {
  hashSecret,
  generateSynkCode,
  ensureSynkCoreTables,
  ensureSynkCommunityExtras,
  logSynkEvent,
  unassignUsernameTag,
} = require("./lib/synk");
const { signedPhotoUrl } = require("./lib/synk-admin-auth");

async function listBadgesByProfileIds(sql, profileIds) {
  const ids = Array.from(new Set((profileIds || []).map((id) => String(id || "").trim()).filter(Boolean)));
  const out = Object.fromEntries(ids.map((id) => [id, []]));
  if (!ids.length) return out;

  await ensureSynkCommunityExtras(sql);

  const ownership = await sql`
    SELECT synk_profile_id AS profile_id, public_username AS username, 'primary'::text AS account
    FROM synk_community_profiles
    WHERE synk_profile_id = ANY(${ids}::uuid[])
    UNION ALL
    SELECT owner_synk_profile_id AS profile_id, public_username AS username, 'alt'::text AS account
    FROM synk_community_alt_accounts
    WHERE owner_synk_profile_id = ANY(${ids}::uuid[])
  `;

  const usernameOwners = {};
  for (const row of ownership) {
    const username = String(row.username || "").trim();
    const profileId = String(row.profile_id || "");
    if (!username || !profileId || !out[profileId]) continue;
    if (!usernameOwners[username]) usernameOwners[username] = [];
    usernameOwners[username].push({ profileId, account: row.account === "alt" ? "alt" : "primary" });
  }

  const usernames = Object.keys(usernameOwners);
  if (usernames.length) {
    const tagRows = await sql`
      SELECT
        ut.public_username,
        t.id,
        t.name,
        t.slug,
        t.color,
        t.icon_url,
        CASE
          WHEN COALESCE(c.pinned_tag_id, a.pinned_tag_id) = t.id THEN TRUE
          ELSE FALSE
        END AS pinned
      FROM synk_community_username_tags ut
      JOIN synk_community_tags t ON t.id = ut.tag_id
      LEFT JOIN synk_community_profiles c ON c.public_username = ut.public_username
      LEFT JOIN synk_community_alt_accounts a ON a.public_username = ut.public_username
      WHERE ut.public_username = ANY(${usernames})
      ORDER BY t.name ASC
    `;
    for (const row of tagRows) {
      const owners = usernameOwners[row.public_username] || [];
      for (const owner of owners) {
        const list = out[owner.profileId];
        if (!list) continue;
        if (list.some((b) => b.id === row.id && b.username === row.public_username)) continue;
        list.push({
          id: row.id,
          name: row.name,
          slug: row.slug,
          color: row.color || "#6366f1",
          iconUrl: row.icon_url || null,
          pinned: Boolean(row.pinned),
          username: row.public_username,
          account: owner.account,
        });
      }
    }
  }

  const legacyRows = await sql`
    SELECT
      pt.synk_profile_id,
      t.id,
      t.name,
      t.slug,
      t.color,
      t.icon_url,
      c.public_username,
      CASE WHEN c.pinned_tag_id = t.id THEN TRUE ELSE FALSE END AS pinned
    FROM synk_community_profile_tags pt
    JOIN synk_community_tags t ON t.id = pt.tag_id
    LEFT JOIN synk_community_profiles c ON c.synk_profile_id = pt.synk_profile_id
    WHERE pt.synk_profile_id = ANY(${ids}::uuid[])
    ORDER BY t.name ASC
  `;
  for (const row of legacyRows) {
    const profileId = String(row.synk_profile_id || "");
    const list = out[profileId];
    if (!list) continue;
    if (list.some((b) => b.id === row.id)) continue;
    list.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      color: row.color || "#6366f1",
      iconUrl: row.icon_url || null,
      pinned: Boolean(row.pinned),
      username: row.public_username || null,
      account: row.public_username ? "primary" : "profile",
    });
  }

  return out;
}

async function ownedUsernamesForProfile(sql, profileId) {
  const rows = await sql`
    SELECT public_username AS username, 'primary'::text AS account
    FROM synk_community_profiles
    WHERE synk_profile_id = ${profileId}
    UNION ALL
    SELECT public_username AS username, 'alt'::text AS account
    FROM synk_community_alt_accounts
    WHERE owner_synk_profile_id = ${profileId}
  `;
  return rows
    .map((row) => ({
      username: String(row.username || "").trim(),
      account: row.account === "alt" ? "alt" : "primary",
    }))
    .filter((row) => row.username);
}

async function removeBadgeFromProfile(sql, profileId, tagId, username = "") {
  const wanted = String(username || "").trim().toLowerCase();
  const owned = await ownedUsernamesForProfile(sql, profileId);
  const targets = wanted
    ? owned.filter((row) => row.username.toLowerCase() === wanted)
    : owned;

  if (wanted && !targets.length) {
    const err = new Error("That username does not belong to this member");
    err.code = "USERNAME_NOT_OWNED";
    throw err;
  }

  let removed = 0;
  for (const row of targets) {
    const had = await sql`
      SELECT 1
      FROM synk_community_username_tags
      WHERE public_username = ${row.username}
        AND tag_id = ${tagId}
      LIMIT 1
    `;
    if (!had[0]) continue;
    await unassignUsernameTag(sql, row.username, tagId);
    removed += 1;
  }

  // Legacy profile-scoped assignment (no username row).
  if (!wanted) {
    const legacy = await sql`
      DELETE FROM synk_community_profile_tags
      WHERE synk_profile_id = ${profileId}
        AND tag_id = ${tagId}
      RETURNING tag_id
    `;
    if (legacy[0]) removed += 1;
    await sql`
      UPDATE synk_community_profiles
      SET pinned_tag_id = NULL
      WHERE synk_profile_id = ${profileId}
        AND pinned_tag_id = ${tagId}
    `;
  }

  return removed;
}

function normalizePhotoUrl(value) {
  const raw = String(value || "").trim().slice(0, 500);
  if (!raw) return "";
  try {
    const url = new URL(raw, "https://synk.local");
    const id = url.searchParams.get("id");
    if (id && /^[0-9a-f-]{36}$/i.test(id) && url.pathname.includes("synk-image")) {
      return `/api/synk-image?id=${encodeURIComponent(id)}`;
    }
  } catch {
    /* keep raw below */
  }
  return raw.replace(/([?&])token=[^&]+/g, "").replace(/[?&]$/, "");
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

function normalizeSecret(value) {
  return String(value || "").trim();
}

function normalizeDob(value) {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  if (year < 1900 || year > new Date().getUTCFullYear()) return null;
  return raw;
}

function toDobString(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : raw.slice(0, 10);
}

function normalizeDescriptor(value) {
  if (!Array.isArray(value) || value.length < 64) return null;
  const nums = value.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  if (nums.length < 64 || nums.length > 512) return null;
  return nums;
}

const POLICIES = new Set(["pending", "autofill", "auto_admit", "auto_deny"]);

function normalizePolicy(value) {
  return POLICIES.has(value) ? value : "pending";
}

function mapProfile(row, { includeSecretHint = false } = {}) {
  if (!row) return null;
  const profile = {
    id: row.id,
    synkCode: row.synk_code,
    name: row.name,
    dateOfBirth: toDobString(row.date_of_birth),
    photoUrl: signedPhotoUrl(row.photo_url || ""),
    policy: normalizePolicy(row.policy),
    enabled: row.enabled !== false,
    hasBiometrics: row.descriptor != null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeSecretHint) {
    profile.hasSecret = Boolean(row.secret_hash);
  }
  return profile;
}

async function ensureSynkTables(sql) {
  await ensureSynkCoreTables(sql);
}

async function uniqueSynkCode(sql) {
  for (let i = 0; i < 12; i += 1) {
    const code = generateSynkCode();
    const rows = await sql`SELECT id FROM synk_profiles WHERE synk_code = ${code} LIMIT 1`;
    if (!rows[0]) return code;
  }
  throw new Error("Could not allocate Synk ID");
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(204, {});
  }

  try {
    const sql = getSql();
    await ensureSynkTables(sql);

    if (event.httpMethod === "GET") {
      const auth = await requireSynkAdmin(event);
      if (!auth.ok) return auth.response;

      const rows = await sql`
        SELECT id, synk_code, name, date_of_birth, secret_hash, photo_url, descriptor, policy, enabled, created_at, updated_at
        FROM synk_profiles
        ORDER BY updated_at DESC
        LIMIT 200
      `;
      const badgesByProfile = await listBadgesByProfileIds(
        sql,
        rows.map((row) => row.id)
      );
      return json(200, {
        profiles: rows.map((row) => ({
          ...mapProfile(row, { includeSecretHint: true }),
          badges: badgesByProfile[row.id] || [],
        })),
      });
    }

    if (event.httpMethod === "POST") {
      const auth = await requireSynkAdmin(event);
      if (!auth.ok) return auth.response;

      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      const name = normalizeName(body.name);
      const secret = normalizeSecret(body.secret);
      const dateOfBirth = normalizeDob(body.dateOfBirth);
      const photoUrl = normalizePhotoUrl(body.photoUrl);
      const descriptor = normalizeDescriptor(body.descriptor);
      const policy = normalizePolicy(body.policy);
      const enabled = body.enabled !== false;

      if (!name) return json(400, { error: "Name is required" });
      if (!dateOfBirth) return json(400, { error: "Date of birth is required" });
      if (!descriptor) return json(400, { error: "A clear face photo is required for Synk biometrics" });
      if (secret && secret.length < 4) return json(400, { error: "Secret must be at least 4 characters" });
      if (secret.length > 200) return json(400, { error: "Secret is too long" });

      const synkCode = await uniqueSynkCode(sql);
      const secretHash = secret ? hashSecret(secret) : null;

      const rows = await sql`
        INSERT INTO synk_profiles (synk_code, name, date_of_birth, secret_hash, photo_url, descriptor, policy, enabled)
        VALUES (
          ${synkCode},
          ${name},
          ${dateOfBirth}::date,
          ${secretHash},
          ${photoUrl},
          ${JSON.stringify(descriptor)}::jsonb,
          ${policy},
          ${enabled}
        )
        RETURNING id, synk_code, name, date_of_birth, secret_hash, photo_url, descriptor, policy, enabled, created_at, updated_at
      `;
      await logSynkEvent(sql, { eventType: "admin_member_create", profileId: rows[0].id, detail: rows[0].synk_code || name });
      return json(201, { profile: mapProfile(rows[0], { includeSecretHint: true }) });
    }

    if (event.httpMethod === "PATCH") {
      const auth = await requireSynkAdmin(event);
      if (!auth.ok) return auth.response;

      let body;
      try {
        body = JSON.parse(event.body || "{}");
      } catch {
        return json(400, { error: "Invalid JSON" });
      }

      const id = String(body.id || "").trim();
      if (!id) return json(400, { error: "id is required" });

      const existingRows = await sql`
        SELECT id, synk_code, name, date_of_birth, secret_hash, photo_url, descriptor, policy, enabled, created_at, updated_at
        FROM synk_profiles
        WHERE id = ${id}
        LIMIT 1
      `;
      if (!existingRows[0]) return json(404, { error: "Person not found" });
      const existing = existingRows[0];

      const action = String(body.action || "").trim();
      if (action === "remove-badge") {
        await ensureSynkCommunityExtras(sql);
        const tagId = String(body.tagId || body.badgeId || "").trim();
        const username = String(body.username || "").trim();
        if (!tagId) return json(400, { error: "tagId is required" });
        let removed = 0;
        try {
          removed = await removeBadgeFromProfile(sql, id, tagId, username);
        } catch (err) {
          if (err && err.code === "USERNAME_NOT_OWNED") {
            return json(400, { error: err.message });
          }
          throw err;
        }
        if (!removed) return json(404, { error: "Badge not found on this member" });
        await logSynkEvent(sql, {
          eventType: "admin_member_badge_remove",
          profileId: id,
          detail: `${existing.synk_code || existing.name}:${tagId}${username ? `@${username}` : ""}`,
        });
        const badgesByProfile = await listBadgesByProfileIds(sql, [id]);
        return json(200, {
          ok: true,
          removed,
          profile: {
            ...mapProfile(existing, { includeSecretHint: true }),
            badges: badgesByProfile[id] || [],
          },
        });
      }

      const name =
        typeof body.name === "string" ? normalizeName(body.name) : existing.name;
      const dateOfBirth =
        typeof body.dateOfBirth === "string"
          ? normalizeDob(body.dateOfBirth)
          : toDobString(existing.date_of_birth);
      const photoUrl =
        typeof body.photoUrl === "string"
          ? normalizePhotoUrl(body.photoUrl)
          : existing.photo_url || "";
      const enabled =
        typeof body.enabled === "boolean" ? body.enabled : existing.enabled !== false;
      const policy =
        typeof body.policy === "string" ? normalizePolicy(body.policy) : normalizePolicy(existing.policy);

      let secretHash = existing.secret_hash;
      if (typeof body.secret === "string" && body.secret.trim()) {
        const secret = normalizeSecret(body.secret);
        if (secret.length < 4) return json(400, { error: "Secret must be at least 4 characters" });
        if (secret.length > 200) return json(400, { error: "Secret is too long" });
        secretHash = hashSecret(secret);
      }

      let descriptorJson = existing.descriptor;
      if (body.descriptor != null) {
        const descriptor = normalizeDescriptor(body.descriptor);
        if (!descriptor) {
          return json(400, { error: "Could not read face from that photo" });
        }
        descriptorJson = JSON.stringify(descriptor);
      }

      if (!name) return json(400, { error: "Name is required" });
      if (!dateOfBirth) return json(400, { error: "Date of birth is required" });

      const rows =
        body.descriptor != null
          ? await sql`
              UPDATE synk_profiles
              SET name = ${name},
                  date_of_birth = ${dateOfBirth}::date,
                  photo_url = ${photoUrl},
                  enabled = ${enabled},
                  policy = ${policy},
                  secret_hash = ${secretHash},
                  descriptor = ${descriptorJson}::jsonb,
                  updated_at = NOW()
              WHERE id = ${id}
              RETURNING id, synk_code, name, date_of_birth, secret_hash, photo_url, descriptor, policy, enabled, created_at, updated_at
            `
          : await sql`
              UPDATE synk_profiles
              SET name = ${name},
                  date_of_birth = ${dateOfBirth}::date,
                  photo_url = ${photoUrl},
                  enabled = ${enabled},
                  policy = ${policy},
                  secret_hash = ${secretHash},
                  updated_at = NOW()
              WHERE id = ${id}
              RETURNING id, synk_code, name, date_of_birth, secret_hash, photo_url, descriptor, policy, enabled, created_at, updated_at
            `;

      await logSynkEvent(sql, { eventType: "admin_member_update", profileId: rows[0].id, detail: rows[0].synk_code || name });
      const badgesByProfile = await listBadgesByProfileIds(sql, [rows[0].id]);
      return json(200, {
        profile: {
          ...mapProfile(rows[0], { includeSecretHint: true }),
          badges: badgesByProfile[rows[0].id] || [],
        },
      });
    }

    if (event.httpMethod === "DELETE") {
      const auth = await requireSynkAdmin(event);
      if (!auth.ok) return auth.response;

      const id =
        (event.queryStringParameters && event.queryStringParameters.id) ||
        (() => {
          try {
            return JSON.parse(event.body || "{}").id;
          } catch {
            return "";
          }
        })();

      if (!id) return json(400, { error: "id is required" });

      const rows = await sql`
        DELETE FROM synk_profiles
        WHERE id = ${id}
        RETURNING id
      `;
      if (!rows[0]) return json(404, { error: "Person not found" });
      await logSynkEvent(sql, { eventType: "admin_member_delete", profileId: rows[0].id, detail: "deleted" });
      return json(200, { ok: true });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};
