import { NextRequest, NextResponse } from 'next/server';
import { PublicLocation } from '@/modules/discovery/core/models/publicLocation';
import { LocationTag } from '@/modules/location/core/models/location';
import { MoodCategory } from '@/shared/types';
import { isSupabaseConfigured } from '@/shared/utils/supabase';
import { createClient } from '@/shared/utils/supabase/server';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parse comma-string tags into the LocationTag[] model the UI expects */
function parseTags(raw: string | null | undefined): LocationTag[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((name) => ({ name, source: 'manual' as const }));
}

// ── Mock fallback ───────────────────────────────────────────────────────────
const MOCK_PUBLIC_LOCATIONS: PublicLocation[] = [
  {
    id: 'pub-0001-4000-a000-000000000001', user_id: 'user-002',
    name: 'The Golden Hour Rooftop',
    description: 'Catch the most breathtaking sunsets in the city from this hidden gem rooftop bar.',
    image_url: null, latitude: 13.7459, longitude: 100.5330, is_public: true, mood_category: 'romantic',
    tags: [{ name: 'rooftop', source: 'manual' }, { name: 'sunset', source: 'ai', confidence: 0.97 }, { name: 'drinks', source: 'manual' }],
    created_at: '2026-04-20T18:00:00Z', updated_at: '2026-04-20T18:00:00Z',
    author: { id: 'user-002', handle: '@aurora_vibes', avatar_url: null }, like_count: 142, view_count: 890,
  },
  {
    id: 'pub-0002-4000-a000-000000000002', user_id: 'user-003',
    name: 'Neon Alley Night Market',
    description: 'Underground street food paradise with neon-drenched aesthetic. The vibe is unmatched.',
    image_url: null, latitude: 13.7395, longitude: 100.5286, is_public: true, mood_category: 'excited',
    tags: [{ name: 'street-food', source: 'manual' }, { name: 'neon', source: 'ai', confidence: 0.94 }, { name: 'night-market', source: 'manual' }],
    created_at: '2026-04-22T21:00:00Z', updated_at: '2026-04-22T21:00:00Z',
    author: { id: 'user-003', handle: '@neonwanderer', avatar_url: null }, like_count: 234, view_count: 1450,
  },
  {
    id: 'pub-0003-4000-a000-000000000003', user_id: 'user-004',
    name: 'Zen Garden Café',
    description: 'A tranquil Japanese-inspired café with a minimalist bamboo garden and matcha everything.',
    image_url: null, latitude: 13.7512, longitude: 100.5413, is_public: true, mood_category: 'calm',
    tags: [{ name: 'matcha', source: 'manual' }, { name: 'zen', source: 'ai', confidence: 0.95 }, { name: 'quiet', source: 'ai', confidence: 0.89 }],
    created_at: '2026-04-24T09:00:00Z', updated_at: '2026-04-24T09:00:00Z',
    author: { id: 'user-004', handle: '@still_waters', avatar_url: null }, like_count: 98, view_count: 612,
  },
  {
    id: 'pub-0005-4000-a000-000000000005', user_id: 'user-006',
    name: 'Cloud Nine Lounge',
    description: 'Chill lo-fi vibes, cloud couches, and the softest lighting. Perfect for drifting away.',
    image_url: null, latitude: 13.7622, longitude: 100.5589, is_public: true, mood_category: 'chill',
    tags: [{ name: 'lounge', source: 'manual' }, { name: 'lo-fi', source: 'manual' }, { name: 'cozy', source: 'ai', confidence: 0.96 }],
    created_at: '2026-04-27T15:00:00Z', updated_at: '2026-04-27T15:00:00Z',
    author: { id: 'user-006', handle: '@float_state', avatar_url: null }, like_count: 187, view_count: 1024,
  },
  {
    id: 'pub-0006-4000-a000-000000000006', user_id: 'user-007',
    name: 'Retro Vinyl Club',
    description: 'Spin-your-own-record bar. The acoustics are legendary. Happiness in a room.',
    image_url: null, latitude: 13.7448, longitude: 100.5210, is_public: true, mood_category: 'happy',
    tags: [{ name: 'music', source: 'manual' }, { name: 'vinyl', source: 'manual' }, { name: 'retro', source: 'ai', confidence: 0.91 }],
    created_at: '2026-04-28T20:00:00Z', updated_at: '2026-04-28T20:00:00Z',
    author: { id: 'user-007', handle: '@side_b_only', avatar_url: null }, like_count: 312, view_count: 1876,
  },
];

