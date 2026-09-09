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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS synk_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  synk_profile_id UUID NOT NULL REFERENCES synk_profiles(id) ON DELETE CASCADE,
  app_slug TEXT NOT NULL DEFAULT 'synk',
  purpose TEXT NOT NULL DEFAULT 'identity',
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS synk_passes_hash_idx ON synk_passes (token_hash);
CREATE INDEX IF NOT EXISTS synk_passes_expires_idx ON synk_passes (expires_at);

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
