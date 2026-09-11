-- Synk ID — standalone identity product (CLEAR-style)

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
);

ALTER TABLE synk_profiles ADD COLUMN IF NOT EXISTS descriptor JSONB;
ALTER TABLE synk_profiles ADD COLUMN IF NOT EXISTS policy TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE synk_profiles ALTER COLUMN secret_hash DROP NOT NULL;

CREATE INDEX IF NOT EXISTS synk_profiles_enabled_idx
  ON synk_profiles (enabled, updated_at DESC);
CREATE INDEX IF NOT EXISTS synk_profiles_code_idx
  ON synk_profiles (synk_code);

CREATE TABLE IF NOT EXISTS synk_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  business_id UUID,
  verify_action TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE synk_apps ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE synk_apps ADD COLUMN IF NOT EXISTS verify_action TEXT NOT NULL DEFAULT 'pending';

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
);

CREATE UNIQUE INDEX IF NOT EXISTS synk_business_accounts_email_idx
  ON synk_business_accounts (email);
CREATE INDEX IF NOT EXISTS synk_business_accounts_status_idx
  ON synk_business_accounts (status, created_at DESC);

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
);

CREATE INDEX IF NOT EXISTS synk_business_sessions_business_idx
  ON synk_business_sessions (business_id, revoked_at, expires_at DESC);

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
);

CREATE INDEX IF NOT EXISTS synk_passes_hash_idx ON synk_passes (token_hash);
CREATE INDEX IF NOT EXISTS synk_passes_expires_idx ON synk_passes (expires_at);
CREATE INDEX IF NOT EXISTS synk_passes_active_idx
  ON synk_passes (expires_at)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

ALTER TABLE synk_passes ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS synk_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  totp_secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS synk_admins_username_idx
  ON synk_admins (username);

CREATE TABLE IF NOT EXISTS synk_admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS synk_admin_sessions_user_idx
  ON synk_admin_sessions (username, revoked_at, expires_at DESC);

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
);

CREATE INDEX IF NOT EXISTS synk_join_requests_status_idx
  ON synk_join_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS synk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  synk_profile_id UUID,
  app_slug TEXT,
  ip TEXT,
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS synk_events_created_idx ON synk_events (created_at DESC);
CREATE INDEX IF NOT EXISTS synk_events_ip_created_idx ON synk_events (ip, created_at DESC);

CREATE TABLE IF NOT EXISTS synk_hub_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS synk_hub_sessions_profile_idx
  ON synk_hub_sessions (synk_profile_id, revoked_at, expires_at DESC);

CREATE TABLE IF NOT EXISTS synk_community_profiles (
  synk_profile_id UUID PRIMARY KEY REFERENCES synk_profiles(id) ON DELETE CASCADE,
  public_username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS synk_community_profiles_username_idx
  ON synk_community_profiles (public_username);

CREATE TABLE IF NOT EXISTS synk_community_staff (
  synk_profile_id UUID PRIMARY KEY REFERENCES synk_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT synk_community_staff_role_chk CHECK (role IN ('owner', 'admin'))
);

CREATE UNIQUE INDEX IF NOT EXISTS synk_community_staff_one_owner_idx
  ON synk_community_staff (role)
  WHERE role = 'owner';

CREATE TABLE IF NOT EXISTS synk_community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS synk_community_groups_slug_idx
  ON synk_community_groups (slug);

CREATE INDEX IF NOT EXISTS synk_community_groups_created_idx
  ON synk_community_groups (created_at DESC);

ALTER TABLE synk_community_groups ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE synk_community_groups ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS synk_community_group_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES synk_community_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
);

CREATE UNIQUE INDEX IF NOT EXISTS synk_community_group_channels_group_slug_idx
  ON synk_community_group_channels (group_id, slug);

ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS channel_id UUID;

CREATE TABLE IF NOT EXISTS synk_community_group_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES synk_community_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#94a3b8',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS synk_community_group_roles_group_name_idx
  ON synk_community_group_roles (group_id, lower(name));

CREATE TABLE IF NOT EXISTS synk_community_group_role_members (
  role_id UUID NOT NULL REFERENCES synk_community_group_roles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, username)
);



