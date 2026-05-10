import { NextRequest, NextResponse } from 'next/server';
import { PublicLocation, TrendingLocation } from '@/modules/discovery/core/models/publicLocation';
import { LocationTag } from '@/modules/location/core/models/location';
import { MoodCategory } from '@/shared/types';
import { isSupabaseConfigured } from '@/shared/utils/supabase';
import { createClient } from '@/shared/utils/supabase/server';

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseTags(raw: string | null | undefined): LocationTag[] {
  if (!raw) return [];
  return raw.split(',').map((t) => t.trim()).filter(Boolean)
    .map((name) => ({ name, source: 'manual' as const }));
}

/**
 * Trending score formula: (likes * 3 + views) / hours_since_created ^ 1.5
 * Higher = more trending.
 */
function computeTrendingScore(likeCount: number, viewCount: number, createdAt: string): number {
  const hoursOld = Math.max(1, (Date.now() - new Date(createdAt).getTime()) / 3_600_000);
  return (likeCount * 3 + viewCount) / Math.pow(hoursOld, 1.5);
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
    description: 'A tranquil Japanese-inspired café with minimalist bamboo garden and matcha everything.',
    image_url: null, latitude: 13.7512, longitude: 100.5413, is_public: true, mood_category: 'calm',
    tags: [{ name: 'matcha', source: 'manual' }, { name: 'zen', source: 'ai', confidence: 0.95 }],
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
 * GET /api/discovery/trending
 *
 * Returns the top N trending public locations for a given period.
 * Supabase path: fetches public locations in period, merges like counts,
 * computes trending score in the route layer.
 * Falls back to mock data if Supabase is not configured.
 *
 * Query params:
 *   period  ('day' | 'week' | 'month', default 'week')
 *   limit   (number, default 10, max 20)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? 'week';
  const limit  = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));

  const periodHours: Record<string, number> = { day: 24, week: 168, month: 720 };
  const cutoffHours = periodHours[period] ?? periodHours.week;
  const cutoffIso   = new Date(Date.now() - cutoffHours * 3_600_000).toISOString();

  // ── Supabase path ────────────────────────────────────────────────────────
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      // ── 1. Fetch public locations in the period ───────────────────────────
      let { data: locationRows, error } = await supabase
        .from('locations')
        .select('id, name, creator_note, image_url, latitude, longitude, is_public, mood_category, tags, created_at, updated_at, user_id')
        .eq('is_public', true)
        .gte('created_at', cutoffIso)
        .limit(100);

      if (error) throw error;

      // Fallback: if no locations in period, use all public locations
      if (!locationRows || locationRows.length === 0) {
        const { data: allRows, error: allErr } = await supabase
          .from('locations')
          .select('id, name, creator_note, image_url, latitude, longitude, is_public, mood_category, tags, created_at, updated_at, user_id')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(100);

        if (allErr) throw allErr;
        locationRows = allRows ?? [];
      }

      if (locationRows.length === 0) return NextResponse.json([]);

      const locationIds = locationRows.map((r) => r.id);
      const userIds = [...new Set(locationRows.map((r) => r.user_id).filter(Boolean))];

      // ── 2. Fetch author profiles ──────────────────────────────────────────
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));

      // ── 3. Fetch like counts ──────────────────────────────────────────────
      const { data: likeRows } = await supabase
        .from('likes')
        .select('location_id')
        .in('location_id', locationIds);

      const likeCountMap = new Map<string, number>();
      for (const row of likeRows ?? []) {
        likeCountMap.set(row.location_id, (likeCountMap.get(row.location_id) ?? 0) + 1);
      }

      // ── 4. Compute trending scores + sort + rank ──────────────────────────
      const scored = locationRows
        .map((row) => {
          const likeCount = likeCountMap.get(row.id) ?? 0;
          const trendingScore = computeTrendingScore(likeCount, 0, row.created_at);
          const profile = profileMap.get(row.user_id);

          const location: PublicLocation = {
            id:            row.id,
            user_id:       row.user_id,
            name:          row.name,
            description:   row.creator_note ?? null,
            image_url:     row.image_url ?? null,
            latitude:      row.latitude,
            longitude:     row.longitude,
            is_public:     true,
            mood_category: row.mood_category ?? null,
            tags:          parseTags(row.tags),
            created_at:    row.created_at,
            updated_at:    row.updated_at,
            author: {
              id:         row.user_id,
              handle:     profile ? `@${profile.username}` : '@user',
              avatar_url: profile?.avatar_url ?? null,
            },
            like_count: likeCount,
            view_count: 0,
          };

          return { ...location, trending_score: trendingScore };
        })
        .sort((a, b) => b.trending_score - a.trending_score)
        .slice(0, limit)
        .map((loc, i): TrendingLocation => ({ ...loc, rank: i + 1 }));

      return NextResponse.json(scored);
    } catch (err) {
      console.error('[GET /api/discovery/trending] Supabase error, falling back to mock:', err);
      // Fall through to mock
    }
  }

  // ── Mock fallback ─────────────────────────────────────────────────────────
  const cutoffMs = Date.now() - cutoffHours * 3_600_000;
  const inPeriod = MOCK_PUBLIC_LOCATIONS.filter(
    (loc) => new Date(loc.created_at).getTime() >= cutoffMs,
  );
  const candidates = inPeriod.length > 0 ? inPeriod : MOCK_PUBLIC_LOCATIONS;

  const scored = candidates
    .map((loc) => ({
      ...loc,
      trending_score: computeTrendingScore(loc.like_count, loc.view_count, loc.created_at),
    }))
    .sort((a, b) => b.trending_score - a.trending_score)
    .slice(0, limit)
    .map((loc, i): TrendingLocation => ({ ...loc, rank: i + 1 }));

  return NextResponse.json(scored);
}
