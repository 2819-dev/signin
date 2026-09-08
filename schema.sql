-- Run this once in the Neon SQL Editor

CREATE TABLE IF NOT EXISTS visitor_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'admitted', 'declined')),
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