/**
 * GET /api/discovery/feed
 *
 * Returns a paginated, optionally filtered list of public locations.
 * Supabase path: locations (is_public=true) joined with profiles + likes in route layer.
 * Falls back to mock data if Supabase is not configured.
 *
 * Query params:
 *   page      (number, default 0)
 *   limit     (number, default 20, max 50)
 *   mood      (MoodCategory | 'all')
 *   tags      (string, comma-separated)
 *   sortOrder ('recent' | 'popular', default 'recent')
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page      = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10));
  const limit     = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const mood      = searchParams.get('mood') ?? 'all';
  const rawTags   = searchParams.get('tags') ?? '';
  const sortOrder = searchParams.get('sortOrder') ?? 'recent';

  const filterTags = rawTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

  // ── Supabase path ────────────────────────────────────────────────────────
  if (isSupabaseConfigured()) {
    try {
      // Cookie-aware client to resolve the current user (for is_liked)
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const DATA_COLS = 'id, name, creator_note, image_url, latitude, longitude, is_public, mood_category, tags, created_at, updated_at, user_id';

      // ── Helper: apply mood + tag filters to any already-selected query ────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withFilters = (q: any) => {
        if (mood !== 'all') q = q.eq('mood_category', mood as MoodCategory);
        for (const tag of filterTags) q = q.ilike('tags', `%${tag}%`);
        return q;
      };

      // ── 2. Total count ────────────────────────────────────────────────────
      const countBase = supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true);
      const { count: totalCount } = await withFilters(countBase);
      const total = (totalCount as number | null) ?? 0;

      // ── 3. Fetch locations (strategy depends on sortOrder) ────────────────
      let locationRows: Array<Record<string, unknown>> = [];

      if (sortOrder === 'popular') {
        const dataBase = supabase.from('locations').select(DATA_COLS).eq('is_public', true);
        const { data, error } = await withFilters(dataBase).limit(200);
        if (error) throw error;
        locationRows = (data ?? []) as Array<Record<string, unknown>>;
      } else {
        const dataBase = supabase.from('locations').select(DATA_COLS).eq('is_public', true);
        const { data, error } = await withFilters(dataBase)
          .order('created_at', { ascending: false })
          .range(page * limit, page * limit + limit - 1);
        if (error) throw error;
        locationRows = (data ?? []) as Array<Record<string, unknown>>;
      }

      if (locationRows.length === 0) {
        return NextResponse.json({ data: [], total, page, limit, hasMore: false });
      }

      const locationIds = locationRows.map((r) => r.id as string);
      const userIds     = [...new Set(locationRows.map((r) => r.user_id as string).filter(Boolean))];

      // ── 4. Fetch author profiles ──────────────────────────────────────────
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(
        (profileRows ?? []).map((p) => [p.id, p]),
      );

      // ── 5. Fetch like counts ──────────────────────────────────────────────
      const { data: likeRows } = await supabase
        .from('likes')
        .select('location_id')
        .in('location_id', locationIds);

      const likeCountMap = new Map<string, number>();
      for (const row of likeRows ?? []) {
        likeCountMap.set(row.location_id, (likeCountMap.get(row.location_id) ?? 0) + 1);
      }

      // ── 6. Fetch current user's likes (is_liked) ─────────────────────────
      const likedSet = new Set<string>();
      if (user) {
        const { data: userLikeRows } = await supabase
          .from('likes')
          .select('location_id')
          .eq('user_id', user.id)
          .in('location_id', locationIds);
        for (const row of userLikeRows ?? []) likedSet.add(row.location_id);
      }

      // ── 7. Merge into PublicLocation shape ────────────────────────────────
      let merged: PublicLocation[] = locationRows.map((row): PublicLocation => {
        const profile = profileMap.get(row.user_id as string);
        const likeCount = likeCountMap.get(row.id as string) ?? 0;
        return {
          id:            row.id as string,
          user_id:       row.user_id as string,
          name:          row.name as string,
          description:   (row.creator_note as string | null) ?? null,
          image_url:     (row.image_url as string | null) ?? null,
          latitude:      row.latitude as number | null,
          longitude:     row.longitude as number | null,
          is_public:     true,
          mood_category: (row.mood_category as MoodCategory | null) ?? null,
          tags:          parseTags(row.tags as string | null),
          created_at:    row.created_at as string,
          updated_at:    row.updated_at as string,
          author: {
            id:         row.user_id as string,
            handle:     profile ? `@${profile.username}` : '@user',
            avatar_url: (profile?.avatar_url as string | null) ?? null,
          },
          like_count:  likeCount,
          view_count:  0, // deferred
          is_liked:    likedSet.has(row.id as string),
        };
      });

      // ── 8. Sort (popular needs post-merge sort) ────────────────────────────
      if (sortOrder === 'popular') {
        merged = merged.sort((a, b) => b.like_count - a.like_count);
        // Paginate after sort
        merged = merged.slice(page * limit, page * limit + limit);
      }

      return NextResponse.json({
        data:    merged,
        total,
        page,
        limit,
        hasMore: page * limit + merged.length < total,
      });
    } catch (err) {
      console.error('[GET /api/discovery/feed] Supabase error, falling back to mock:', err);
      // Fall through to mock
    }
  }

  // ── Mock fallback ─────────────────────────────────────────────────────────
  let filtered = MOCK_PUBLIC_LOCATIONS.filter((loc) => {
    const moodMatch = mood === 'all' || loc.mood_category === (mood as MoodCategory);
    const tagMatch  = filterTags.length === 0 || filterTags.every((tag) => loc.tags.some((t) => t.name === tag));
    return moodMatch && tagMatch;
  });

  if (sortOrder === 'popular') {
    filtered = [...filtered].sort((a, b) => b.like_count - a.like_count);
  } else {
    filtered = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const start = page * limit;
  const data  = filtered.slice(start, start + limit);

  return NextResponse.json({
    data,
    total:   filtered.length,
    page,
    limit,
    hasMore: start + data.length < filtered.length,
  });
}