CREATE TABLE IF NOT EXISTS synk_community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES synk_community_groups(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS synk_community_posts_created_idx
  ON synk_community_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS synk_community_posts_group_created_idx
  ON synk_community_posts (group_id, created_at DESC);

ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS author_username TEXT;

CREATE INDEX IF NOT EXISTS synk_community_posts_author_username_idx
  ON synk_community_posts (author_username);

ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS link_url TEXT;
ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE synk_community_posts ADD COLUMN IF NOT EXISTS poll_options JSONB;
ALTER TABLE synk_community_posts ALTER COLUMN body SET DEFAULT '';

CREATE INDEX IF NOT EXISTS synk_community_posts_score_created_idx
  ON synk_community_posts (score DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS synk_community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES synk_community_posts(id) ON DELETE CASCADE,
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES synk_community_comments(id) ON DELETE CASCADE,
  author_username TEXT,
  body TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS synk_community_comments_post_created_idx
  ON synk_community_comments (post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS synk_community_comments_parent_idx
  ON synk_community_comments (parent_id);

CREATE TABLE IF NOT EXISTS synk_community_votes (
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  value SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (synk_profile_id, target_type, target_id),
  CONSTRAINT synk_community_votes_type_chk CHECK (target_type IN ('post', 'comment')),
  CONSTRAINT synk_community_votes_value_chk CHECK (value IN (-1, 1))
);

CREATE INDEX IF NOT EXISTS synk_community_votes_target_idx
  ON synk_community_votes (target_type, target_id);

CREATE TABLE IF NOT EXISTS synk_community_saves (
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES synk_community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (synk_profile_id, post_id)
);

CREATE INDEX IF NOT EXISTS synk_community_saves_profile_created_idx
  ON synk_community_saves (synk_profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS synk_community_hides (
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES synk_community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (synk_profile_id, post_id)
);

CREATE TABLE IF NOT EXISTS synk_community_memberships (
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES synk_community_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (synk_profile_id, group_id)
);

CREATE INDEX IF NOT EXISTS synk_community_memberships_group_idx
  ON synk_community_memberships (group_id);

CREATE TABLE IF NOT EXISTS synk_community_poll_votes (
  post_id UUID NOT NULL REFERENCES synk_community_posts(id) ON DELETE CASCADE,
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, synk_profile_id)
);

CREATE INDEX IF NOT EXISTS synk_community_poll_votes_post_idx
  ON synk_community_poll_votes (post_id, option_index);

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
);

CREATE INDEX IF NOT EXISTS synk_community_notifications_profile_created_idx
  ON synk_community_notifications (synk_profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS synk_community_alt_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  public_username TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS synk_community_alt_accounts_username_idx
  ON synk_community_alt_accounts (public_username);

CREATE INDEX IF NOT EXISTS synk_community_alt_accounts_owner_idx
  ON synk_community_alt_accounts (owner_synk_profile_id, created_at ASC);

CREATE TABLE IF NOT EXISTS synk_business_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES synk_business_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  camera_side TEXT NOT NULL DEFAULT 'left',
  pairing_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS synk_business_devices_business_idx
  ON synk_business_devices (business_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS synk_business_devices_code_idx
  ON synk_business_devices (pairing_code);

-- Per-app member handling (auto-admit / deny / refill). Scoped to members
-- who have signed into that app — never a global member directory.
CREATE TABLE IF NOT EXISTS synk_app_member_policies (
  app_slug TEXT NOT NULL,
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  policy TEXT NOT NULL DEFAULT 'pending',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (app_slug, synk_profile_id)
);

CREATE INDEX IF NOT EXISTS synk_app_member_policies_profile_idx
  ON synk_app_member_policies (synk_profile_id);

CREATE INDEX IF NOT EXISTS synk_events_app_verify_idx
  ON synk_events (app_slug, event_type, created_at DESC);

ALTER TABLE synk_business_accounts ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'custom';
ALTER TABLE synk_business_accounts ADD COLUMN IF NOT EXISTS website TEXT NOT NULL DEFAULT '';
ALTER TABLE synk_business_accounts ADD COLUMN IF NOT EXISTS preferred_verify_action TEXT NOT NULL DEFAULT 'identity';
ALTER TABLE synk_business_accounts ADD COLUMN IF NOT EXISTS product_summary TEXT NOT NULL DEFAULT '';
ALTER TABLE synk_apps ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'custom';

CREATE TABLE IF NOT EXISTS synk_community_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon_url TEXT,
  created_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE synk_community_tags ADD COLUMN IF NOT EXISTS icon_url TEXT;
ALTER TABLE synk_community_tags ADD COLUMN IF NOT EXISTS learn_more_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE synk_community_tags ADD COLUMN IF NOT EXISTS learn_more_page_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS synk_community_tags_slug_idx
  ON synk_community_tags (slug);

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
);

CREATE UNIQUE INDEX IF NOT EXISTS synk_info_pages_slug_idx ON synk_info_pages (slug);
CREATE INDEX IF NOT EXISTS synk_info_pages_updated_idx ON synk_info_pages (updated_at DESC);

CREATE TABLE IF NOT EXISTS synk_beta_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS synk_beta_agenda_active_idx
  ON synk_beta_agenda_items (active, sort_order ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS synk_beta_agenda_checks (
  agenda_item_id UUID NOT NULL REFERENCES synk_beta_agenda_items(id) ON DELETE CASCADE,
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agenda_item_id, synk_profile_id)
);

CREATE TABLE IF NOT EXISTS synk_beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS synk_beta_feedback_created_idx ON synk_beta_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS synk_beta_feedback_profile_idx ON synk_beta_feedback (synk_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS synk_community_tags_created_idx
  ON synk_community_tags (created_at DESC);

CREATE TABLE IF NOT EXISTS synk_community_profile_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES synk_community_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (synk_profile_id, tag_id)
);

CREATE INDEX IF NOT EXISTS synk_community_profile_tags_profile_idx
  ON synk_community_profile_tags (synk_profile_id, created_at ASC);

CREATE INDEX IF NOT EXISTS synk_community_profile_tags_tag_idx
  ON synk_community_profile_tags (tag_id);

ALTER TABLE synk_community_profiles ADD COLUMN IF NOT EXISTS pinned_tag_id UUID;
ALTER TABLE synk_community_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE synk_community_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE synk_community_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE synk_community_profiles ADD COLUMN IF NOT EXISTS dm_policy TEXT NOT NULL DEFAULT 'friends';
ALTER TABLE synk_community_alt_accounts ADD COLUMN IF NOT EXISTS pinned_tag_id UUID;
ALTER TABLE synk_community_alt_accounts ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE synk_community_alt_accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE synk_community_alt_accounts ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE synk_community_alt_accounts ADD COLUMN IF NOT EXISTS dm_policy TEXT NOT NULL DEFAULT 'friends';

CREATE TABLE IF NOT EXISTS synk_community_username_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_username TEXT NOT NULL,
  tag_id UUID NOT NULL REFERENCES synk_community_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES synk_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (public_username, tag_id)
);

CREATE INDEX IF NOT EXISTS synk_community_username_tags_username_idx
  ON synk_community_username_tags (public_username, created_at ASC);

CREATE INDEX IF NOT EXISTS synk_community_username_tags_tag_idx
  ON synk_community_username_tags (tag_id);

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
);

CREATE INDEX IF NOT EXISTS synk_community_friendships_addressee_idx
  ON synk_community_friendships (addressee_username);

CREATE INDEX IF NOT EXISTS synk_community_friendships_requester_idx
  ON synk_community_friendships (requester_username);

CREATE TABLE IF NOT EXISTS synk_community_dm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_a, user_b)
);

