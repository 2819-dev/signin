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
