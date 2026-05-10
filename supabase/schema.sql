-- ═══════════════════════════════════════════════════════════════════════════
-- MuvMap Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Locations ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.locations (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT          NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  mood_category TEXT          CHECK (mood_category IN ('calm','happy','energetic','romantic','chill','excited','sad')),
  tags          TEXT          NOT NULL DEFAULT '',
  creator_note  TEXT,
  -- nullable: guests can add spots without signing in
  user_id       UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Permissions: anon can read, authenticated (incl. anonymous users) can read+write
GRANT SELECT ON public.locations TO anon;
GRANT SELECT, INSERT ON public.locations TO authenticated;

CREATE POLICY "locations_public_read"   ON public.locations FOR SELECT USING (true);
-- Requires authenticated role: guests must call signInAnonymously() first
CREATE POLICY "locations_public_insert" ON public.locations FOR INSERT TO authenticated WITH CHECK (true);
-- Only the creator can update/delete their own location
CREATE POLICY "locations_owner_update"  ON public.locations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "locations_owner_delete"  ON public.locations FOR DELETE USING (auth.uid() = user_id);

-- ── Reviews ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID    NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text        TEXT,
  -- nullable: guests can review without signing in
  user_id     UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Permissions: anon can read, authenticated (incl. anonymous users) can read+write
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated;

CREATE POLICY "reviews_public_read"   ON public.reviews FOR SELECT USING (true);
-- Requires authenticated role: guests must call signInAnonymously() first
CREATE POLICY "reviews_public_insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (true);

-- ── Seed data (Bangkok locations) ─────────────────────────────────────────────
INSERT INTO public.locations (id, name, latitude, longitude, mood_category, tags) VALUES
  ('1a2b3c4d-0001-4000-a000-000000000001', 'Sunset Café',             13.7563, 100.5018, 'calm',     'cozy,coffee,sunset'),
  ('1a2b3c4d-0002-4000-a000-000000000002', 'Midnight Park',            13.7469, 100.5349, 'chill',    'night,scenic,quiet'),
  ('1a2b3c4d-0003-4000-a000-000000000003', 'Electric Arcade',          13.7462, 100.5347, 'excited',  'gaming,neon,late-night'),
  ('1a2b3c4d-0004-4000-a000-000000000004', 'Lakeside Trail',           13.7319, 100.5231, 'energetic','nature,morning,exercise'),
  ('pub-0001-4000-a000-000000000001',      'The Golden Hour Rooftop',  13.7459, 100.5330, 'romantic', 'rooftop,sunset,drinks'),
  ('pub-0002-4000-a000-000000000002',      'Neon Alley Night Market',  13.7395, 100.5286, 'excited',  'street-food,neon,night-market'),
  ('pub-0003-4000-a000-000000000003',      'Zen Garden Café',          13.7512, 100.5413, 'calm',     'matcha,zen,quiet'),
  ('pub-0005-4000-a000-000000000005',      'Cloud Nine Lounge',        13.7622, 100.5589, 'chill',    'lounge,lo-fi,cozy'),
  ('pub-0006-4000-a000-000000000006',      'Retro Vinyl Club',         13.7448, 100.5210, 'happy',    'music,vinyl,retro')
ON CONFLICT (id) DO NOTHING;