CREATE INDEX IF NOT EXISTS synk_community_dm_threads_user_a_idx
  ON synk_community_dm_threads (user_a);

CREATE INDEX IF NOT EXISTS synk_community_dm_threads_user_b_idx
  ON synk_community_dm_threads (user_b);

CREATE INDEX IF NOT EXISTS synk_community_dm_threads_last_message_idx
  ON synk_community_dm_threads (last_message_at DESC);

CREATE TABLE IF NOT EXISTS synk_community_dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES synk_community_dm_threads(id) ON DELETE CASCADE,
  sender_username TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  unsent_at TIMESTAMPTZ,
  deleted_for_sender BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_for_recipient BOOLEAN NOT NULL DEFAULT FALSE,
  edit_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  reactions JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS synk_community_dm_messages_thread_created_idx
  ON synk_community_dm_messages (thread_id, created_at ASC);

-- Curated places shown on the member hub (managed in Synk Admin; not auto-linked to Business apps)
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
);

CREATE INDEX IF NOT EXISTS synk_places_enabled_sort_idx
  ON synk_places (enabled, sort_order ASC, name ASC);


CREATE TABLE IF NOT EXISTS synk_admin_act_as_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  hub_session_token TEXT NOT NULL DEFAULT '',
  hub_expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_username TEXT NOT NULL DEFAULT '',
  next_path TEXT NOT NULL DEFAULT '/hub',
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS synk_admin_act_as_expires_idx ON synk_admin_act_as_tokens (expires_at);
