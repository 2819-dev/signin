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
const HUB_SESSION_SHORT_TTL_MS = 12 * 60 * 60 * 1000;
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

const COMMUNITY_OWNER_USERNAME = String(
  process.env.SYNK_COMMUNITY_OWNER_USERNAME || "vision"
)
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_]+/g, "")
  .slice(0, 24) || "vision";

function normalizeGroupSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function normalizeGroupName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function normalizeGroupDescription(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 280);
}

function normalizeCommunityRole(value) {
  const role = String(value || "")
    .trim()
    .toLowerCase();
  return role === "owner" || role === "admin" ? role : null;
}

function mapCommunityGroup(row) {
  if (!row) return null;
  const theme = String(row.theme || "standard").toLowerCase() === "discord" ? "discord" : "standard";
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || "",
    theme,
    isOfficial: row.is_official === true,
    createdBy: row.created_by || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    postCount: row.post_count != null ? Number(row.post_count) : undefined,
    memberCount: row.member_count != null ? Number(row.member_count) : undefined,
    categories: Array.isArray(row.categories) ? row.categories : undefined,
    channels: Array.isArray(row.channels) ? row.channels : undefined,
    roles: Array.isArray(row.roles) ? row.roles : undefined,
  };
}

function formatChannelLabel(emoji, name) {
  const e = String(emoji || "").trim();
  const n = String(name || "").trim();
  if (e && n) return `${e} | ${n}`;
  return n || e || "channel";
}

function mapCommunityChannel(row) {
  if (!row) return null;
  const emoji = String(row.emoji || "").trim();
  const name = String(row.name || "").trim();
  return {
    id: row.id,
    groupId: row.group_id,
    categoryId: row.category_id || null,
    emoji,
    name,
    slug: row.slug,
    description: row.description || "",
    sortOrder: Number(row.sort_order) || 0,
    label: formatChannelLabel(emoji, name),
  };
}

function mapCommunityCategory(row) {
  if (!row) return null;
  return {
    id: row.id,
    groupId: row.group_id,
    name: String(row.name || "").trim(),
    sortOrder: Number(row.sort_order) || 0,
  };
}

function mapCommunityGroupRole(row) {
  if (!row) return null;
  return {
    id: row.id,
    groupId: row.group_id,
    name: String(row.name || "").trim(),
    color: String(row.color || "#94a3b8").trim() || "#94a3b8",
    sortOrder: Number(row.sort_order) || 0,
    memberCount: row.member_count != null ? Number(row.member_count) : undefined,
  };
}

function normalizeRoleName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 32);
}

function normalizeRoleColor(value) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const r = raw.slice(1);
    return `#${r[0]}${r[0]}${r[1]}${r[1]}${r[2]}${r[2]}`.toLowerCase();
  }
  return "#94a3b8";
}

function normalizeChannelSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function ensureSynkCommunityExtras(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_staff (
      synk_profile_id UUID PRIMARY KEY REFERENCES synk_profiles(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'admin',
      created_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT synk_community_staff_role_chk CHECK (role IN ('owner', 'admin'))
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS synk_community_staff_one_owner_idx
    ON synk_community_staff (role)
    WHERE role = 'owner'
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS synk_community_groups_slug_idx
    ON synk_community_groups (slug)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_groups_created_idx
    ON synk_community_groups (created_at DESC)
  `;

  await sql`ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS group_id UUID`;
  try {
    await sql`
      ALTER TABLE synk_community_posts
      ADD CONSTRAINT synk_community_posts_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES synk_community_groups(id) ON DELETE CASCADE
    `;
  } catch (_) {
    // Constraint already exists.
  }
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_posts_group_created_idx
    ON synk_community_posts (group_id, created_at DESC)
  `;

  await sql`ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS author_username TEXT`;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_posts_author_username_idx
    ON synk_community_posts (author_username)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_alt_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      public_username TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS synk_community_alt_accounts_username_idx
    ON synk_community_alt_accounts (public_username)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_alt_accounts_owner_idx
    ON synk_community_alt_accounts (owner_synk_profile_id, created_at ASC)
  `;

  // Backfill author_username from each member's primary community username.
  await sql`
    UPDATE synk_community_posts p
    SET author_username = c.public_username
    FROM synk_community_profiles c
    WHERE p.synk_profile_id = c.synk_profile_id
      AND (p.author_username IS NULL OR btrim(p.author_username) = '')
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS synk_community_tags_slug_idx
    ON synk_community_tags (slug)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_tags_created_idx
    ON synk_community_tags (created_at DESC)
  `;
  await sql`ALTER TABLE synk_community_tags ADD COLUMN IF NOT EXISTS icon_url TEXT`;
  await sql`ALTER TABLE synk_community_tags ADD COLUMN IF NOT EXISTS learn_more_enabled BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE synk_community_tags ADD COLUMN IF NOT EXISTS learn_more_page_id UUID`;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_info_pages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      hero_image_url TEXT NOT NULL DEFAULT '',
      blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS synk_info_pages_slug_idx ON synk_info_pages (slug)`;
  await sql`CREATE INDEX IF NOT EXISTS synk_info_pages_updated_idx ON synk_info_pages (updated_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_beta_agenda_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS synk_beta_agenda_active_idx ON synk_beta_agenda_items (active, sort_order ASC, created_at ASC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_beta_agenda_checks (
      agenda_item_id UUID NOT NULL REFERENCES synk_beta_agenda_items(id) ON DELETE CASCADE,
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (agenda_item_id, synk_profile_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_beta_feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS synk_beta_feedback_created_idx ON synk_beta_feedback (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS synk_beta_feedback_profile_idx ON synk_beta_feedback (synk_profile_id, created_at DESC)`;


  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_profile_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      tag_id UUID NOT NULL REFERENCES synk_community_tags(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (synk_profile_id, tag_id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_profile_tags_profile_idx
    ON synk_community_profile_tags (synk_profile_id, created_at ASC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_profile_tags_tag_idx
    ON synk_community_profile_tags (tag_id)
  `;

  await sql`ALTER TABLE synk_community_profiles ADD COLUMN IF NOT EXISTS pinned_tag_id UUID`;
  await sql`ALTER TABLE synk_community_profiles ADD COLUMN IF NOT EXISTS display_name TEXT`;
  await sql`ALTER TABLE synk_community_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT`;
  try {
    await sql`
      ALTER TABLE synk_community_profiles
      ADD CONSTRAINT synk_community_profiles_pinned_tag_id_fkey
      FOREIGN KEY (pinned_tag_id) REFERENCES synk_community_tags(id) ON DELETE SET NULL
    `;
  } catch (_) {
    // Constraint already exists.
  }

  await sql`ALTER TABLE synk_community_alt_accounts ADD COLUMN IF NOT EXISTS pinned_tag_id UUID`;
  await sql`ALTER TABLE synk_community_alt_accounts ADD COLUMN IF NOT EXISTS display_name TEXT`;
  await sql`ALTER TABLE synk_community_alt_accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT`;
  try {
    await sql`
      ALTER TABLE synk_community_alt_accounts
      ADD CONSTRAINT synk_community_alt_accounts_pinned_tag_id_fkey
      FOREIGN KEY (pinned_tag_id) REFERENCES synk_community_tags(id) ON DELETE SET NULL
    `;
  } catch (_) {
    // Constraint already exists.
  }

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_username_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      public_username TEXT NOT NULL,
      tag_id UUID NOT NULL REFERENCES synk_community_tags(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (public_username, tag_id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_username_tags_username_idx
    ON synk_community_username_tags (public_username, created_at ASC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_username_tags_tag_idx
    ON synk_community_username_tags (tag_id)
  `;

  // Migrate legacy profile-scoped tags into username-scoped tags.
  await sql`
    INSERT INTO synk_community_username_tags (public_username, tag_id, assigned_by, created_at)
    SELECT c.public_username, pt.tag_id, pt.assigned_by, pt.created_at
    FROM synk_community_profile_tags pt
    JOIN synk_community_profiles c ON c.synk_profile_id = pt.synk_profile_id
    WHERE c.public_username IS NOT NULL AND btrim(c.public_username) <> ''
    ON CONFLICT (public_username, tag_id) DO NOTHING
  `;

  // Post fields for typed posts, scoring, and polls.
  await sql`ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS title TEXT`;
  await sql`ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'text'`;
  await sql`ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS link_url TEXT`;
  await sql`ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS image_url TEXT`;
  await sql`ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS poll_options JSONB`;
  await sql`ALTER TABLE synk_community_posts ALTER COLUMN body SET DEFAULT ''`;
  try {
    await sql`ALTER TABLE synk_community_posts ALTER COLUMN body DROP NOT NULL`;
  } catch (_) {
    // Already nullable or unsupported.
  }
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_posts_score_created_idx
    ON synk_community_posts (score DESC, created_at DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES synk_community_posts(id) ON DELETE CASCADE,
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      parent_id UUID REFERENCES synk_community_comments(id) ON DELETE CASCADE,
      author_username TEXT,
      body TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_comments_post_created_idx
    ON synk_community_comments (post_id, created_at ASC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_comments_parent_idx
    ON synk_community_comments (parent_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_votes (
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_id UUID NOT NULL,
      value SMALLINT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (synk_profile_id, target_type, target_id),
      CONSTRAINT synk_community_votes_type_chk CHECK (target_type IN ('post', 'comment')),
      CONSTRAINT synk_community_votes_value_chk CHECK (value IN (-1, 1))
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_votes_target_idx
    ON synk_community_votes (target_type, target_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_saves (
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      post_id UUID NOT NULL REFERENCES synk_community_posts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (synk_profile_id, post_id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_saves_profile_created_idx
    ON synk_community_saves (synk_profile_id, created_at DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_hides (
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      post_id UUID NOT NULL REFERENCES synk_community_posts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (synk_profile_id, post_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_memberships (
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      group_id UUID NOT NULL REFERENCES synk_community_groups(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (synk_profile_id, group_id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_memberships_group_idx
    ON synk_community_memberships (group_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_poll_votes (
      post_id UUID NOT NULL REFERENCES synk_community_posts(id) ON DELETE CASCADE,
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      option_index INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (post_id, synk_profile_id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_poll_votes_post_idx
    ON synk_community_poll_votes (post_id, option_index)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      actor_username TEXT,
      post_id UUID REFERENCES synk_community_posts(id) ON DELETE CASCADE,
      comment_id UUID REFERENCES synk_community_comments(id) ON DELETE CASCADE,
      body TEXT NOT NULL DEFAULT '',
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_notifications_profile_created_idx
    ON synk_community_notifications (synk_profile_id, created_at DESC)
  `;

  await sql`ALTER TABLE synk_community_profiles ADD COLUMN IF NOT EXISTS bio TEXT`;
  await sql`ALTER TABLE synk_community_profiles ADD COLUMN IF NOT EXISTS dm_policy TEXT NOT NULL DEFAULT 'friends'`;
  await sql`ALTER TABLE synk_community_alt_accounts ADD COLUMN IF NOT EXISTS bio TEXT`;
  await sql`ALTER TABLE synk_community_alt_accounts ADD COLUMN IF NOT EXISTS dm_policy TEXT NOT NULL DEFAULT 'friends'`;
  await sql`
    UPDATE synk_community_profiles
    SET dm_policy = 'friends'
    WHERE dm_policy IS NULL
       OR btrim(dm_policy) = ''
       OR lower(dm_policy) NOT IN ('friends', 'nobody', 'everyone')
  `;
  await sql`
    UPDATE synk_community_alt_accounts
    SET dm_policy = 'friends'
    WHERE dm_policy IS NULL
       OR btrim(dm_policy) = ''
       OR lower(dm_policy) NOT IN ('friends', 'nobody', 'everyone')
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_friendships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      requester_username TEXT NOT NULL,
      addressee_username TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT synk_community_friendships_status_chk
        CHECK (status IN ('pending', 'accepted')),
      UNIQUE (requester_username, addressee_username)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_friendships_addressee_idx
    ON synk_community_friendships (addressee_username)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_friendships_requester_idx
    ON synk_community_friendships (requester_username)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_dm_threads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_a TEXT NOT NULL,
      user_b TEXT NOT NULL,
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_a, user_b)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_dm_threads_user_a_idx
    ON synk_community_dm_threads (user_a)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_dm_threads_user_b_idx
    ON synk_community_dm_threads (user_b)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_dm_threads_last_message_idx
    ON synk_community_dm_threads (last_message_at DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_dm_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      thread_id UUID NOT NULL REFERENCES synk_community_dm_threads(id) ON DELETE CASCADE,
      sender_username TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_dm_messages_thread_created_idx
    ON synk_community_dm_messages (thread_id, created_at ASC)
  `;
  await sql`ALTER TABLE synk_community_dm_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ`;
  await sql`ALTER TABLE synk_community_dm_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ`;
  await sql`ALTER TABLE synk_community_dm_messages ADD COLUMN IF NOT EXISTS unsent_at TIMESTAMPTZ`;
  await sql`ALTER TABLE synk_community_dm_messages ADD COLUMN IF NOT EXISTS deleted_for_sender BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE synk_community_dm_messages ADD COLUMN IF NOT EXISTS deleted_for_recipient BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`ALTER TABLE synk_community_dm_messages ADD COLUMN IF NOT EXISTS edit_history JSONB NOT NULL DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE synk_community_dm_messages ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}'::jsonb`;

  await sql`ALTER TABLE synk_community_groups ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'standard'`;
  await sql`ALTER TABLE synk_community_groups ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT FALSE`;
  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_group_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES synk_community_groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_group_categories_group_idx
    ON synk_community_group_categories (group_id, sort_order ASC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_group_channels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES synk_community_groups(id) ON DELETE CASCADE,
      category_id UUID REFERENCES synk_community_group_categories(id) ON DELETE SET NULL,
      emoji TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS synk_community_group_channels_group_slug_idx
    ON synk_community_group_channels (group_id, slug)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_group_channels_group_idx
    ON synk_community_group_channels (group_id, sort_order ASC)
  `;
  await sql`ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS channel_id UUID`;
  try {
    await sql`
      ALTER TABLE synk_community_posts
      ADD CONSTRAINT synk_community_posts_channel_id_fkey
      FOREIGN KEY (channel_id) REFERENCES synk_community_group_channels(id) ON DELETE SET NULL
    `;
  } catch (_) {}
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_posts_channel_created_idx
    ON synk_community_posts (channel_id, created_at DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_group_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id UUID NOT NULL REFERENCES synk_community_groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#94a3b8',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS synk_community_group_roles_group_name_idx
    ON synk_community_group_roles (group_id, lower(name))
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_group_roles_group_idx
    ON synk_community_group_roles (group_id, sort_order ASC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS synk_community_group_role_members (
      role_id UUID NOT NULL REFERENCES synk_community_group_roles(id) ON DELETE CASCADE,
      username TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (role_id, username)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_community_group_role_members_username_idx
    ON synk_community_group_role_members (username)
  `;

  await ensureCommunityOwner(sql);
  await ensureOfficialSynkGroup(sql);
}

async function isCommunityUsernameTaken(sql, username, { exceptProfileId = null, exceptAltId = null } = {}) {
  const name = normalizePublicUsername(username);
  if (!name) return false;
  const profiles = await sql`
    SELECT synk_profile_id
    FROM synk_community_profiles
    WHERE public_username = ${name}
    LIMIT 1
  `;
  if (profiles[0] && profiles[0].synk_profile_id !== exceptProfileId) return true;
  const alts = await sql`
    SELECT id
    FROM synk_community_alt_accounts
    WHERE public_username = ${name}
    LIMIT 1
  `;
  if (alts[0] && alts[0].id !== exceptAltId) return true;
  return false;
}

async function listOwnerAltAccounts(sql, ownerProfileId) {
  if (!ownerProfileId) return [];
  const rows = await sql`
    SELECT id, owner_synk_profile_id, public_username, label, display_name, avatar_url, bio, dm_policy, created_at, updated_at
    FROM synk_community_alt_accounts
    WHERE owner_synk_profile_id = ${ownerProfileId}
    ORDER BY created_at ASC
  `;
  return rows.map((row) => ({
    id: row.id,
    username: row.public_username,
    label: row.label || "",
    displayName: String(row.display_name || "").trim(),
    avatarUrl: String(row.avatar_url || "").trim(),
    bio: normalizeBio(row.bio),
    dmPolicy: normalizeDmPolicy(row.dm_policy),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isAlt: true,
  }));
}

async function findCommunityAltAccount(sql, { id, username, ownerProfileId } = {}) {
  const altId = String(id || "").trim();
  const name = normalizePublicUsername(username);
  if (altId) {
    const rows = await sql`
      SELECT id, owner_synk_profile_id, public_username, label, created_at, updated_at
      FROM synk_community_alt_accounts
      WHERE id = ${altId}
      LIMIT 1
    `;
    if (!rows[0]) return null;
    if (ownerProfileId && rows[0].owner_synk_profile_id !== ownerProfileId) return null;
    return {
      id: rows[0].id,
      ownerProfileId: rows[0].owner_synk_profile_id,
      username: rows[0].public_username,
      label: rows[0].label || "",
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
      isAlt: true,
    };
  }
  if (name) {
    const rows = await sql`
      SELECT id, owner_synk_profile_id, public_username, label, created_at, updated_at
      FROM synk_community_alt_accounts
      WHERE public_username = ${name}
      LIMIT 1
    `;
    if (!rows[0]) return null;
    if (ownerProfileId && rows[0].owner_synk_profile_id !== ownerProfileId) return null;
    return {
      id: rows[0].id,
      ownerProfileId: rows[0].owner_synk_profile_id,
      username: rows[0].public_username,
      label: rows[0].label || "",
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at,
      isAlt: true,
    };
  }
  return null;
}

async function findCommunityPublicProfile(sql, username) {
  const name = normalizePublicUsername(username);
  if (!name) return null;

  const primary = await sql`
    SELECT
      c.synk_profile_id,
      c.public_username,
      c.display_name,
      c.avatar_url,
      c.bio,
      c.dm_policy,
      c.created_at,
      s.role
    FROM synk_community_profiles c
    LEFT JOIN synk_community_staff s ON s.synk_profile_id = c.synk_profile_id
    WHERE c.public_username = ${name}
    LIMIT 1
  `;
  if (primary[0]) {
    const counts = await sql`
      SELECT COUNT(*)::int AS post_count
      FROM synk_community_posts p
      LEFT JOIN synk_community_profiles c ON c.synk_profile_id = p.synk_profile_id
      WHERE COALESCE(NULLIF(btrim(p.author_username), ''), c.public_username) = ${name}
    `;
    const tags = await listUsernameTags(sql, name);
    const pinnedTag = tags.find((tag) => tag.pinned) || null;
    return {
      username: primary[0].public_username,
      displayName: String(primary[0].display_name || "").trim(),
      avatarUrl: String(primary[0].avatar_url || "").trim(),
      bio: normalizeBio(primary[0].bio),
      dmPolicy: normalizeDmPolicy(primary[0].dm_policy),
      role: normalizeCommunityRole(primary[0].role),
      isAlt: false,
      joinedAt: primary[0].created_at,
      postCount: counts[0] ? Number(counts[0].post_count) : 0,
      tags,
      pinnedTag,
    };
  }

  const alt = await sql`
    SELECT id, public_username, label, display_name, avatar_url, bio, dm_policy, created_at
    FROM synk_community_alt_accounts
    WHERE public_username = ${name}
    LIMIT 1
  `;
  if (!alt[0]) return null;
  const counts = await sql`
    SELECT COUNT(*)::int AS post_count
    FROM synk_community_posts
    WHERE author_username = ${name}
  `;
  const tags = await listUsernameTags(sql, name);
  const pinnedTag = tags.find((tag) => tag.pinned) || null;
  return {
    username: alt[0].public_username,
    displayName: String(alt[0].display_name || "").trim() || String(alt[0].label || "").trim(),
    avatarUrl: String(alt[0].avatar_url || "").trim(),
    bio: normalizeBio(alt[0].bio),
    dmPolicy: normalizeDmPolicy(alt[0].dm_policy),
    role: null,
    isAlt: true,
    joinedAt: alt[0].created_at,
    postCount: counts[0] ? Number(counts[0].post_count) : 0,
    tags,
    pinnedTag,
  };
}

function normalizeTagName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 32);
}

function normalizeTagSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function normalizeTagDescription(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 200);
}

function normalizeTagColor(value) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const h = raw.toLowerCase();
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  return "";
}

function mapCommunityTag(row, { pinned = false } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    color: row.color || "#6366f1",
    iconUrl: row.icon_url || null,
    learnMoreEnabled: row.learn_more_enabled === true,
    learnMorePageId: row.learn_more_page_id || null,
    learnMorePageSlug: row.learn_more_page_slug || row.info_page_slug || null,
    learnMorePageTitle: row.learn_more_page_title || row.info_page_title || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pinned: Boolean(pinned || row.pinned),
  };
}

function mapInfoPage(row, { includeBlocks = true } = {}) {
  if (!row) return null;
  let blocks = [];
  try {
    const raw = row.blocks;
    blocks = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw || "[]") : [];
  } catch (_) {
    blocks = [];
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary || "",
    heroImageUrl: row.hero_image_url || "",
    blocks: includeBlocks ? blocks : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizePageSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizePageTitle(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function normalizePageBlocks(value) {
  const list = Array.isArray(value) ? value : [];
  const out = [];
  for (const item of list.slice(0, 40)) {
    if (!item || typeof item !== "object") continue;
    const type = String(item.type || "").trim().toLowerCase();
    if (type === "heading") {
      const text = String(item.text || "").trim().slice(0, 160);
      if (text) out.push({ type: "heading", text });
    } else if (type === "paragraph" || type === "text") {
      const text = String(item.text || "").trim().slice(0, 4000);
      if (text) out.push({ type: "paragraph", text });
    } else if (type === "image") {
      const url = String(item.url || item.src || "").trim().slice(0, 800);
      if (!url) continue;
      if (!(url.startsWith("/api/") || /^https?:\/\//i.test(url))) continue;
      out.push({ type: "image", url, alt: String(item.alt || "").trim().slice(0, 120) });
    }
  }
  return out;
}

async function listInfoPages(sql) {
  const rows = await sql`
    SELECT id, slug, title, summary, hero_image_url, blocks, created_at, updated_at
    FROM synk_info_pages
    ORDER BY updated_at DESC
    LIMIT 200
  `;
  return rows.map((row) => mapInfoPage(row));
}

async function findInfoPage(sql, { id, slug } = {}) {
  const pageId = String(id || "").trim();
  const pageSlug = normalizePageSlug(slug);
  if (pageId) {
    const rows = await sql`
      SELECT id, slug, title, summary, hero_image_url, blocks, created_at, updated_at
      FROM synk_info_pages WHERE id = ${pageId} LIMIT 1
    `;
    return mapInfoPage(rows[0]);
  }
  if (pageSlug) {
    const rows = await sql`
      SELECT id, slug, title, summary, hero_image_url, blocks, created_at, updated_at
      FROM synk_info_pages WHERE slug = ${pageSlug} LIMIT 1
    `;
    return mapInfoPage(rows[0]);
  }
  return null;
}

function isBetaTesterTag(tag) {
  if (!tag) return false;
  const slug = String(tag.slug || "").toLowerCase();
  const name = String(tag.name || "").toLowerCase();
  return (
    slug === "beta-tester" ||
    slug === "beta_tester" ||
    slug === "betatester" ||
    slug.includes("beta-tester") ||
    name.includes("beta tester")
  );
}

async function listCommunityTags(sql) {
  const rows = await sql`
    SELECT
      t.id, t.name, t.slug, t.description, t.color, t.icon_url,
      t.learn_more_enabled, t.learn_more_page_id, t.created_by, t.created_at, t.updated_at,
      p.slug AS learn_more_page_slug,
      p.title AS learn_more_page_title
    FROM synk_community_tags t
    LEFT JOIN synk_info_pages p ON p.id = t.learn_more_page_id
    ORDER BY t.name ASC
  `;
  return rows.map((row) => mapCommunityTag(row));
}

async function findCommunityTag(sql, { id, slug } = {}) {
  const tagId = String(id || "").trim();
  const tagSlug = normalizeTagSlug(slug);
  if (tagId) {
    const rows = await sql`
      SELECT
        t.id, t.name, t.slug, t.description, t.color, t.icon_url,
        t.learn_more_enabled, t.learn_more_page_id, t.created_by, t.created_at, t.updated_at,
        p.slug AS learn_more_page_slug,
        p.title AS learn_more_page_title
      FROM synk_community_tags t
      LEFT JOIN synk_info_pages p ON p.id = t.learn_more_page_id
      WHERE t.id = ${tagId}
      LIMIT 1
    `;
    return mapCommunityTag(rows[0]);
  }
  if (tagSlug) {
    const rows = await sql`
      SELECT
        t.id, t.name, t.slug, t.description, t.color, t.icon_url,
        t.learn_more_enabled, t.learn_more_page_id, t.created_by, t.created_at, t.updated_at,
        p.slug AS learn_more_page_slug,
        p.title AS learn_more_page_title
      FROM synk_community_tags t
      LEFT JOIN synk_info_pages p ON p.id = t.learn_more_page_id
      WHERE t.slug = ${tagSlug}
      LIMIT 1
    `;
    return mapCommunityTag(rows[0]);
  }
  return null;
}

async function listProfileTags(sql, profileId) {
  if (!profileId) return [];
  const rows = await sql`
    SELECT
      t.id,
      t.name,
      t.slug,
      t.description,
      t.color,
      t.icon_url,
      t.created_at,
      t.updated_at,
      CASE WHEN c.pinned_tag_id = t.id THEN TRUE ELSE FALSE END AS pinned
    FROM synk_community_profile_tags pt
    JOIN synk_community_tags t ON t.id = pt.tag_id
    LEFT JOIN synk_community_profiles c ON c.synk_profile_id = pt.synk_profile_id
    WHERE pt.synk_profile_id = ${profileId}
    ORDER BY
      CASE WHEN c.pinned_tag_id = t.id THEN 0 ELSE 1 END,
      t.name ASC
  `;
  return rows.map((row) => mapCommunityTag(row, { pinned: row.pinned }));
}

async function getPinnedTagForProfile(sql, profileId) {
  if (!profileId) return null;
  const rows = await sql`
    SELECT t.id, t.name, t.slug, t.description, t.color, t.icon_url, t.created_at, t.updated_at
    FROM synk_community_profiles c
    JOIN synk_community_tags t ON t.id = c.pinned_tag_id
    WHERE c.synk_profile_id = ${profileId}
    LIMIT 1
  `;
  return mapCommunityTag(rows[0], { pinned: true });
}

async function listUsernameTags(sql, username) {
  const name = normalizePublicUsername(username);
  if (!name) return [];
  const rows = await sql`
    SELECT
      t.id,
      t.name,
      t.slug,
      t.description,
      t.color,
      t.icon_url,
      t.learn_more_enabled,
      t.learn_more_page_id,
      t.created_at,
      t.updated_at,
      p.slug AS learn_more_page_slug,
      p.title AS learn_more_page_title,
      CASE
        WHEN COALESCE(c.pinned_tag_id, a.pinned_tag_id) = t.id THEN TRUE
        ELSE FALSE
      END AS pinned
    FROM synk_community_username_tags ut
    JOIN synk_community_tags t ON t.id = ut.tag_id
    LEFT JOIN synk_info_pages p ON p.id = t.learn_more_page_id
    LEFT JOIN synk_community_profiles c ON c.public_username = ut.public_username
    LEFT JOIN synk_community_alt_accounts a ON a.public_username = ut.public_username
    WHERE ut.public_username = ${name}
    ORDER BY
      CASE WHEN COALESCE(c.pinned_tag_id, a.pinned_tag_id) = t.id THEN 0 ELSE 1 END,
      t.name ASC
  `;
  return rows.map((row) => mapCommunityTag(row, { pinned: row.pinned }));
}

async function getPinnedTagForUsername(sql, username) {
  const name = normalizePublicUsername(username);
  if (!name) return null;
  const primary = await sql`
    SELECT t.id, t.name, t.slug, t.description, t.color, t.icon_url, t.created_at, t.updated_at
    FROM synk_community_profiles c
    JOIN synk_community_tags t ON t.id = c.pinned_tag_id
    WHERE c.public_username = ${name}
    LIMIT 1
  `;
  if (primary[0]) return mapCommunityTag(primary[0], { pinned: true });
  const alt = await sql`
    SELECT t.id, t.name, t.slug, t.description, t.color, t.icon_url, t.created_at, t.updated_at
    FROM synk_community_alt_accounts a
    JOIN synk_community_tags t ON t.id = a.pinned_tag_id
    WHERE a.public_username = ${name}
    LIMIT 1
  `;
  return mapCommunityTag(alt[0], { pinned: true });
}

async function getPinnedTagsByUsernames(sql, usernames) {
  const names = Array.from(
    new Set((usernames || []).map((u) => normalizePublicUsername(u)).filter(Boolean))
  );
  if (!names.length) return {};
  const rows = await sql`
    SELECT
      x.public_username,
      t.id,
      t.name,
      t.slug,
      t.description,
      t.color,
      t.icon_url,
      t.created_at,
      t.updated_at
    FROM (
      SELECT public_username, pinned_tag_id
      FROM synk_community_profiles
      WHERE public_username = ANY(${names})
        AND pinned_tag_id IS NOT NULL
      UNION ALL
      SELECT public_username, pinned_tag_id
      FROM synk_community_alt_accounts
      WHERE public_username = ANY(${names})
        AND pinned_tag_id IS NOT NULL
    ) x
    JOIN synk_community_tags t ON t.id = x.pinned_tag_id
  `;
  const out = {};
  for (const row of rows) {
    out[row.public_username] = mapCommunityTag(row, { pinned: true });
  }
  return out;
}

async function assignUsernameTag(sql, username, tagId, assignedBy = null) {
  const name = normalizePublicUsername(username);
  if (!name || !tagId) return false;
  await sql`
    INSERT INTO synk_community_username_tags (public_username, tag_id, assigned_by)
    VALUES (${name}, ${tagId}, ${assignedBy})
    ON CONFLICT (public_username, tag_id) DO NOTHING
  `;
  // Keep legacy profile-tag rows in sync for primary usernames.
  const profile = await sql`
    SELECT synk_profile_id
    FROM synk_community_profiles
    WHERE public_username = ${name}
    LIMIT 1
  `;
  if (profile[0]) {
    await sql`
      INSERT INTO synk_community_profile_tags (synk_profile_id, tag_id, assigned_by)
      VALUES (${profile[0].synk_profile_id}, ${tagId}, ${assignedBy})
      ON CONFLICT (synk_profile_id, tag_id) DO NOTHING
    `;
  }
  return true;
}

async function unassignUsernameTag(sql, username, tagId) {
  const name = normalizePublicUsername(username);
  if (!name || !tagId) return false;
  await sql`
    DELETE FROM synk_community_username_tags
    WHERE public_username = ${name}
      AND tag_id = ${tagId}
  `;
  await sql`
    UPDATE synk_community_profiles
    SET pinned_tag_id = NULL
    WHERE public_username = ${name}
      AND pinned_tag_id = ${tagId}
  `;
  await sql`
    UPDATE synk_community_alt_accounts
    SET pinned_tag_id = NULL
    WHERE public_username = ${name}
      AND pinned_tag_id = ${tagId}
  `;
  const profile = await sql`
    SELECT synk_profile_id
    FROM synk_community_profiles
    WHERE public_username = ${name}
    LIMIT 1
  `;
  if (profile[0]) {
    await sql`
      DELETE FROM synk_community_profile_tags
      WHERE synk_profile_id = ${profile[0].synk_profile_id}
        AND tag_id = ${tagId}
    `;
  }
  return true;
}

async function setPinnedTagForUsername(sql, username, tagId) {
  const name = normalizePublicUsername(username);
  if (!name) return false;
  const primary = await sql`
    UPDATE synk_community_profiles
    SET pinned_tag_id = ${tagId}, updated_at = NOW()
    WHERE public_username = ${name}
    RETURNING synk_profile_id
  `;
  if (primary[0]) return true;
  const alt = await sql`
    UPDATE synk_community_alt_accounts
    SET pinned_tag_id = ${tagId}, updated_at = NOW()
    WHERE public_username = ${name}
    RETURNING id
  `;
  return Boolean(alt[0]);
}

async function findCommunityProfileIdByUsername(sql, username) {
  const name = normalizePublicUsername(username);
  if (!name) return null;
  const rows = await sql`
    SELECT synk_profile_id
    FROM synk_community_profiles
    WHERE public_username = ${name}
    LIMIT 1
  `;
  return rows[0] ? rows[0].synk_profile_id : null;
}

async function ensureCommunityOwner(sql) {
  const username = COMMUNITY_OWNER_USERNAME;
  const existingOwner = await sql`
    SELECT synk_profile_id, role
    FROM synk_community_staff
    WHERE role = 'owner'
    LIMIT 1
  `;
  const vision = await sql`
    SELECT synk_profile_id
    FROM synk_community_profiles
    WHERE public_username = ${username}
    LIMIT 1
  `;
  const visionId = vision[0] && vision[0].synk_profile_id;
  if (!visionId) return null;

  if (existingOwner[0] && existingOwner[0].synk_profile_id === visionId) {
    return visionId;
  }

  if (existingOwner[0] && existingOwner[0].synk_profile_id !== visionId) {
    // Keep a single owner: demote previous owner to admin, promote @vision.
    await sql`
      UPDATE synk_community_staff
      SET role = 'admin', updated_at = NOW()
      WHERE role = 'owner'
    `;
  }

  await sql`
    INSERT INTO synk_community_staff (synk_profile_id, role, created_by)
    VALUES (${visionId}, 'owner', ${visionId})
    ON CONFLICT (synk_profile_id) DO UPDATE
    SET role = 'owner', updated_at = NOW()
  `;
  return visionId;
}

async function ensureOfficialSynkGroup(sql) {
  const owner = await sql`
    SELECT synk_profile_id FROM synk_community_staff WHERE role = 'owner' LIMIT 1
  `;
  const createdBy = owner[0] ? owner[0].synk_profile_id : null;

  let group = null;
  const existing = await sql`
    SELECT id, slug, name, description, theme, is_official, created_by, created_at, updated_at
    FROM synk_community_groups
    WHERE slug = 'synk' OR is_official = TRUE
    ORDER BY CASE WHEN slug = 'synk' THEN 0 ELSE 1 END
    LIMIT 1
  `;
  if (existing[0]) {
    group = existing[0];
    await sql`
      UPDATE synk_community_groups
      SET
        slug = 'synk',
        name = 'Synk',
        description = COALESCE(NULLIF(btrim(description), ''), 'The official Synk community — announcements, help, and conversation.'),
        theme = 'discord',
        is_official = TRUE,
        updated_at = NOW()
      WHERE id = ${group.id}
    `;
  } else {
    try {
      const created = await sql`
        INSERT INTO synk_community_groups (slug, name, description, theme, is_official, created_by)
        VALUES (
          'synk',
          'Synk',
          'The official Synk community — announcements, help, and conversation.',
          'discord',
          TRUE,
          ${createdBy}
        )
        RETURNING id, slug, name, description, theme, is_official, created_by, created_at, updated_at
      `;
      group = created[0];
    } catch (err) {
      if (!(String(err.message || "").includes("unique") || err.code === "23505")) throw err;
      const again = await sql`
        SELECT id, slug, name, description, theme, is_official, created_by, created_at, updated_at
        FROM synk_community_groups
        WHERE slug = 'synk'
        LIMIT 1
      `;
      group = again[0] || null;
      if (group) {
        await sql`
          UPDATE synk_community_groups
          SET theme = 'discord', is_official = TRUE, updated_at = NOW()
          WHERE id = ${group.id}
        `;
      }
    }
  }
  if (!group) return null;

  // Seed Discord-style categories + channels once.
  const catCount = await sql`
    SELECT COUNT(*)::int AS count FROM synk_community_group_categories WHERE group_id = ${group.id}
  `;
  if (!(Number(catCount[0] && catCount[0].count) > 0)) {
    const blueprint = [
      {
        name: "INFORMATION",
        channels: [
          { emoji: "📢", name: "announcements", slug: "announcements", description: "Official Synk updates" },
          { emoji: "📜", name: "rules", slug: "rules", description: "Community guidelines" },
          { emoji: "🆕", name: "updates", slug: "updates", description: "Product and platform notes" },
        ],
      },
      {
        name: "COMMUNITY",
        channels: [
          { emoji: "💬", name: "general", slug: "general", description: "Everyday conversation" },
          { emoji: "👋", name: "introductions", slug: "introductions", description: "Say hello" },
          { emoji: "💡", name: "ideas", slug: "ideas", description: "Share ideas and requests" },
        ],
      },
      {
        name: "SUPPORT",
        channels: [
          { emoji: "🆘", name: "help", slug: "help", description: "Get help from the community" },
          { emoji: "🐛", name: "bugs", slug: "bugs", description: "Report bugs" },
          { emoji: "📣", name: "feedback", slug: "feedback", description: "Tell us what to improve" },
        ],
      },
    ];
    let catOrder = 0;
    for (const cat of blueprint) {
      const createdCat = await sql`
        INSERT INTO synk_community_group_categories (group_id, name, sort_order)
        VALUES (${group.id}, ${cat.name}, ${catOrder})
        RETURNING id
      `;
      const categoryId = createdCat[0].id;
      let chOrder = 0;
      for (const ch of cat.channels) {
        await sql`
          INSERT INTO synk_community_group_channels (
            group_id, category_id, emoji, name, slug, description, sort_order
          )
          VALUES (
            ${group.id}, ${categoryId}, ${ch.emoji}, ${ch.name}, ${ch.slug}, ${ch.description}, ${chOrder}
          )
          ON CONFLICT (group_id, slug) DO NOTHING
        `;
        chOrder += 1;
      }
      catOrder += 1;
    }
  }

  // Default roles (no icons — badges stay separate).
  const roleCount = await sql`
    SELECT COUNT(*)::int AS count FROM synk_community_group_roles WHERE group_id = ${group.id}
  `;
  if (!(Number(roleCount[0] && roleCount[0].count) > 0)) {
    const defaults = [
      { name: "Member", color: "#94a3b8", sort: 0 },
      { name: "Moderator", color: "#22c55e", sort: 1 },
      { name: "Admin", color: "#f59e0b", sort: 2 },
    ];
    for (const role of defaults) {
      try {
        await sql`
          INSERT INTO synk_community_group_roles (group_id, name, color, sort_order)
          VALUES (${group.id}, ${role.name}, ${role.color}, ${role.sort})
        `;
      } catch (err) {
        if (!(String(err.message || "").includes("unique") || err.code === "23505")) throw err;
      }
    }
  }

  await sql`
    UPDATE synk_community_posts
    SET group_id = ${group.id}
    WHERE group_id IS NULL
  `;
  return group.id;
}

async function listGroupCategories(sql, groupId) {
  if (!groupId) return [];
  const rows = await sql`
    SELECT id, group_id, name, sort_order
    FROM synk_community_group_categories
    WHERE group_id = ${groupId}
    ORDER BY sort_order ASC, name ASC
  `;
  return rows.map(mapCommunityCategory);
}

async function listGroupChannels(sql, groupId) {
  if (!groupId) return [];
  const rows = await sql`
    SELECT id, group_id, category_id, emoji, name, slug, description, sort_order
    FROM synk_community_group_channels
    WHERE group_id = ${groupId}
    ORDER BY sort_order ASC, name ASC
  `;
  return rows.map(mapCommunityChannel);
}

async function findGroupChannel(sql, { id, groupId, slug } = {}) {
  const channelId = String(id || "").trim();
  const gId = String(groupId || "").trim();
  const channelSlug = normalizeChannelSlug(slug);
  if (channelId) {
    const rows = await sql`
      SELECT id, group_id, category_id, emoji, name, slug, description, sort_order
      FROM synk_community_group_channels
      WHERE id = ${channelId}
      LIMIT 1
    `;
    return mapCommunityChannel(rows[0]);
  }
  if (gId && channelSlug) {
    const rows = await sql`
      SELECT id, group_id, category_id, emoji, name, slug, description, sort_order
      FROM synk_community_group_channels
      WHERE group_id = ${gId} AND slug = ${channelSlug}
      LIMIT 1
    `;
    return mapCommunityChannel(rows[0]);
  }
  return null;
}

async function listGroupRoles(sql, groupId) {
  if (!groupId) return [];
  const rows = await sql`
    SELECT
      r.id,
      r.group_id,
      r.name,
      r.color,
      r.sort_order,
      COUNT(m.username)::int AS member_count
    FROM synk_community_group_roles r
    LEFT JOIN synk_community_group_role_members m ON m.role_id = r.id
    WHERE r.group_id = ${groupId}
    GROUP BY r.id
    ORDER BY r.sort_order ASC, r.name ASC
  `;
  return rows.map(mapCommunityGroupRole);
}

async function hydrateCommunityGroup(sql, group) {
  if (!group) return null;
  const [categories, channels, roles, members] = await Promise.all([
    listGroupCategories(sql, group.id),
    listGroupChannels(sql, group.id),
    listGroupRoles(sql, group.id),
    sql`SELECT COUNT(*)::int AS count FROM synk_community_memberships WHERE group_id = ${group.id}`,
  ]);
  return {
    ...group,
    categories,
    channels,
    roles,
    memberCount: Number(members[0] && members[0].count) || 0,
  };
}

async function createGroupRole(sql, groupId, { name, color, sortOrder = 0 } = {}) {
  const roleName = normalizeRoleName(name);
  if (!roleName) return { ok: false, error: "Role name required" };
  try {
    const rows = await sql`
      INSERT INTO synk_community_group_roles (group_id, name, color, sort_order)
      VALUES (${groupId}, ${roleName}, ${normalizeRoleColor(color)}, ${Number(sortOrder) || 0})
      RETURNING id, group_id, name, color, sort_order
    `;
    return { ok: true, role: mapCommunityGroupRole(rows[0]) };
  } catch (err) {
    if (String(err.message || "").includes("unique") || err.code === "23505") {
      return { ok: false, error: "A role with that name already exists" };
    }
    throw err;
  }
}

async function updateGroupRole(sql, roleId, groupId, { name, color, sortOrder } = {}) {
  const id = String(roleId || "").trim();
  if (!id) return { ok: false, error: "Role required" };
  const existing = await sql`
    SELECT id, group_id, name, color, sort_order
    FROM synk_community_group_roles
    WHERE id = ${id} AND group_id = ${groupId}
    LIMIT 1
  `;
  if (!existing[0]) return { ok: false, error: "Role not found" };
  const nextName = name != null ? normalizeRoleName(name) : existing[0].name;
  if (!nextName) return { ok: false, error: "Role name required" };
  const nextColor = color != null ? normalizeRoleColor(color) : existing[0].color;
  const nextSort = sortOrder != null ? Number(sortOrder) || 0 : existing[0].sort_order;
  try {
    const rows = await sql`
      UPDATE synk_community_group_roles
      SET name = ${nextName}, color = ${nextColor}, sort_order = ${nextSort}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, group_id, name, color, sort_order
    `;
    return { ok: true, role: mapCommunityGroupRole(rows[0]) };
  } catch (err) {
    if (String(err.message || "").includes("unique") || err.code === "23505") {
      return { ok: false, error: "A role with that name already exists" };
    }
    throw err;
  }
}

async function deleteGroupRole(sql, roleId, groupId) {
  const id = String(roleId || "").trim();
  if (!id) return { ok: false, error: "Role required" };
  const deleted = await sql`
    DELETE FROM synk_community_group_roles
    WHERE id = ${id} AND group_id = ${groupId}
    RETURNING id
  `;
  return { ok: true, deleted: deleted.length > 0 };
}

async function getCommunityStaffRole(sql, profileId) {
  if (!profileId) return null;
  await ensureCommunityOwner(sql);
  const rows = await sql`
    SELECT role
    FROM synk_community_staff
    WHERE synk_profile_id = ${profileId}
    LIMIT 1
  `;
  return normalizeCommunityRole(rows[0] && rows[0].role);
}

function isCommunityStaffRole(role) {
  return role === "owner" || role === "admin";
}

async function listCommunityStaff(sql) {
  await ensureCommunityOwner(sql);
  const rows = await sql`
    SELECT
      s.synk_profile_id,
      s.role,
      s.created_at,
      s.updated_at,
      c.public_username,
      p.name
    FROM synk_community_staff s
    JOIN synk_profiles p ON p.id = s.synk_profile_id
    LEFT JOIN synk_community_profiles c ON c.synk_profile_id = s.synk_profile_id
    ORDER BY
      CASE s.role WHEN 'owner' THEN 0 ELSE 1 END,
      c.public_username ASC NULLS LAST,
      p.name ASC
  `;
  return rows.map((row) => ({
    profileId: row.synk_profile_id,
    role: row.role,
    username: row.public_username || "",
    name: row.name || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function listCommunityGroups(sql) {
  await ensureOfficialSynkGroup(sql);
  const rows = await sql`
    SELECT
      g.id,
      g.slug,
      g.name,
      g.description,
      g.theme,
      g.is_official,
      g.created_by,
      g.created_at,
      g.updated_at,
      COUNT(DISTINCT p.id)::int AS post_count,
      COUNT(DISTINCT mem.synk_profile_id)::int AS member_count
    FROM synk_community_groups g
    LEFT JOIN synk_community_posts p ON p.group_id = g.id
    LEFT JOIN synk_community_memberships mem ON mem.group_id = g.id
    GROUP BY g.id
    ORDER BY
      CASE WHEN g.is_official THEN 0 WHEN g.slug = 'synk' THEN 0 ELSE 1 END,
      g.name ASC
  `;
  return rows.map(mapCommunityGroup);
}

async function findCommunityGroup(sql, { id, slug } = {}) {
  const groupId = String(id || "").trim();
  const groupSlug = normalizeGroupSlug(slug);
  if (groupId) {
    const rows = await sql`
      SELECT id, slug, name, description, theme, is_official, created_by, created_at, updated_at
      FROM synk_community_groups
      WHERE id = ${groupId}
      LIMIT 1
    `;
    return mapCommunityGroup(rows[0]);
  }
  if (groupSlug) {
    const rows = await sql`
      SELECT id, slug, name, description, theme, is_official, created_by, created_at, updated_at
      FROM synk_community_groups
      WHERE slug = ${groupSlug}
      LIMIT 1
    `;
    return mapCommunityGroup(rows[0]);
  }
  return null;
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
    CREATE TABLE IF NOT EXISTS synk_business_devices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES synk_business_accounts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      camera_side TEXT NOT NULL DEFAULT 'left',
      pairing_code TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_business_devices_business_idx
    ON synk_business_devices (business_id, created_at DESC)
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS synk_business_devices_code_idx
    ON synk_business_devices (pairing_code)
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
    CREATE TABLE IF NOT EXISTS synk_admin_act_as_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token_hash TEXT NOT NULL UNIQUE,
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      hub_session_token TEXT NOT NULL,
      hub_expires_at TIMESTAMPTZ NOT NULL,
      admin_username TEXT NOT NULL DEFAULT '',
      next_path TEXT NOT NULL DEFAULT '/hub',
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS synk_admin_act_as_expires_idx ON synk_admin_act_as_tokens (expires_at)`;
  await sql`ALTER TABLE synk_admin_act_as_tokens ADD COLUMN IF NOT EXISTS hub_session_token TEXT`;
  await sql`ALTER TABLE synk_admin_act_as_tokens ADD COLUMN IF NOT EXISTS hub_expires_at TIMESTAMPTZ`;

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

  await ensureSynkCommunityExtras(sql);

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
  await sql`ALTER TABLE synk_join_requests ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE synk_profiles ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''`;

  await sql`ALTER TABLE synk_business_accounts ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'custom'`;
  await sql`ALTER TABLE synk_business_accounts ADD COLUMN IF NOT EXISTS website TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE synk_business_accounts ADD COLUMN IF NOT EXISTS preferred_verify_action TEXT NOT NULL DEFAULT 'identity'`;
  await sql`ALTER TABLE synk_business_accounts ADD COLUMN IF NOT EXISTS product_summary TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE synk_apps ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'custom'`;

  await ensureSynkPlacesTable(sql);
  await ensureSynkAppMemberPolicies(sql);
  await seedVisitorSignInBusiness(sql);
}

async function ensureSynkPlacesTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS synk_places (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      website_url TEXT NOT NULL DEFAULT '',
      logo_url TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_places_enabled_sort_idx
    ON synk_places (enabled, sort_order ASC, name ASC)
  `;
}

async function ensureSynkAppMemberPolicies(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS synk_app_member_policies (
      app_slug TEXT NOT NULL,
      synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
      policy TEXT NOT NULL DEFAULT 'pending',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (app_slug, synk_profile_id)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_app_member_policies_profile_idx
    ON synk_app_member_policies (synk_profile_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS synk_events_app_verify_idx
    ON synk_events (app_slug, event_type, created_at DESC)
  `;
}

async function getMemberAppPolicy(sql, appSlug, profileId) {
  const slug = String(appSlug || "")
    .trim()
    .slice(0, 80);
  const id = String(profileId || "").trim();
  if (!slug || !id) return null;
  await ensureSynkAppMemberPolicies(sql);
  const rows = await sql`
    SELECT policy
    FROM synk_app_member_policies
    WHERE app_slug = ${slug}
      AND synk_profile_id = ${id}
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return normalizeVerifyAction(rows[0].policy);
}

async function resolveVisitorVerifyAction(sql, appSlug, profileId) {
  const memberPolicy = await getMemberAppPolicy(sql, appSlug, profileId);
  if (memberPolicy) return memberPolicy;
  return getAppVerifyAction(sql, appSlug);
}

async function memberSignedIntoApp(sql, appSlug, profileId) {
  const slug = String(appSlug || "")
    .trim()
    .slice(0, 80);
  const id = String(profileId || "").trim();
  if (!slug || !id) return false;
  const rows = await sql`
    SELECT id
    FROM synk_events
    WHERE event_type = 'verify_ok'
      AND app_slug = ${slug}
      AND synk_profile_id = ${id}
    LIMIT 1
  `;
  return Boolean(rows[0]);
}

async function listRecentAppMembers(sql, appSlug, { days = 30, limit = 100 } = {}) {
  const slug = String(appSlug || "")
    .trim()
    .slice(0, 80);
  if (!slug) return { members: [], appDefault: "pending" };
  await ensureSynkAppMemberPolicies(sql);

  const windowDays = Math.min(90, Math.max(1, Number(days) || 30));
  const maxRows = Math.min(200, Math.max(1, Number(limit) || 100));
  const appDefault = await getAppVerifyAction(sql, slug);

  // Name-only list of members who recently verified into THIS app.
  // Never returns photo, DOB, email, Synk code, or other personal details.
  const rows = await sql`
    SELECT
      p.id,
      p.name,
      recent.last_seen_at,
      pol.policy AS override_policy
    FROM (
      SELECT synk_profile_id, MAX(created_at) AS last_seen_at
      FROM synk_events
      WHERE event_type = 'verify_ok'
        AND app_slug = ${slug}
        AND synk_profile_id IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY synk_profile_id
    ) recent
    JOIN synk_profiles p ON p.id = recent.synk_profile_id
    LEFT JOIN synk_app_member_policies pol
      ON pol.synk_profile_id = p.id
     AND pol.app_slug = ${slug}
    ORDER BY recent.last_seen_at DESC
    LIMIT ${maxRows}
  `;

  return {
    appSlug: slug,
    appDefault,
    members: rows.map((row) => {
      const hasOverride = row.override_policy != null && row.override_policy !== "";
      const policy = hasOverride
        ? normalizeVerifyAction(row.override_policy)
        : appDefault;
      return {
        id: row.id,
        name: row.name,
        policy,
        hasOverride,
        lastSeenAt: row.last_seen_at,
      };
    }),
  };
}

async function setMemberAppPolicy(sql, appSlug, profileId, policy) {
  const slug = String(appSlug || "")
    .trim()
    .slice(0, 80);
  const id = String(profileId || "").trim();
  if (!slug || !id) {
    return { ok: false, error: "Member and app are required" };
  }

  const signedIn = await memberSignedIntoApp(sql, slug, id);
  if (!signedIn) {
    return { ok: false, error: "Only members who signed into your app can be managed" };
  }

  await ensureSynkAppMemberPolicies(sql);
  const action = String(policy || "")
    .trim()
    .toLowerCase();

  if (action === "default" || action === "clear" || action === "reset") {
    await sql`
      DELETE FROM synk_app_member_policies
      WHERE app_slug = ${slug}
        AND synk_profile_id = ${id}
    `;
    return {
      ok: true,
      policy: await getAppVerifyAction(sql, slug),
      hasOverride: false,
    };
  }

  const next = normalizeVerifyAction(action);
  await sql`
    INSERT INTO synk_app_member_policies (app_slug, synk_profile_id, policy, updated_at)
    VALUES (${slug}, ${id}, ${next}, NOW())
    ON CONFLICT (app_slug, synk_profile_id)
    DO UPDATE SET policy = EXCLUDED.policy, updated_at = NOW()
  `;
  return { ok: true, policy: next, hasOverride: true };
}

function normalizeVerifyAction(value) {
  const action = String(value || "")
    .trim()
    .toLowerCase();
  // identity = Synk confirmed who they are; the integrating app decides what happens next.
  // pending/autofill/auto_admit/auto_deny are mainly for check-in / access flows.
  return ["identity", "pending", "autofill", "auto_admit", "auto_deny"].includes(action)
    ? action
    : "identity";
}

const PRODUCT_TYPES = {
  visitor_checkin: {
    id: "visitor_checkin",
    label: "Visitor / front desk check-in",
    blurb: "People check in on a tablet. Staff can approve, deny, or prefill details.",
    defaultAction: "pending",
    actions: ["pending", "autofill", "auto_admit", "auto_deny"],
  },
  access_control: {
    id: "access_control",
    label: "Door, room, or gate access",
    blurb: "Synk verifies the person, then your system allows or blocks entry.",
    defaultAction: "auto_admit",
    actions: ["auto_admit", "auto_deny", "pending", "identity"],
  },
  account_login: {
    id: "account_login",
    label: "Account login / identity",
    blurb: "Synk confirms who they are so your product can open their account.",
    defaultAction: "identity",
    actions: ["identity"],
  },
  event_checkin: {
    id: "event_checkin",
    label: "Event or attendance check-in",
    blurb: "Log that a member arrived. Optional staff review for restricted events.",
    defaultAction: "identity",
    actions: ["identity", "auto_admit", "pending"],
  },
  custom: {
    id: "custom",
    label: "Custom product / API",
    blurb: "You handle the rest in your app after Synk verifies the person.",
    defaultAction: "identity",
    actions: ["identity", "pending", "autofill", "auto_admit", "auto_deny"],
  },
};

function normalizeProductType(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (PRODUCT_TYPES[key]) return key;
  // Friendly aliases from forms / older copy
  if (key === "visitor" || key === "visitors" || key === "front_desk") return "visitor_checkin";
  if (key === "access" || key === "door" || key === "gate") return "access_control";
  if (key === "login" || key === "identity" || key === "auth") return "account_login";
  if (key === "event" || key === "attendance") return "event_checkin";
  return "custom";
}

function getProductTypeConfig(value) {
  return PRODUCT_TYPES[normalizeProductType(value)] || PRODUCT_TYPES.custom;
}

function defaultVerifyActionForProduct(productType) {
  return getProductTypeConfig(productType).defaultAction;
}

function verifyActionAllowedForProduct(productType, action) {
  const cfg = getProductTypeConfig(productType);
  const normalized = normalizeVerifyAction(action);
  return cfg.actions.includes(normalized) ? normalized : cfg.defaultAction;
}

function verifyActionLabel(action) {
  switch (normalizeVerifyAction(action)) {
    case "auto_admit":
      return "Allow automatically";
    case "auto_deny":
      return "Block automatically";
    case "autofill":
      return "Return name to fill a form";
    case "pending":
      return "Wait for staff / host approval";
    case "identity":
    default:
      return "Confirm identity only (app decides next)";
  }
}

/** Kiosk / tablet pairing only makes sense for desk, door, or event surfaces. */
function productUsesDevices(productType) {
  const key = normalizeProductType(productType);
  return key === "visitor_checkin" || key === "access_control" || key === "event_checkin";
}

function normalizeWebsite(value) {
  return String(value || "")
    .trim()
    .slice(0, 200);
}

function normalizeProductSummary(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 280);
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
        name, contact_name, email, password_hash, status, note, product_type, preferred_verify_action, reviewed_at
      )
      VALUES (
        'Visitor Sign-In',
        'Visitor Sign-In',
        ${email},
        ${password ? hashSecret(password) : null},
        'approved',
        'Built-in business account for the Visitor Sign-In product.',
        'visitor_checkin',
        'pending',
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
    await sql`
      UPDATE synk_business_accounts
      SET
        product_type = COALESCE(NULLIF(product_type, ''), 'visitor_checkin'),
        preferred_verify_action = COALESCE(NULLIF(preferred_verify_action, ''), 'pending'),
        updated_at = NOW()
      WHERE id = ${businessId}
    `;
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
      INSERT INTO synk_apps (slug, name, api_key_hash, business_id, verify_action, product_type)
      VALUES (
        'visitor-signin',
        'Visitor Sign-In',
        ${hashSecret(bootstrapKey)},
        ${businessId},
        'pending',
        'visitor_checkin'
      )
    `;
  } else {
    await sql`
      UPDATE synk_apps
      SET
        business_id = COALESCE(business_id, ${businessId}),
        verify_action = COALESCE(NULLIF(verify_action, ''), 'pending'),
        product_type = COALESCE(NULLIF(product_type, ''), 'visitor_checkin'),
        updated_at = NOW()
      WHERE id = ${apps[0].id}
    `;
  }
}

async function getAppVerifyAction(sql, appSlug) {
  const slug = String(appSlug || "")
    .trim()
    .slice(0, 80);
  if (!slug) return "identity";
  const rows = await sql`
    SELECT verify_action
    FROM synk_apps
    WHERE slug = ${slug}
    LIMIT 1
  `;
  const raw = rows[0] && rows[0].verify_action;
  if (!raw) {
    return slug === "visitor-signin" ? "pending" : "identity";
  }
  return normalizeVerifyAction(raw);
}

function isFirstPartySynkApp(slug) {
  const value = String(slug || "")
    .trim()
    .toLowerCase();
  // Main Synk ID app (profile / hub / member login) — never requires business pairing.
  return !value || value === "synk" || value === "synk-id" || value === "synkid";
}

async function getAppSynkStatus(sql, appSlug) {
  const slug = String(appSlug || "")
    .trim()
    .slice(0, 80);
  if (isFirstPartySynkApp(slug)) {
    return {
      ok: true,
      paired: true,
      enabled: true,
      code: "ok",
      error: null,
      firstParty: true,
      app: {
        id: null,
        slug: slug || "synk",
        name: "Synk",
        verifyAction: "pending",
      },
      business: null,
    };
  }
  if (!slug) {
    return {
      ok: false,
      paired: false,
      enabled: false,
      code: "missing_app",
      error: "App is required",
      app: null,
      business: null,
    };
  }

  const rows = await sql`
    SELECT
      a.id,
      a.slug,
      a.name,
      a.enabled,
      a.business_id,
      a.verify_action,
      b.id AS business_id_join,
      b.name AS business_name,
      b.status AS business_status
    FROM synk_apps a
    LEFT JOIN synk_business_accounts b ON b.id = a.business_id
    WHERE a.slug = ${slug}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return {
      ok: false,
      paired: false,
      enabled: false,
      code: "not_found",
      error: "This business has not enabled Synk",
      app: { slug, name: slug },
      business: null,
    };
  }

  const enabled = row.enabled !== false;
  const approved = row.business_status === "approved";
  const paired = Boolean(row.business_id) && approved && enabled;
  let code = "ok";
  let error = null;
  if (!enabled) {
    code = "disabled";
    error = "Synk is paused for this application";
  } else if (!row.business_id || !approved) {
    code = "not_paired";
    error = "This business has not enabled Synk";
  }

  return {
    ok: paired,
    paired,
    enabled,
    code,
    error,
    app: {
      id: row.id,
      slug: row.slug,
      name: row.name,
      verifyAction: normalizeVerifyAction(row.verify_action),
    },
    business: row.business_id
      ? {
          id: row.business_id,
          name: row.business_name || "",
          status: row.business_status || "",
        }
      : null,
  };
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

async function issueHubSession(sql, { profileId, staySignedIn = true, ttlMs: ttlMsOverride = null } = {}) {
  const token = mintPassToken();
  const tokenHash = hashToken(token);
  const ttlMs = Number.isFinite(Number(ttlMsOverride)) && Number(ttlMsOverride) > 0
    ? Math.min(Math.round(Number(ttlMsOverride)), HUB_SESSION_TTL_MS)
    : (staySignedIn ? HUB_SESSION_TTL_MS : HUB_SESSION_SHORT_TTL_MS);
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  await sql`
    INSERT INTO synk_hub_sessions (synk_profile_id, token_hash, expires_at)
    VALUES (${profileId}, ${tokenHash}, ${expiresAt}::timestamptz)
  `;
  return {
    token,
    expiresAt,
    ttlSeconds: Math.round(ttlMs / 1000),
    staySignedIn: Boolean(staySignedIn),
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
           c.public_username, c.display_name, c.avatar_url, c.bio, c.dm_policy
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
      displayName: String(row.display_name || "").trim(),
      avatarUrl: String(row.avatar_url || "").trim(),
      bio: normalizeBio(row.bio),
      dmPolicy: normalizeDmPolicy(row.dm_policy),
    },
  };
}

function normalizeDisplayName(value) {
  const cleaned = String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  if (!cleaned) return "";
  if (!/^[\p{L}\p{N} .'_\-]+$/u.test(cleaned)) {
    const err = new Error("Display name can use letters, numbers, spaces, and . ' _ -");
    err.code = "INVALID_DISPLAY_NAME";
    throw err;
  }
  return cleaned;
}

function normalizeBio(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 280);
}

function normalizeDmPolicy(value) {
  const policy = String(value || "")
    .trim()
    .toLowerCase();
  if (policy === "nobody" || policy === "everyone" || policy === "friends") return policy;
  return "friends";
}

function normalizeDmBody(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 1000);
}

function orderedDmPair(a, b) {
  const left = normalizePublicUsername(a);
  const right = normalizePublicUsername(b);
  if (!left || !right) return null;
  return left < right ? [left, right] : [right, left];
}

async function communityUsernameExists(sql, username) {
  const name = normalizePublicUsername(username);
  if (!name) return false;
  const primary = await sql`
    SELECT 1 FROM synk_community_profiles WHERE public_username = ${name} LIMIT 1
  `;
  if (primary[0]) return true;
  const alt = await sql`
    SELECT 1 FROM synk_community_alt_accounts WHERE public_username = ${name} LIMIT 1
  `;
  return Boolean(alt[0]);
}

async function getDmPolicyForUsername(sql, username) {
  const name = normalizePublicUsername(username);
  if (!name) return "friends";
  const primary = await sql`
    SELECT dm_policy FROM synk_community_profiles WHERE public_username = ${name} LIMIT 1
  `;
  if (primary[0]) return normalizeDmPolicy(primary[0].dm_policy);
  const alt = await sql`
    SELECT dm_policy FROM synk_community_alt_accounts WHERE public_username = ${name} LIMIT 1
  `;
  if (alt[0]) return normalizeDmPolicy(alt[0].dm_policy);
  return "friends";
}

async function getDisplayNamesByUsernames(sql, usernames) {
  const names = Array.from(
    new Set((usernames || []).map((u) => normalizePublicUsername(u)).filter(Boolean))
  );
  if (!names.length) return {};
  const rows = await sql`
    SELECT public_username, display_name
    FROM (
      SELECT public_username, display_name
      FROM synk_community_profiles
      WHERE public_username = ANY(${names})
      UNION ALL
      SELECT public_username, display_name
      FROM synk_community_alt_accounts
      WHERE public_username = ANY(${names})
    ) x
  `;
  const out = {};
  for (const row of rows) {
    const dn = String(row.display_name || "").trim();
    if (dn) out[row.public_username] = dn;
  }
  return out;
}

async function setDisplayNameForUsername(sql, username, displayName, ownerProfileId = null) {
  const name = normalizePublicUsername(username);
  if (!name) return { ok: false, error: "Username required" };
  let next = "";
  try {
    next = normalizeDisplayName(displayName);
  } catch (err) {
    return { ok: false, error: err.message || "Invalid display name" };
  }
  const primary = await sql`
    UPDATE synk_community_profiles
    SET display_name = ${next || null}, updated_at = NOW()
    WHERE public_username = ${name}
      AND (${ownerProfileId}::uuid IS NULL OR synk_profile_id = ${ownerProfileId})
    RETURNING public_username, display_name
  `;
  if (primary[0]) {
    return { ok: true, username: primary[0].public_username, displayName: String(primary[0].display_name || "").trim() };
  }
  const alt = await sql`
    UPDATE synk_community_alt_accounts
    SET display_name = ${next || null}, updated_at = NOW()
    WHERE public_username = ${name}
      AND (${ownerProfileId}::uuid IS NULL OR owner_synk_profile_id = ${ownerProfileId})
    RETURNING public_username, display_name
  `;
  if (alt[0]) {
    return { ok: true, username: alt[0].public_username, displayName: String(alt[0].display_name || "").trim() };
  }
  return { ok: false, error: "Profile not found" };
}

async function setBioForUsername(sql, username, bio, ownerProfileId = null) {
  const name = normalizePublicUsername(username);
  if (!name) return { ok: false, error: "Username required" };
  const next = normalizeBio(bio);
  const primary = await sql`
    UPDATE synk_community_profiles
    SET bio = ${next || null}, updated_at = NOW()
    WHERE public_username = ${name}
      AND (${ownerProfileId}::uuid IS NULL OR synk_profile_id = ${ownerProfileId})
    RETURNING public_username, bio
  `;
  if (primary[0]) {
    return { ok: true, username: primary[0].public_username, bio: normalizeBio(primary[0].bio) };
  }
  const alt = await sql`
    UPDATE synk_community_alt_accounts
    SET bio = ${next || null}, updated_at = NOW()
    WHERE public_username = ${name}
      AND (${ownerProfileId}::uuid IS NULL OR owner_synk_profile_id = ${ownerProfileId})
    RETURNING public_username, bio
  `;
  if (alt[0]) {
    return { ok: true, username: alt[0].public_username, bio: normalizeBio(alt[0].bio) };
  }
  return { ok: false, error: "Profile not found" };
}

async function setDmPolicyForUsername(sql, username, policy, ownerProfileId = null) {
  const name = normalizePublicUsername(username);
  if (!name) return { ok: false, error: "Username required" };
  const next = normalizeDmPolicy(policy);
  const primary = await sql`
    UPDATE synk_community_profiles
    SET dm_policy = ${next}, updated_at = NOW()
    WHERE public_username = ${name}
      AND (${ownerProfileId}::uuid IS NULL OR synk_profile_id = ${ownerProfileId})
    RETURNING public_username, dm_policy
  `;
  if (primary[0]) {
    return {
      ok: true,
      username: primary[0].public_username,
      dmPolicy: normalizeDmPolicy(primary[0].dm_policy),
    };
  }
  const alt = await sql`
    UPDATE synk_community_alt_accounts
    SET dm_policy = ${next}, updated_at = NOW()
    WHERE public_username = ${name}
      AND (${ownerProfileId}::uuid IS NULL OR owner_synk_profile_id = ${ownerProfileId})
    RETURNING public_username, dm_policy
  `;
  if (alt[0]) {
    return {
      ok: true,
      username: alt[0].public_username,
      dmPolicy: normalizeDmPolicy(alt[0].dm_policy),
    };
  }
  return { ok: false, error: "Profile not found" };
}

async function getFriendship(sql, a, b) {
  const left = normalizePublicUsername(a);
  const right = normalizePublicUsername(b);
  if (!left || !right || left === right) return null;
  const rows = await sql`
    SELECT requester_username, addressee_username, status
    FROM synk_community_friendships
    WHERE (requester_username = ${left} AND addressee_username = ${right})
       OR (requester_username = ${right} AND addressee_username = ${left})
    LIMIT 1
  `;
  if (!rows[0]) return null;
  const row = rows[0];
  if (row.status === "accepted") {
    return { status: "accepted", direction: "accepted" };
  }
  if (row.requester_username === left) {
    return { status: "pending", direction: "outgoing" };
  }
  return { status: "pending", direction: "incoming" };
}

async function listFriends(sql, username) {
  const name = normalizePublicUsername(username);
  if (!name) return [];
  const rows = await sql`
    SELECT CASE
             WHEN requester_username = ${name} THEN addressee_username
             ELSE requester_username
           END AS friend_username
    FROM synk_community_friendships
    WHERE status = 'accepted'
      AND (requester_username = ${name} OR addressee_username = ${name})
    ORDER BY friend_username ASC
  `;
  return rows.map((row) => row.friend_username);
}

async function requestFriendship(sql, fromUsername, toUsername) {
  const from = normalizePublicUsername(fromUsername);
  const to = normalizePublicUsername(toUsername);
  if (!from || !to) return { ok: false, error: "Username required" };
  if (from === to) return { ok: false, error: "You cannot friend yourself" };
  if (!(await communityUsernameExists(sql, to))) {
    return { ok: false, error: "User not found" };
  }
  const existing = await getFriendship(sql, from, to);
  if (existing) {
    if (existing.status === "accepted") {
      return { ok: false, error: "Already friends", friendship: existing };
    }
    if (existing.direction === "outgoing") {
      return { ok: false, error: "Friend request already sent", friendship: existing };
    }
    if (existing.direction === "incoming") {
      return respondFriendship(sql, from, to, true);
    }
  }
  try {
    await sql`
      INSERT INTO synk_community_friendships (requester_username, addressee_username, status)
      VALUES (${from}, ${to}, 'pending')
    `;
  } catch (err) {
    if (String(err.message || "").includes("unique") || err.code === "23505") {
      const again = await getFriendship(sql, from, to);
      if (again) return { ok: true, friendship: again };
    }
    throw err;
  }
  return {
    ok: true,
    friendship: { status: "pending", direction: "outgoing" },
  };
}

async function respondFriendship(sql, actorUsername, otherUsername, accept) {
  const actor = normalizePublicUsername(actorUsername);
  const other = normalizePublicUsername(otherUsername);
  if (!actor || !other) return { ok: false, error: "Username required" };
  if (actor === other) return { ok: false, error: "Invalid friendship" };
  const rows = await sql`
    SELECT id, requester_username, addressee_username, status
    FROM synk_community_friendships
    WHERE requester_username = ${other}
      AND addressee_username = ${actor}
      AND status = 'pending'
    LIMIT 1
  `;
  if (!rows[0]) return { ok: false, error: "No pending friend request" };
  if (!accept) {
    await sql`DELETE FROM synk_community_friendships WHERE id = ${rows[0].id}`;
    return { ok: true, friendship: null };
  }
  const updated = await sql`
    UPDATE synk_community_friendships
    SET status = 'accepted', updated_at = NOW()
    WHERE id = ${rows[0].id}
    RETURNING requester_username, addressee_username, status
  `;
  return {
    ok: true,
    friendship: { status: "accepted", direction: "accepted" },
    row: updated[0] || null,
  };
}

async function removeFriendship(sql, a, b) {
  const left = normalizePublicUsername(a);
  const right = normalizePublicUsername(b);
  if (!left || !right || left === right) return { ok: false, error: "Username required" };
  const deleted = await sql`
    DELETE FROM synk_community_friendships
    WHERE (requester_username = ${left} AND addressee_username = ${right})
       OR (requester_username = ${right} AND addressee_username = ${left})
    RETURNING id
  `;
  return { ok: true, removed: deleted.length > 0 };
}

async function canDm(sql, fromUsername, toUsername) {
  const from = normalizePublicUsername(fromUsername);
  const to = normalizePublicUsername(toUsername);
  if (!from || !to || from === to) return false;
  if (!(await communityUsernameExists(sql, to))) return false;
  const policy = await getDmPolicyForUsername(sql, to);
  if (policy === "nobody") return false;
  if (policy === "everyone") return true;
  const friendship = await getFriendship(sql, from, to);
  return Boolean(friendship && friendship.status === "accepted");
}

function mapDmThread(row, viewerUsername) {
  if (!row) return null;
  const viewer = normalizePublicUsername(viewerUsername);
  const otherUser = row.user_a === viewer ? row.user_b : row.user_a;
  return {
    id: row.id,
    userA: row.user_a,
    userB: row.user_b,
    otherUser,
    lastBody: row.last_body != null ? String(row.last_body) : "",
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
  };
}

const DM_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];

function parseDmEditHistory(value) {
  if (!value) return [];
  let raw = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch (_) {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => ({
      body: String((entry && entry.body) || "").slice(0, 2000),
      at: (entry && (entry.at || entry.editedAt || entry.edited_at)) || null,
    }))
    .filter((entry) => entry.body);
}

function parseDmReactions(value) {
  if (!value) return {};
  let raw = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch (_) {
      return {};
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [emoji, users] of Object.entries(raw)) {
    const key = String(emoji || "").trim();
    if (!key || !DM_REACTION_EMOJIS.includes(key)) continue;
    const list = Array.isArray(users)
      ? users
          .map((u) => normalizePublicUsername(u))
          .filter(Boolean)
      : [];
    const unique = Array.from(new Set(list));
    if (unique.length) out[key] = unique;
  }
  return out;
}

function mapDmReactions(reactionsMap, viewerUsername = "") {
  const viewer = normalizePublicUsername(viewerUsername);
  return Object.entries(reactionsMap || {})
    .map(([emoji, users]) => {
      const list = Array.isArray(users) ? users : [];
      return {
        emoji,
        count: list.length,
        me: Boolean(viewer && list.includes(viewer)),
        users: list,
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => {
      const ai = DM_REACTION_EMOJIS.indexOf(a.emoji);
      const bi = DM_REACTION_EMOJIS.indexOf(b.emoji);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
}

function mapDmMessage(row, viewerUsername = "") {
  if (!row) return null;
  const viewer = normalizePublicUsername(viewerUsername);
  const sender = normalizePublicUsername(row.sender_username);
  const mine = Boolean(viewer && sender && viewer === sender);
  const readAt = row.read_at || null;
  const editedAt = row.edited_at || null;
  const editHistory = parseDmEditHistory(row.edit_history);
  const reactionsMap = parseDmReactions(row.reactions);
  return {
    id: row.id,
    threadId: row.thread_id,
    senderUsername: sender || row.sender_username,
    body: row.body,
    createdAt: row.created_at,
    editedAt,
    readAt,
    isEdited: Boolean(editedAt) || editHistory.length > 0,
    isRead: Boolean(readAt),
    canEdit: mine && !row.unsent_at,
    canDelete: Boolean(viewer) && !row.unsent_at,
    canUnsend: mine && !readAt && !row.unsent_at,
    deleteMode: mine ? (readAt ? "for-me" : "unsend") : "for-me",
    editHistory,
    reactions: mapDmReactions(reactionsMap, viewer),
    reactionEmojis: DM_REACTION_EMOJIS.slice(),
  };
}

async function getOrCreateDmThread(sql, a, b) {
  const pair = orderedDmPair(a, b);
  if (!pair) return { ok: false, error: "Username required" };
  const [userA, userB] = pair;
  if (userA === userB) return { ok: false, error: "Cannot message yourself" };
  const existing = await sql`
    SELECT id, user_a, user_b, last_message_at, created_at
    FROM synk_community_dm_threads
    WHERE user_a = ${userA} AND user_b = ${userB}
    LIMIT 1
  `;
  if (existing[0]) {
    return { ok: true, thread: mapDmThread({ ...existing[0], last_body: "" }, a) };
  }
  try {
    const created = await sql`
      INSERT INTO synk_community_dm_threads (user_a, user_b)
      VALUES (${userA}, ${userB})
      RETURNING id, user_a, user_b, last_message_at, created_at
    `;
    return { ok: true, thread: mapDmThread({ ...created[0], last_body: "" }, a) };
  } catch (err) {
    if (String(err.message || "").includes("unique") || err.code === "23505") {
      const again = await sql`
        SELECT id, user_a, user_b, last_message_at, created_at
        FROM synk_community_dm_threads
        WHERE user_a = ${userA} AND user_b = ${userB}
        LIMIT 1
      `;
      if (again[0]) return { ok: true, thread: mapDmThread({ ...again[0], last_body: "" }, a) };
    }
    throw err;
  }
}

async function listDmThreads(sql, username) {
  const name = normalizePublicUsername(username);
  if (!name) return [];
  const rows = await sql`
    SELECT
      t.id,
      t.user_a,
      t.user_b,
      t.last_message_at,
      t.created_at,
      (
        SELECT m.body
        FROM synk_community_dm_messages m
        WHERE m.thread_id = t.id
          AND m.unsent_at IS NULL
          AND NOT (
            CASE
              WHEN m.sender_username = ${name} THEN COALESCE(m.deleted_for_sender, FALSE)
              ELSE COALESCE(m.deleted_for_recipient, FALSE)
            END
          )
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_body
    FROM synk_community_dm_threads t
    WHERE t.user_a = ${name} OR t.user_b = ${name}
    ORDER BY t.last_message_at DESC
  `;
  return rows.map((row) => mapDmThread(row, name));
}

async function getDmThreadById(sql, threadId, username) {
  const id = String(threadId || "").trim();
  const name = normalizePublicUsername(username);
  if (!id || !name) return null;
  const rows = await sql`
    SELECT
      t.id,
      t.user_a,
      t.user_b,
      t.last_message_at,
      t.created_at,
      (
        SELECT m.body
        FROM synk_community_dm_messages m
        WHERE m.thread_id = t.id
          AND m.unsent_at IS NULL
          AND NOT (
            CASE
              WHEN m.sender_username = ${name} THEN COALESCE(m.deleted_for_sender, FALSE)
              ELSE COALESCE(m.deleted_for_recipient, FALSE)
            END
          )
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_body
    FROM synk_community_dm_threads t
    WHERE t.id = ${id}
      AND (t.user_a = ${name} OR t.user_b = ${name})
    LIMIT 1
  `;
  return rows[0] ? mapDmThread(rows[0], name) : null;
}

async function listDmMessages(sql, threadId, username) {
  const id = String(threadId || "").trim();
  const name = normalizePublicUsername(username);
  if (!id || !name) return { ok: false, error: "Thread required", messages: [] };
  const thread = await getDmThreadById(sql, id, name);
  if (!thread) return { ok: false, error: "Thread not found", messages: [] };

  // Opening a thread marks the other person's messages as read.
  await sql`
    UPDATE synk_community_dm_messages
    SET read_at = NOW()
    WHERE thread_id = ${id}
      AND sender_username <> ${name}
      AND read_at IS NULL
      AND unsent_at IS NULL
      AND COALESCE(deleted_for_recipient, FALSE) = FALSE
  `;

  const rows = await sql`
    SELECT
      id,
      thread_id,
      sender_username,
      body,
      created_at,
      edited_at,
      read_at,
      unsent_at,
      deleted_for_sender,
      deleted_for_recipient,
      edit_history,
      reactions
    FROM synk_community_dm_messages
    WHERE thread_id = ${id}
      AND unsent_at IS NULL
      AND NOT (
        CASE
          WHEN sender_username = ${name} THEN COALESCE(deleted_for_sender, FALSE)
          ELSE COALESCE(deleted_for_recipient, FALSE)
        END
      )
    ORDER BY created_at ASC
  `;
  return {
    ok: true,
    thread,
    messages: rows.map((row) => mapDmMessage(row, name)),
  };
}

async function sendDm(sql, fromUsername, toUsername, body) {
  const from = normalizePublicUsername(fromUsername);
  const to = normalizePublicUsername(toUsername);
  if (!from || !to) return { ok: false, error: "Username required" };
  if (from === to) return { ok: false, error: "Cannot message yourself" };
  const text = normalizeDmBody(body);
  if (!text) return { ok: false, error: "Message required" };
  if (!(await canDm(sql, from, to))) {
    return { ok: false, error: "You cannot message this user" };
  }
  const threadResult = await getOrCreateDmThread(sql, from, to);
  if (!threadResult.ok) return threadResult;
  const threadId = threadResult.thread.id;
  const inserted = await sql`
    INSERT INTO synk_community_dm_messages (thread_id, sender_username, body)
    VALUES (${threadId}, ${from}, ${text})
    RETURNING
      id, thread_id, sender_username, body, created_at,
      edited_at, read_at, unsent_at, deleted_for_sender, deleted_for_recipient, edit_history, reactions
  `;
  const updated = await sql`
    UPDATE synk_community_dm_threads
    SET last_message_at = ${inserted[0].created_at}
    WHERE id = ${threadId}
    RETURNING id, user_a, user_b, last_message_at, created_at
  `;
  return {
    ok: true,
    message: mapDmMessage(inserted[0], from),
    thread: mapDmThread({ ...updated[0], last_body: text }, from),
  };
}

async function editDmMessage(sql, messageId, username, body) {
  const id = String(messageId || "").trim();
  const name = normalizePublicUsername(username);
  const text = normalizeDmBody(body);
  if (!id || !name) return { ok: false, error: "Message required" };
  if (!text) return { ok: false, error: "Message required" };

  const rows = await sql`
    SELECT
      m.id,
      m.thread_id,
      m.sender_username,
      m.body,
      m.created_at,
      m.edited_at,
      m.read_at,
      m.unsent_at,
      m.deleted_for_sender,
      m.deleted_for_recipient,
      m.edit_history,
      m.reactions,
      t.user_a,
      t.user_b
    FROM synk_community_dm_messages m
    JOIN synk_community_dm_threads t ON t.id = m.thread_id
    WHERE m.id = ${id}
      AND (t.user_a = ${name} OR t.user_b = ${name})
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { ok: false, error: "Message not found" };
  if (normalizePublicUsername(row.sender_username) !== name) {
    return { ok: false, error: "You can only edit your own messages" };
  }
  if (row.unsent_at) return { ok: false, error: "Message was deleted" };
  if (row.deleted_for_sender) return { ok: false, error: "Message was deleted" };
  if (String(row.body || "") === text) {
    return { ok: true, message: mapDmMessage(row, name) };
  }

  const nextHistory = [
    ...parseDmEditHistory(row.edit_history),
    { body: String(row.body || ""), at: new Date().toISOString() },
  ].slice(-20);

  const updated = await sql`
    UPDATE synk_community_dm_messages
    SET
      body = ${text},
      edited_at = NOW(),
      edit_history = ${JSON.stringify(nextHistory)}::jsonb
    WHERE id = ${id}
    RETURNING
      id, thread_id, sender_username, body, created_at,
      edited_at, read_at, unsent_at, deleted_for_sender, deleted_for_recipient, edit_history, reactions
  `;
  return { ok: true, message: mapDmMessage(updated[0], name) };
}

async function deleteDmMessage(sql, messageId, username) {
  const id = String(messageId || "").trim();
  const name = normalizePublicUsername(username);
  if (!id || !name) return { ok: false, error: "Message required" };

  const rows = await sql`
    SELECT
      m.id,
      m.thread_id,
      m.sender_username,
      m.body,
      m.created_at,
      m.edited_at,
      m.read_at,
      m.unsent_at,
      m.deleted_for_sender,
      m.deleted_for_recipient,
      m.edit_history,
      m.reactions,
      t.user_a,
      t.user_b
    FROM synk_community_dm_messages m
    JOIN synk_community_dm_threads t ON t.id = m.thread_id
    WHERE m.id = ${id}
      AND (t.user_a = ${name} OR t.user_b = ${name})
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { ok: false, error: "Message not found" };
  if (row.unsent_at) return { ok: true, mode: "unsend", message: null };

  const sender = normalizePublicUsername(row.sender_username);
  const mine = sender === name;

  if (!mine) {
    // Recipient can only hide the message for themselves.
    await sql`
      UPDATE synk_community_dm_messages
      SET deleted_for_recipient = TRUE
      WHERE id = ${id}
    `;
    return { ok: true, mode: "for-me", message: null };
  }

  if (!row.read_at) {
    await sql`
      UPDATE synk_community_dm_messages
      SET
        unsent_at = NOW(),
        body = '',
        edit_history = '[]'::jsonb,
        reactions = '{}'::jsonb
      WHERE id = ${id}
    `;
    return { ok: true, mode: "unsend", message: null };
  }

  await sql`
    UPDATE synk_community_dm_messages
    SET deleted_for_sender = TRUE
    WHERE id = ${id}
  `;
  return { ok: true, mode: "for-me", message: null };
}

async function reactDmMessage(sql, messageId, username, emoji) {
  const id = String(messageId || "").trim();
  const name = normalizePublicUsername(username);
  const reaction = String(emoji || "").trim();
  if (!id || !name) return { ok: false, error: "Message required" };
  if (!DM_REACTION_EMOJIS.includes(reaction)) {
    return { ok: false, error: "Unsupported reaction" };
  }

  const rows = await sql`
    SELECT
      m.id,
      m.thread_id,
      m.sender_username,
      m.body,
      m.created_at,
      m.edited_at,
      m.read_at,
      m.unsent_at,
      m.deleted_for_sender,
      m.deleted_for_recipient,
      m.edit_history,
      m.reactions,
      t.user_a,
      t.user_b
    FROM synk_community_dm_messages m
    JOIN synk_community_dm_threads t ON t.id = m.thread_id
    WHERE m.id = ${id}
      AND (t.user_a = ${name} OR t.user_b = ${name})
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return { ok: false, error: "Message not found" };
  if (row.unsent_at) return { ok: false, error: "Message was deleted" };
  const sender = normalizePublicUsername(row.sender_username);
  const hiddenForViewer =
    sender === name
      ? Boolean(row.deleted_for_sender)
      : Boolean(row.deleted_for_recipient);
  if (hiddenForViewer) return { ok: false, error: "Message was deleted" };

  const reactions = parseDmReactions(row.reactions);
  const current = Array.isArray(reactions[reaction]) ? reactions[reaction].slice() : [];
  const idx = current.indexOf(name);
  if (idx >= 0) current.splice(idx, 1);
  else current.push(name);
  if (current.length) reactions[reaction] = current;
  else delete reactions[reaction];

  const updated = await sql`
    UPDATE synk_community_dm_messages
    SET reactions = ${JSON.stringify(reactions)}::jsonb
    WHERE id = ${id}
    RETURNING
      id, thread_id, sender_username, body, created_at,
      edited_at, read_at, unsent_at, deleted_for_sender, deleted_for_recipient, edit_history, reactions
  `;
  return { ok: true, message: mapDmMessage(updated[0], name) };
}

function friendshipViewerStatus(friendship) {
  if (!friendship) return "none";
  if (friendship.status === "accepted") return "friends";
  if (friendship.direction === "outgoing") return "pending_out";
  if (friendship.direction === "incoming") return "pending_in";
  return "none";
}

function normalizePublicUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 24);
}

function normalizeCameraSide(value) {
  const side = String(value || "")
    .trim()
    .toLowerCase();
  return ["left", "right", "center"].includes(side) ? side : "left";
}

function generateDevicePairingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function mapBusinessDevice(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    cameraSide: normalizeCameraSide(row.camera_side),
    pairingCode: row.pairing_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at || null,
  };
}


async function getAvatarsByUsernames(sql, usernames) {
  const names = Array.from(
    new Set((usernames || []).map((u) => normalizePublicUsername(u)).filter(Boolean))
  );
  if (!names.length) return {};
  const rows = await sql`
    SELECT public_username, avatar_url
    FROM (
      SELECT public_username, avatar_url
      FROM synk_community_profiles
      WHERE public_username = ANY(${names})
      UNION ALL
      SELECT public_username, avatar_url
      FROM synk_community_alt_accounts
      WHERE public_username = ANY(${names})
    ) x
  `;
  const out = {};
  for (const row of rows) {
    const url = String(row.avatar_url || "").trim();
    if (url) out[row.public_username] = url;
  }
  return out;
}

async function setAvatarForUsername(sql, username, avatarUrl, ownerProfileId = null) {
  const name = normalizePublicUsername(username);
  if (!name) return { ok: false, error: "Username required" };
  const next = String(avatarUrl || "").trim() || null;
  const primary = await sql`
    UPDATE synk_community_profiles
    SET avatar_url = ${next}, updated_at = NOW()
    WHERE public_username = ${name}
      AND (${ownerProfileId}::uuid IS NULL OR synk_profile_id = ${ownerProfileId})
    RETURNING public_username, avatar_url
  `;
  if (primary[0]) {
    return { ok: true, username: primary[0].public_username, avatarUrl: String(primary[0].avatar_url || "").trim() };
  }
  const alt = await sql`
    UPDATE synk_community_alt_accounts
    SET avatar_url = ${next}, updated_at = NOW()
    WHERE public_username = ${name}
      AND (${ownerProfileId}::uuid IS NULL OR owner_synk_profile_id = ${ownerProfileId})
    RETURNING public_username, avatar_url
  `;
  if (alt[0]) {
    return { ok: true, username: alt[0].public_username, avatarUrl: String(alt[0].avatar_url || "").trim() };
  }
  return { ok: false, error: "Profile not found" };
}

async function updateSynkProfilePhoto(sql, profileId, photoUrl) {
  const url = String(photoUrl || "").trim();
  if (!profileId || !url) return { ok: false, error: "Photo required" };
  const rows = await sql`
    UPDATE synk_profiles
    SET photo_url = ${url}, updated_at = NOW()
    WHERE id = ${profileId}
    RETURNING id, photo_url
  `;
  if (!rows[0]) return { ok: false, error: "Profile not found" };
  return { ok: true, photoUrl: rows[0].photo_url || "" };
}


const ADMIN_ACT_AS_TTL_MS = 60 * 60 * 1000; // 1 hour acting session
const ADMIN_ACT_AS_HANDOFF_TTL_MS = 2 * 60 * 1000; // 2 minutes to open the link

function normalizeActAsNextPath(value) {
  const raw = String(value || "/hub").trim() || "/hub";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/hub";
  if (raw.includes("://")) return "/hub";
  return raw.slice(0, 200);
}

async function createAdminActAsHandoff(sql, {
  profileId,
  adminUsername = "",
  nextPath = "/hub",
  synkIdOrigin = "",
} = {}) {
  await ensureSynkCoreTables(sql);
  const profileRows = await sql`
    SELECT id, synk_code, name, photo_url, enabled
    FROM synk_profiles
    WHERE id = ${profileId}
    LIMIT 1
  `;
  const profile = profileRows[0];
  if (!profile) {
    const err = new Error("Member not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (profile.enabled === false) {
    const err = new Error("This membership is paused — enable it before acting as them");
    err.code = "DISABLED";
    throw err;
  }

  const hubSession = await issueHubSession(sql, {
    profileId: profile.id,
    staySignedIn: false,
    ttlMs: ADMIN_ACT_AS_TTL_MS,
  });

  const handoffToken = mintPassToken();
  const handoffHash = hashToken(handoffToken);
  const handoffExpiresAt = new Date(Date.now() + ADMIN_ACT_AS_HANDOFF_TTL_MS).toISOString();
  const next = normalizeActAsNextPath(nextPath);
  const adminName = String(adminUsername || "").trim().slice(0, 80);

  await sql`
    INSERT INTO synk_admin_act_as_tokens (
      token_hash, synk_profile_id, hub_session_token, hub_expires_at, admin_username, next_path, expires_at
    )
    VALUES (
      ${handoffHash},
      ${profile.id},
      ${hubSession.token},
      ${hubSession.expiresAt}::timestamptz,
      ${adminName},
      ${next},
      ${handoffExpiresAt}::timestamptz
    )
  `;

  await logSynkEvent(sql, {
    eventType: "admin_act_as_start",
    profileId: profile.id,
    detail: `${adminName || "admin"} → ${profile.synk_code || profile.id}`,
  });

  const origin = String(synkIdOrigin || process.env.SYNK_ID_ORIGIN || "https://synkid.netlify.app")
    .trim()
    .replace(/\/$/, "");
  const url = `${origin}/act-as?token=${encodeURIComponent(handoffToken)}&next=${encodeURIComponent(next)}`;

  return {
    url,
    expiresAt: hubSession.expiresAt,
    handoffExpiresAt,
    profile: {
      id: profile.id,
      name: profile.name,
      synkCode: profile.synk_code,
      photoUrl: profile.photo_url || "",
    },
    nextPath: next,
  };
}

async function claimAdminActAsHandoff(sql, { token } = {}) {
  await ensureSynkCoreTables(sql);
  const handoffToken = String(token || "").trim();
  if (!handoffToken) {
    const err = new Error("Missing act-as token");
    err.code = "BAD_TOKEN";
    throw err;
  }
  const handoffHash = hashToken(handoffToken);
  const rows = await sql`
    SELECT
      t.id,
      t.synk_profile_id,
      t.hub_session_token,
      t.hub_expires_at,
      t.admin_username,
      t.next_path,
      t.expires_at,
      t.consumed_at,
      p.synk_code,
      p.name,
      p.photo_url,
      p.enabled
    FROM synk_admin_act_as_tokens t
    JOIN synk_profiles p ON p.id = t.synk_profile_id
    WHERE t.token_hash = ${handoffHash}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    const err = new Error("This act-as link is invalid or already used");
    err.code = "BAD_TOKEN";
    throw err;
  }
  if (row.consumed_at) {
    const err = new Error("This act-as link was already used");
    err.code = "USED";
    throw err;
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    const err = new Error("This act-as link expired — start again from Synk Admin");
    err.code = "EXPIRED";
    throw err;
  }
  if (row.enabled === false) {
    const err = new Error("This membership is paused");
    err.code = "DISABLED";
    throw err;
  }
  if (!row.hub_session_token || new Date(row.hub_expires_at).getTime() <= Date.now()) {
    const err = new Error("The act-as session expired — start again from Synk Admin");
    err.code = "EXPIRED";
    throw err;
  }

  const hubTokenPlain = String(row.hub_session_token || "");
  const consumed = await sql`
    UPDATE synk_admin_act_as_tokens
    SET consumed_at = NOW(), hub_session_token = ''
    WHERE id = ${row.id} AND consumed_at IS NULL
    RETURNING id
  `;
  if (!consumed[0]) {
    const err = new Error("This act-as link was already used");
    err.code = "USED";
    throw err;
  }

  await logSynkEvent(sql, {
    eventType: "admin_act_as_claim",
    profileId: row.synk_profile_id,
    detail: `${String(row.admin_username || "admin").slice(0, 40)} claimed ${row.synk_code || row.synk_profile_id}`,
  });

  const hubExpiresAt = new Date(row.hub_expires_at).toISOString();
  const ttlSeconds = Math.max(60, Math.round((new Date(row.hub_expires_at).getTime() - Date.now()) / 1000));

  return {
    profile: {
      id: row.synk_profile_id,
      name: row.name,
      synkCode: row.synk_code,
      photoUrl: row.photo_url || "",
    },
    hubSession: {
      token: hubTokenPlain,
      expiresAt: hubExpiresAt,
      ttlSeconds,
      staySignedIn: false,
    },
    actAs: {
      adminUsername: row.admin_username || "",
      expiresAt: hubExpiresAt,
    },
    nextPath: normalizeActAsNextPath(row.next_path),
    expiresAt: new Date(row.hub_expires_at).getTime(),
  };
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
  ensureSynkPlacesTable,
  logSynkEvent,
  assertNotRateLimited,
  issuePass,
  consumePass,
  listActivePasses,
  revokePass,
  requireSynkApp,
  issueHubSession,
  ADMIN_ACT_AS_TTL_MS,
  normalizeActAsNextPath,
  claimAdminActAsHandoff,
  createAdminActAsHandoff,
  requireHubSession,
  extractHubSessionToken,
  normalizePublicUsername,
  normalizeDisplayName,
  normalizeBio,
  normalizeDmPolicy,
  getDisplayNamesByUsernames,
  setDisplayNameForUsername,
  setBioForUsername,
  setDmPolicyForUsername,
  getFriendship,
  listFriends,
  requestFriendship,
  respondFriendship,
  removeFriendship,
  canDm,
  getOrCreateDmThread,
  listDmThreads,
  getDmThreadById,
  listDmMessages,
  sendDm,
  editDmMessage,
  deleteDmMessage,
  reactDmMessage,
  friendshipViewerStatus,
  getAvatarsByUsernames,
  setAvatarForUsername,
  updateSynkProfilePhoto,
  normalizeGroupSlug,
  normalizeGroupName,
  normalizeGroupDescription,
  COMMUNITY_OWNER_USERNAME,
  ensureSynkCommunityExtras,
  ensureCommunityOwner,
  getCommunityStaffRole,
  isCommunityStaffRole,
  listCommunityStaff,
  listCommunityGroups,
  findCommunityGroup,
  mapCommunityGroup,
  ensureOfficialSynkGroup,
  hydrateCommunityGroup,
  listGroupCategories,
  listGroupChannels,
  findGroupChannel,
  listGroupRoles,
  createGroupRole,
  updateGroupRole,
  deleteGroupRole,
  formatChannelLabel,
  normalizeRoleName,
  normalizeRoleColor,
  isCommunityUsernameTaken,
  listOwnerAltAccounts,
  findCommunityAltAccount,
  findCommunityPublicProfile,
  normalizeTagName,
  normalizeTagSlug,
  normalizeTagDescription,
  normalizeTagColor,
  mapCommunityTag,
  isBetaTesterTag,
  findInfoPage,
  listInfoPages,
  normalizePageBlocks,
  normalizePageTitle,
  normalizePageSlug,
  mapInfoPage,
  listCommunityTags,
  findCommunityTag,
  listProfileTags,
  listUsernameTags,
  getPinnedTagForProfile,
  getPinnedTagForUsername,
  getPinnedTagsByUsernames,
  assignUsernameTag,
  unassignUsernameTag,
  setPinnedTagForUsername,
  findCommunityProfileIdByUsername,
  normalizeCameraSide,
  generateDevicePairingCode,
  mapBusinessDevice,
  normalizeVerifyAction,
  getAppVerifyAction,
  getAppSynkStatus,
  isFirstPartySynkApp,
  seedVisitorSignInBusiness,
  ensureSynkAppMemberPolicies,
  getMemberAppPolicy,
  resolveVisitorVerifyAction,
  memberSignedIntoApp,
  listRecentAppMembers,
  setMemberAppPolicy,
  PRODUCT_TYPES,
  normalizeProductType,
  getProductTypeConfig,
  defaultVerifyActionForProduct,
  verifyActionAllowedForProduct,
  verifyActionLabel,
  productUsesDevices,
  normalizeWebsite,
  normalizeProductSummary,
  PASS_TTL_MS,
  HUB_SESSION_TTL_MS,
  HUB_SESSION_SHORT_TTL_MS,
  RATE_MAX_ATTEMPTS,
};
