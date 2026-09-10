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
