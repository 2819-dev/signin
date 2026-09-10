const {
  randomBytes,
  scryptSync,
  createHash,
  createHmac,
  timingSafeEqual,
} = require("crypto");

const SCRYPT_KEYLEN = 64;
const PASS_TTL_MS = 2 * 60 * 1000;
const HUB_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_ATTEMPTS = 8;

function hashSecret(secret) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(secret), salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

function verifySecret(secret, stored) {
  if (!stored || typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  let derived;
  try {
    derived = scryptSync(String(secret), salt, SCRYPT_KEYLEN).toString("hex");
  } catch {
    return false;
  }
  try {
    const a = Buffer.from(hash, "hex");
    const b = Buffer.from(derived, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function generateSynkCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return `SK-${out.slice(0, 4)}-${out.slice(4)}`;
}

function generateApiKey() {
  return `sk_live_${randomBytes(24).toString("base64url")}`;
}

function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

function signingSecret() {
  return (
    process.env.SYNK_SIGNING_SECRET ||
    process.env.ADMIN_SECRET ||
    "synk-dev-signing-secret"
  );
}

function mintPassToken() {
  return `skp_${randomBytes(24).toString("base64url")}`;
}

function signClaims(claims) {
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createHmac("sha256", signingSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifySignedClaims(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", signingSecret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!claims || typeof claims !== "object") return null;
    if (claims.exp && Date.now() > Number(claims.exp)) return null;
    return claims;
  } catch {
    return null;
  }
}

function clientIp(event) {
  const headers = event.headers || {};
  const xf =
    headers["x-nf-client-connection-ip"] ||
    headers["x-forwarded-for"] ||
    headers["client-ip"] ||
    "";
  return String(xf).split(",")[0].trim().slice(0, 80) || "unknown";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureSynkCoreTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS synk_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      synk_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      date_of_birth DATE NOT NULL,
      secret_hash TEXT,
      photo_url TEXT NOT NULL DEFAULT '',
      descriptor JSONB,
      policy TEXT NOT NULL DEFAULT 'pending',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE synk_profiles ADD COLUMN IF NOT EXISTS descriptor JSONB`;
  await sql`ALTER TABLE synk_profiles ADD COLUMN IF NOT EXISTS policy TEXT NOT NULL DEFAULT 'pending'`;
  await sql`ALTER TABLE synk_profiles ALTER COLUMN secret_hash DROP NOT NULL`;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_apps (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      api_key_hash TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE synk_apps ADD COLUMN IF NOT EXISTS business_id UUID`;
  await sql`ALTER TABLE synk_apps ADD COLUMN IF NOT EXISTS verify_action TEXT NOT NULL DEFAULT 'pending'`;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_business_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      contact_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL,
      password_hash TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      note TEXT NOT NULL DEFAULT '',
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS synk_business_accounts_email_idx
    ON synk_business_accounts (email)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_business_accounts_status_idx
    ON synk_business_accounts (status, created_at DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_business_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES synk_business_accounts(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      ip TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_business_sessions_business_idx
    ON synk_business_sessions (business_id, revoked_at, expires_at DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_passes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_hash TEXT NOT NULL UNIQUE,
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      app_slug TEXT NOT NULL DEFAULT 'synk',
      purpose TEXT NOT NULL DEFAULT 'identity',
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE synk_passes ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ`;
  await sql`CREATE INDEX IF NOT EXISTS synk_passes_hash_idx ON synk_passes (token_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS synk_passes_expires_idx ON synk_passes (expires_at)`;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_passes_active_idx
    ON synk_passes (expires_at)
    WHERE consumed_at IS NULL AND revoked_at IS NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_hub_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_hub_sessions_profile_idx
    ON synk_hub_sessions (synk_profile_id, revoked_at, expires_at DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_profiles (
      synk_profile_id UUID PRIMARY KEY REFERENCES synk_profiles(id) ON DELETE CASCADE,
      public_username TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS synk_community_profiles_username_idx
    ON synk_community_profiles (public_username)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_posts_created_idx
    ON synk_community_posts (created_at DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type TEXT NOT NULL,
      synk_profile_id UUID,
      app_slug TEXT,
      ip TEXT,
      detail TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS synk_events_created_idx ON synk_events (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS synk_events_ip_created_idx ON synk_events (ip, created_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_join_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      date_of_birth DATE NOT NULL,
      secret_hash TEXT,
      photo_url TEXT NOT NULL DEFAULT '',
      descriptor JSONB,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      ip TEXT,
      reviewed_at TIMESTAMPTZ,
      profile_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS synk_join_requests_status_idx ON synk_join_requests (status, created_at DESC)`;

  await seedVisitorSignInBusiness(sql);
}

function normalizeVerifyAction(value) {
  const action = String(value || "")
    .trim()
    .toLowerCase();
  return ["pending", "autofill", "auto_admit", "auto_deny"].includes(action)
    ? action
    : "pending";
}

async function seedVisitorSignInBusiness(sql) {
  const email = String(
    process.env.SYNK_VISITOR_BUSINESS_EMAIL || "visitor-signin@synk.local"
  )
    .trim()
    .toLowerCase()
    .slice(0, 160);
  const password = String(process.env.SYNK_VISITOR_BUSINESS_PASSWORD || "").trim();

  let businessRows = await sql`
    SELECT id, email, password_hash, status
    FROM synk_business_accounts
    WHERE LOWER(email) = ${email}
    LIMIT 1
  `;
  if (!businessRows[0]) {
    businessRows = await sql`
      SELECT id, email, password_hash, status
      FROM synk_business_accounts
      WHERE name = 'Visitor Sign-In'
      LIMIT 1
    `;
  }

  let businessId = businessRows[0] && businessRows[0].id;
  if (!businessId) {
    const inserted = await sql`
      INSERT INTO synk_business_accounts (
        name, contact_name, email, password_hash, status, note, reviewed_at
      )
      VALUES (
        'Visitor Sign-In',
        'Visitor Sign-In',
        ${email},
        ${password ? hashSecret(password) : null},
        'approved',
        'Preconnected Synk Business account for the Visitor Sign-In product.',
        NOW()
      )
      RETURNING id
    `;
    businessId = inserted[0].id;
  } else {
    if (businessRows[0].status !== "approved") {
      await sql`
        UPDATE synk_business_accounts
        SET status = 'approved', reviewed_at = COALESCE(reviewed_at, NOW()), updated_at = NOW()
        WHERE id = ${businessId}
      `;
    }
    if (password) {
      await sql`
        UPDATE synk_business_accounts
        SET password_hash = ${hashSecret(password)}, updated_at = NOW()
        WHERE id = ${businessId}
      `;
    }
    if (String(businessRows[0].email || "").toLowerCase() !== email) {
      await sql`
        UPDATE synk_business_accounts
        SET email = ${email}, updated_at = NOW()
        WHERE id = ${businessId}
      `;
    }
  }

  const apps = await sql`
    SELECT id, business_id, verify_action
    FROM synk_apps
    WHERE slug = 'visitor-signin'
    LIMIT 1
  `;
  if (!apps[0]) {
    const bootstrapKey = generateApiKey();
    await sql`
      INSERT INTO synk_apps (slug, name, api_key_hash, business_id, verify_action)
      VALUES (
        'visitor-signin',
        'Visitor Sign-In',
        ${hashSecret(bootstrapKey)},
        ${businessId},
        'pending'
      )
    `;
  } else {
    await sql`
      UPDATE synk_apps
      SET
        business_id = COALESCE(business_id, ${businessId}),
        verify_action = COALESCE(NULLIF(verify_action, ''), 'pending'),
        updated_at = NOW()
      WHERE id = ${apps[0].id}
    `;
  }
}

async function getAppVerifyAction(sql, appSlug) {
  const slug = String(appSlug || "")
    .trim()
    .slice(0, 80);
  if (!slug) return "pending";
  const rows = await sql`
    SELECT verify_action
    FROM synk_apps
    WHERE slug = ${slug}
    LIMIT 1
  `;
  return normalizeVerifyAction(rows[0] && rows[0].verify_action);
}

async function logSynkEvent(sql, { eventType, profileId = null, appSlug = null, ip = null, detail = "" }) {
  try {
    await sql`
      INSERT INTO synk_events (event_type, synk_profile_id, app_slug, ip, detail)
      VALUES (
        ${String(eventType || "event").slice(0, 60)},
        ${profileId},
        ${appSlug ? String(appSlug).slice(0, 80) : null},
        ${ip ? String(ip).slice(0, 80) : null},
        ${String(detail || "").slice(0, 300)}
      )
    `;
  } catch (err) {
    console.error("synk event log failed", err.message || err);
  }
}

async function assertNotRateLimited(sql, ip) {
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM synk_events
    WHERE ip = ${ip}
      AND event_type IN ('verify_fail', 'verify_ok', 'rate_limited')
      AND created_at >= ${since}::timestamptz
  `;
  const count = rows[0] && rows[0].count ? Number(rows[0].count) : 0;
  if (count >= RATE_MAX_ATTEMPTS) {
    await logSynkEvent(sql, { eventType: "rate_limited", ip, detail: "too many attempts" });
    return false;
  }
  return true;
}

async function issuePass(sql, { profileId, appSlug = "synk", purpose = "identity" }) {
  const token = mintPassToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASS_TTL_MS).toISOString();
  const rows = await sql`
    INSERT INTO synk_passes (token_hash, synk_profile_id, app_slug, purpose, expires_at)
    VALUES (${tokenHash}, ${profileId}, ${appSlug}, ${purpose}, ${expiresAt}::timestamptz)
    RETURNING id, expires_at
  `;
  const claims = signClaims({
    typ: "synk_pass",
    pid: profileId,
    app: appSlug,
    purpose,
    passId: rows[0].id,
    exp: Date.now() + PASS_TTL_MS,
  });
  return {
    token,
    assertion: claims,
    expiresAt: rows[0].expires_at,
    ttlSeconds: Math.round(PASS_TTL_MS / 1000),
  };
}

async function consumePass(sql, token, { appSlug = null, singleUse = true } = {}) {
  if (!token || typeof token !== "string") return { ok: false, error: "Pass required" };
  const tokenHash = hashToken(token.trim());
  const rows = await sql`
    SELECT p.id, p.synk_profile_id, p.app_slug, p.purpose, p.expires_at, p.consumed_at, p.revoked_at,
           m.synk_code, m.name, m.photo_url, m.policy, m.enabled
    FROM synk_passes p
    JOIN synk_profiles m ON m.id = p.synk_profile_id
    WHERE p.token_hash = ${tokenHash}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { ok: false, error: "Invalid Synk pass" };
  if (row.revoked_at) return { ok: false, error: "Synk pass revoked" };
  if (row.consumed_at) return { ok: false, error: "Synk pass already used" };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Synk pass expired" };
  }
  if (appSlug && row.app_slug !== appSlug) {
    return { ok: false, error: "Synk pass not valid for this app" };
  }
  if (row.enabled === false) return { ok: false, error: "Synk member is paused" };

  if (singleUse) {
    await sql`
      UPDATE synk_passes
      SET consumed_at = NOW()
      WHERE id = ${row.id} AND consumed_at IS NULL
    `;
  }

  return {
    ok: true,
    pass: {
      id: row.id,
      appSlug: row.app_slug,
      purpose: row.purpose,
      expiresAt: row.expires_at,
    },
    profile: {
      id: row.synk_profile_id,
      synkCode: row.synk_code,
      name: row.name,
      photoUrl: row.photo_url || "",
      policy: row.policy || "pending",
    },
  };
}

async function listActivePasses(sql, { limit = 50, profileId = null } = {}) {
  const capped = Math.min(200, Math.max(1, Number(limit) || 50));
  const rows = profileId
    ? await sql`
        SELECT p.id, p.synk_profile_id, p.app_slug, p.purpose, p.expires_at, p.created_at,
               m.synk_code, m.name
        FROM synk_passes p
        JOIN synk_profiles m ON m.id = p.synk_profile_id
        WHERE p.consumed_at IS NULL
          AND p.revoked_at IS NULL
          AND p.expires_at > NOW()
          AND p.synk_profile_id = ${profileId}
        ORDER BY p.created_at DESC
        LIMIT ${capped}
      `
    : await sql`
        SELECT p.id, p.synk_profile_id, p.app_slug, p.purpose, p.expires_at, p.created_at,
               m.synk_code, m.name
        FROM synk_passes p
        JOIN synk_profiles m ON m.id = p.synk_profile_id
        WHERE p.consumed_at IS NULL
          AND p.revoked_at IS NULL
          AND p.expires_at > NOW()
        ORDER BY p.created_at DESC
        LIMIT ${capped}
      `;
  return rows.map((row) => ({
    id: row.id,
    profileId: row.synk_profile_id,
    synkCode: row.synk_code,
    name: row.name,
    appSlug: row.app_slug,
    purpose: row.purpose,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

async function revokePass(sql, { passId = null, profileId = null } = {}) {
  if (passId) {
    const rows = await sql`
      UPDATE synk_passes
      SET revoked_at = NOW()
      WHERE id = ${passId}
        AND revoked_at IS NULL
        AND consumed_at IS NULL
      RETURNING id, synk_profile_id
    `;
    return { count: rows.length, passId: rows[0]?.id || null, profileId: rows[0]?.synk_profile_id || null };
  }
  if (profileId) {
    const rows = await sql`
      UPDATE synk_passes
      SET revoked_at = NOW()
      WHERE synk_profile_id = ${profileId}
        AND revoked_at IS NULL
        AND consumed_at IS NULL
        AND expires_at > NOW()
      RETURNING id
    `;
    return { count: rows.length, profileId };
  }
  return { count: 0 };
}

async function requireSynkApp(sql, event, body = {}) {
  const headers = event.headers || {};
  const key =
    headers["x-synk-key"] ||
    headers["X-Synk-Key"] ||
    body.apiKey ||
    body.appKey ||
    "";
  const slug = String(body.appSlug || body.app || headers["x-synk-app"] || "").trim();
  if (!key) return { ok: false, error: "Synk app key required" };

  const rows = slug
    ? await sql`
        SELECT id, slug, name, api_key_hash, enabled, verify_action, business_id
        FROM synk_apps
        WHERE slug = ${slug}
        LIMIT 1
      `
    : await sql`
        SELECT id, slug, name, api_key_hash, enabled, verify_action, business_id
        FROM synk_apps
        WHERE enabled = TRUE
        ORDER BY created_at ASC
        LIMIT 50
      `;

  for (const row of rows) {
    if (!row.enabled) continue;
    if (verifySecret(key, row.api_key_hash)) {
      return {
        ok: true,
        app: {
          id: row.id,
          slug: row.slug,
          name: row.name,
          verifyAction: normalizeVerifyAction(row.verify_action),
          businessId: row.business_id || null,
        },
      };
    }
  }
  return { ok: false, error: "Unauthorized Synk app" };
}

async function issueHubSession(sql, { profileId }) {
  const token = mintPassToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + HUB_SESSION_TTL_MS).toISOString();
  await sql`
    INSERT INTO synk_hub_sessions (synk_profile_id, token_hash, expires_at)
    VALUES (${profileId}, ${tokenHash}, ${expiresAt}::timestamptz)
  `;
  return {
    token,
    expiresAt,
    ttlSeconds: Math.round(HUB_SESSION_TTL_MS / 1000),
  };
}

function extractHubSessionToken(event, body = {}) {
  const headers = event.headers || {};
  const auth = headers.authorization || headers.Authorization || "";
  if (String(auth).toLowerCase().startsWith("bearer ")) {
    return String(auth).slice(7).trim();
  }
  const header =
    headers["x-synk-hub-session"] || headers["X-Synk-Hub-Session"] || "";
  if (header) return String(header).trim();
  if (body && body.hubToken) return String(body.hubToken).trim();
  if (body && body.sessionToken) return String(body.sessionToken).trim();
  return "";
}

async function requireHubSession(sql, event, body = {}) {
  await ensureSynkCoreTables(sql);
  const token = extractHubSessionToken(event, body);
  if (!token) return { ok: false, status: 401, error: "Sign in to Synk first" };
  const tokenHash = hashToken(token);
  const rows = await sql`
    SELECT s.id, s.synk_profile_id, s.expires_at, s.revoked_at,
           p.synk_code, p.name, p.photo_url, p.enabled,
           c.public_username
    FROM synk_hub_sessions s
    JOIN synk_profiles p ON p.id = s.synk_profile_id
    LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.id
    WHERE s.token_hash = ${tokenHash}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.revoked_at) {
    return { ok: false, status: 401, error: "Session expired. Log in again." };
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, status: 401, error: "Session expired. Log in again." };
  }
  if (row.enabled === false) {
    return { ok: false, status: 403, error: "This Synk membership is paused" };
  }
  await sql`UPDATE synk_hub_sessions SET last_seen_at = NOW() WHERE id = ${row.id}`;
  return {
    ok: true,
    sessionId: row.id,
    profile: {
      id: row.synk_profile_id,
      synkCode: row.synk_code,
      name: row.name,
      photoUrl: row.photo_url || "",
      publicUsername: row.public_username || "",
    },
  };
}

function normalizePublicUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 24);
}

module.exports = {
  hashSecret,
  verifySecret,
  generateSynkCode,
  generateApiKey,
  hashToken,
  mintPassToken,
  signClaims,
  verifySignedClaims,
  clientIp,
  sleep,
  ensureSynkCoreTables,
  logSynkEvent,
  assertNotRateLimited,
  issuePass,
  consumePass,
  listActivePasses,
  revokePass,
  requireSynkApp,
  issueHubSession,
  requireHubSession,
  extractHubSessionToken,
  normalizePublicUsername,
  normalizeVerifyAction,
  getAppVerifyAction,
  seedVisitorSignInBusiness,
  PASS_TTL_MS,
  HUB_SESSION_TTL_MS,
  RATE_MAX_ATTEMPTS,
};
