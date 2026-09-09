-- Known faces for kiosk face sign-in

CREATE TABLE IF NOT EXISTS face_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  policy TEXT NOT NULL DEFAULT 'autofill'
    CHECK (policy IN ('autofill', 'auto_admit', 'auto_deny')),
  descriptor JSONB NOT NULL,
  photo_url TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS face_profiles_enabled_idx
  ON face_profiles (enabled, updated_at DESC);
