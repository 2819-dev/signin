-- Synk ID profiles — CLEAR-style biometric identity for authorized humans

CREATE TABLE IF NOT EXISTS synk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synk_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  secret_hash TEXT,
  photo_url TEXT NOT NULL DEFAULT '',
  descriptor JSONB,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS synk_profiles_enabled_idx
  ON synk_profiles (enabled, updated_at DESC);

CREATE INDEX IF NOT EXISTS synk_profiles_code_idx
  ON synk_profiles (synk_code);

ALTER TABLE synk_profiles ADD COLUMN IF NOT EXISTS descriptor JSONB;
ALTER TABLE synk_profiles ALTER COLUMN secret_hash DROP NOT NULL;
