-- ═══════════════════════════════════════════════════════════════════════════
-- MuvMap — Full likes + reviews RLS fix
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Ensure is_public column ────────────────────────────────────────────────
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- ── 2. Likes table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, location_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- ── 3. Grants (CRITICAL — must come before policies) ─────────────────────────
GRANT SELECT ON public.likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;

-- ── 4. Drop + recreate policies (idempotent) ─────────────────────────────────
DROP POLICY IF EXISTS "likes_public_read"  ON public.likes;
DROP POLICY IF EXISTS "likes_user_insert"  ON public.likes;
DROP POLICY IF EXISTS "likes_user_delete"  ON public.likes;

CREATE POLICY "likes_public_read"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "likes_user_insert"
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "likes_user_delete"
  ON public.likes FOR DELETE
  USING (user_id = auth.uid());

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_likes_location ON public.likes (location_id);
CREATE INDEX IF NOT EXISTS idx_likes_user     ON public.likes (user_id);

-- ── 6. Fix reviews table too (same pattern) ───────────────────────────────────
-- The reviews table references auth.users but likes references profiles.
-- Make sure reviews grants are correct.
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated;

DROP POLICY IF EXISTS "reviews_public_read"   ON public.reviews;
DROP POLICY IF EXISTS "reviews_public_insert" ON public.reviews;

CREATE POLICY "reviews_public_read"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "reviews_public_insert"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── 7. Make seed locations public ────────────────────────────────────────────
UPDATE public.locations SET is_public = true
WHERE id IN (
  '1a2b3c4d-0001-4000-a000-000000000001',
  '1a2b3c4d-0002-4000-a000-000000000002',
  '1a2b3c4d-0003-4000-a000-000000000003',
  '1a2b3c4d-0004-4000-a000-000000000004',
  'pub-0001-4000-a000-000000000001',
  'pub-0002-4000-a000-000000000002',
  'pub-0003-4000-a000-000000000003',
  'pub-0005-4000-a000-000000000005',
  'pub-0006-4000-a000-000000000006'
);

-- ── 8. Verify everything ──────────────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('likes', 'reviews', 'locations')
ORDER BY tablename, cmd;

SELECT
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('likes', 'reviews')
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;
