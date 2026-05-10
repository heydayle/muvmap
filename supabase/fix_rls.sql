-- ═══════════════════════════════════════════════════════════════════════════
-- MuvMap RLS Fix — run this if tables already exist
-- Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Profiles table ─────────────────────────────────────────────────────────
-- Create if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      VARCHAR(30) UNIQUE NOT NULL,
  display_name  VARCHAR(100),
  avatar_url    TEXT,
  bio           VARCHAR(300),
  is_public     BOOLEAN DEFAULT false,
  preferred_mood VARCHAR(20),
  locale        VARCHAR(10) DEFAULT 'en',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- anon: no access
-- authenticated: read own + public profiles, write own
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (is_public = true OR id = auth.uid());
-- Allow INSERT when id matches the authenticated user (covers signInAnonymously)
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- ── 2. Locations table ────────────────────────────────────────────────────────
-- Add optional user_id (nullable so guest-without-session rows still work)
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT '';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS creator_note TEXT;

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.locations TO anon;
GRANT SELECT, INSERT ON public.locations TO authenticated;

DROP POLICY IF EXISTS "locations_public_read"   ON public.locations;
DROP POLICY IF EXISTS "locations_public_insert"  ON public.locations;
DROP POLICY IF EXISTS "locations_select"         ON public.locations;
DROP POLICY IF EXISTS "locations_insert"         ON public.locations;
DROP POLICY IF EXISTS "locations_owner_update"   ON public.locations;
DROP POLICY IF EXISTS "locations_owner_delete"   ON public.locations;

CREATE POLICY "locations_public_read"   ON public.locations FOR SELECT USING (true);
CREATE POLICY "locations_public_insert" ON public.locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "locations_owner_update"  ON public.locations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "locations_owner_delete"  ON public.locations FOR DELETE USING (auth.uid() = user_id);

-- ── 3. Reviews table ──────────────────────────────────────────────────────────
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated;

DROP POLICY IF EXISTS "reviews_public_read"   ON public.reviews;
DROP POLICY IF EXISTS "reviews_public_insert" ON public.reviews;

CREATE POLICY "reviews_public_read"   ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_public_insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (true);

-- ── 4. Seed data (safe re-run) ────────────────────────────────────────────────
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

-- ── 5. Verify ─────────────────────────────────────────────────────────────────
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'locations', 'reviews')
ORDER BY tablename, cmd;
