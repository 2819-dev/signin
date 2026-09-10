-- Run this once in the Neon SQL Editor

CREATE TABLE IF NOT EXISTS visitor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'admitted', 'declined', 'timed_out')),
  decline_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS visitor_requests_status_created_idx
  ON visitor_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS visitor_requests_created_idx
  ON visitor_requests (created_at DESC);

CREATE TABLE IF NOT EXISTS kiosk_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  is_open BOOLEAN NOT NULL DEFAULT TRUE,
  closed_title TEXT NOT NULL DEFAULT 'Closed',
  closed_message TEXT NOT NULL DEFAULT 'Not accepting visitors right now.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO kiosk_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE visitor_requests
  ADD COLUMN IF NOT EXISTS urgent BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE kiosk_settings
  ADD COLUMN IF NOT EXISTS urgent_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE kiosk_settings
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'light';

ALTER TABLE kiosk_settings
  ADD COLUMN IF NOT EXISTS display_mode TEXT NOT NULL DEFAULT 'signin';

ALTER TABLE kiosk_settings
  ADD COLUMN IF NOT EXISTS display_title TEXT NOT NULL DEFAULT '';

ALTER TABLE kiosk_settings
  ADD COLUMN IF NOT EXISTS display_message TEXT NOT NULL DEFAULT '';

ALTER TABLE kiosk_settings
  ADD COLUMN IF NOT EXISTS display_image_url TEXT NOT NULL DEFAULT '';

ALTER TABLE kiosk_settings
  ADD COLUMN IF NOT EXISTS display_link TEXT NOT NULL DEFAULT '';

ALTER TABLE kiosk_settings
  ADD COLUMN IF NOT EXISTS display_show_clock BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE kiosk_settings
  ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  visitor_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_visitor_message_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS chat_sessions_status_updated_idx
  ON chat_sessions (status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS chat_sessions_closed_at_idx
  ON chat_sessions (status, closed_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('visitor', 'admin', 'system')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_created_idx
  ON chat_messages (session_id, created_at ASC);

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS visitor_name TEXT NOT NULL DEFAULT '';

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

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
ALTER TABLE synk_profiles ADD COLUMN IF NOT EXISTS policy TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE synk_profiles ALTER COLUMN secret_hash DROP NOT NULL;

ALTER TABLE kiosk_settings
  ADD COLUMN IF NOT EXISTS camera_rotation INTEGER NOT NULL DEFAULT 90;


-- Allow request timeouts when staff do not respond
ALTER TABLE visitor_requests DROP CONSTRAINT IF EXISTS visitor_requests_status_check;
ALTER TABLE visitor_requests
  ADD CONSTRAINT visitor_requests_status_check
  CHECK (status IN ('pending', 'admitted', 'declined', 'timed_out'));
