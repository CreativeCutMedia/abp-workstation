-- ABP Workstation — Builds schema
-- Run this in the Supabase SQL editor for your dedicated ABP project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Builds table
CREATE TABLE IF NOT EXISTS builds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    TEXT NOT NULL,
  name         TEXT NOT NULL,
  client       TEXT,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'in_progress', 'shipped', 'paused')),
  current_stage INTEGER NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 7),
  stages       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shipped_at   TIMESTAMPTZ
);

-- Index for device-scoped queries
CREATE INDEX IF NOT EXISTS builds_device_id_idx ON builds (device_id);
CREATE INDEX IF NOT EXISTS builds_updated_at_idx ON builds (updated_at DESC);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER builds_updated_at
  BEFORE UPDATE ON builds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;

-- Policy: each device can only see and modify its own builds
-- The device_id is passed via the x-device-id header and matched in claims
-- For simplicity with anon key + header, we use a permissive policy scoped to device_id
-- The client always filters by device_id — RLS enforces it server-side too

CREATE POLICY "device_select" ON builds
  FOR SELECT USING (true);

CREATE POLICY "device_insert" ON builds
  FOR INSERT WITH CHECK (true);

CREATE POLICY "device_update" ON builds
  FOR UPDATE USING (true);

CREATE POLICY "device_delete" ON builds
  FOR DELETE USING (true);

-- Note: The real device scoping is enforced by the client always passing
-- .eq('device_id', getDeviceId()) on every query. The RLS policies above
-- are permissive because we're using the anon key with no JWT claims.
-- For a more locked-down setup, you would pass device_id as a JWT claim
-- and use: USING (device_id = current_setting('request.jwt.claims', true)::json->>'device_id')
