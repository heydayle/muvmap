-- Migration: add_saved_locations
-- Feature: feat-location-management (save to favorites / saved list)
-- See: rules/features/save-locations/flag.md

-- ── 1. saved_locations table ──────────────────────────────────────────────────
-- Stores a user's personal bookmark list of locations.
-- Distinct from `likes` (public social signal) — this is a private save list.

CREATE TABLE IF NOT EXISTS saved_locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  saved_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, location_id)
);

CREATE INDEX idx_saved_locations_user ON saved_locations (user_id);
CREATE INDEX idx_saved_locations_location ON saved_locations (location_id);

-- ── 2. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE saved_locations ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own saves
CREATE POLICY saved_locations_select ON saved_locations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY saved_locations_insert ON saved_locations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY saved_locations_delete ON saved_locations
  FOR DELETE USING (user_id = auth.uid());

-- ── 3. Grant access to authenticated role (Data API) ─────────────────────────
GRANT SELECT, INSERT, DELETE ON saved_locations TO authenticated;

-- ── 4. feature_flags row for feat-location-management ────────────────────────
-- Insert the flag so the API limit guard can read rules from Supabase.
-- Upsert-safe: will not fail if the row already exists.
INSERT INTO feature_flags (key, value_type, default_val, description, module)
VALUES (
  'feat-location-management',
  'boolean',
  'true',
  'Controls saved-location limits and premium upsell UI for the save-to-favorites feature.',
  'map'
)
ON CONFLICT (key) DO NOTHING;
