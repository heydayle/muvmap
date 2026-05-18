import { NextRequest, NextResponse } from 'next/server';
import { MapMarkerData } from '@/modules/map/core/models/mapMarker';
import { MoodCategory } from '@/shared/types';
import { getSupabaseServer, isSupabaseConfigured } from '@/shared/utils/supabase';

/** DB stores tags as a comma-joined string; UI expects string[] */
const parseTags = (raw: string | null | undefined): string[] =>
  raw ? raw.split(',').map((t) => t.trim()).filter(Boolean) : [];

// ── Mock fallback (used when Supabase is not configured) ─────────────────────
const MOCK_MARKERS: MapMarkerData[] = [
  { id: '1a2b3c4d-0001-4000-a000-000000000001', lngLat: [100.5018, 13.7563], name: 'Sunset Café',            mood_category: 'calm',      tags: ['cozy','coffee','sunset'],           state: 'default', is_public: true },
  { id: '1a2b3c4d-0002-4000-a000-000000000002', lngLat: [100.5349, 13.7469], name: 'Midnight Park',           mood_category: 'chill',     tags: ['night','scenic','quiet'],           state: 'default', is_public: true },
  { id: '1a2b3c4d-0003-4000-a000-000000000003', lngLat: [100.5347, 13.7462], name: 'Electric Arcade',         mood_category: 'excited',   tags: ['gaming','neon','late-night'],       state: 'default', is_public: true },
  { id: '1a2b3c4d-0004-4000-a000-000000000004', lngLat: [100.5231, 13.7319], name: 'Lakeside Trail',          mood_category: 'energetic', tags: ['nature','morning','exercise'],      state: 'default', is_public: true },
  { id: 'pub-0001-4000-a000-000000000001',      lngLat: [100.5330, 13.7459], name: 'The Golden Hour Rooftop', mood_category: 'romantic',  tags: ['rooftop','sunset','drinks'],        state: 'default', is_public: true },
  { id: 'pub-0002-4000-a000-000000000002',      lngLat: [100.5286, 13.7395], name: 'Neon Alley Night Market', mood_category: 'excited',   tags: ['street-food','neon','night-market'],state: 'default', is_public: true },
  { id: 'pub-0003-4000-a000-000000000003',      lngLat: [100.5413, 13.7512], name: 'Zen Garden Café',         mood_category: 'calm',      tags: ['matcha','zen','quiet'],             state: 'default', is_public: true },
  { id: 'pub-0005-4000-a000-000000000005',      lngLat: [100.5589, 13.7622], name: 'Cloud Nine Lounge',       mood_category: 'chill',     tags: ['lounge','lo-fi','cozy'],            state: 'default', is_public: true },
  { id: 'pub-0006-4000-a000-000000000006',      lngLat: [100.5210, 13.7448], name: 'Retro Vinyl Club',        mood_category: 'happy',     tags: ['music','vinyl','retro'],            state: 'default', is_public: true },
];

function inBounds(lng: number, lat: number, bounds: number[]): boolean {
  const [swLng, swLat, neLng, neLat] = bounds;
  return lng >= swLng && lng <= neLng && lat >= swLat && lat <= neLat;
}

/**
 * GET /api/map/markers
 *
 * Returns lean marker data for the visible map bounds.
 * Queries Supabase `locations` table; falls back to mock data if unconfigured.
 *
 * Query params:
 *   bounds  (string: "swLng,swLat,neLng,neLat") — viewport filter
 *   mood    (MoodCategory, optional) — exact mood filter
 *   q       (string, optional) — free-text search across name, creator_note,
 *            mood_category, and tags. When present, bounds filter is skipped
 *            so results are returned globally.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawBounds = searchParams.get('bounds') ?? '';
  const mood = searchParams.get('mood') as MoodCategory | null;
  const q = searchParams.get('q')?.trim() ?? '';

  const bounds = rawBounds.split(',').map(Number);
  const validBounds = bounds.length === 4 && bounds.every(isFinite);

  // ── Supabase path ────────────────────────────────────────────────────────
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServer();

      let query = supabase
        .from('locations')
        .select('id, name, latitude, longitude, mood_category, tags, creator_note, user_id, is_public');

      // ── Text search: match across name, creator_note, mood_category, tags ──
      // When a search query is present we search globally (skip bounds filter)
      // so results from anywhere in the DB can surface.
      if (q) {
        // Escape % and _ to prevent wildcard injection
        const safe = q.replace(/%/g, '\\%').replace(/_/g, '\\_');
        query = query.or(
          [
            `name.ilike.%${safe}%`,
            `creator_note.ilike.%${safe}%`,
            `mood_category.ilike.%${safe}%`,
            `tags.ilike.%${safe}%`,
          ].join(','),
        );
      } else {
        // No text search — apply bounds and mood filters as normal
        if (mood) query = query.eq('mood_category', mood);

        if (validBounds) {
          const [swLng, swLat, neLng, neLat] = bounds;
          query = query
            .gte('longitude', swLng)
            .lte('longitude', neLng)
            .gte('latitude', swLat)
            .lte('latitude', neLat);
        }
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;

      const markers: MapMarkerData[] = (data ?? []).map((row) => ({
        id: row.id,
        lngLat: [row.longitude, row.latitude] as [number, number],
        name: row.name,
        mood_category: row.mood_category ?? null,
        tags: parseTags(row.tags),
        state: 'default' as const,
        is_public: row.is_public ?? true,
        ...(row.creator_note ? { creator_note: row.creator_note } : {}),
        ...(row.user_id ? { user_id: row.user_id } : {}),
      }));

      return NextResponse.json(markers);
    } catch (err) {
      console.error('[GET /api/map/markers] Supabase error, falling back to mock:', err);
      // Fall through to mock
    }
  }

  // ── Mock fallback ────────────────────────────────────────────────────────
  let markers = validBounds && !q
    ? MOCK_MARKERS.filter((m) => inBounds(m.lngLat[0], m.lngLat[1], bounds))
    : MOCK_MARKERS;

  if (mood && !q) markers = markers.filter((m) => m.mood_category === mood);

  // Client-side mock text search
  if (q) {
    const lq = q.toLowerCase();
    markers = markers.filter((m) =>
      m.name.toLowerCase().includes(lq) ||
      m.mood_category?.toLowerCase().includes(lq) ||
      m.tags.some((t) => t.toLowerCase().includes(lq)) ||
      m.creator_note?.toLowerCase().includes(lq),
    );
  }

  return NextResponse.json(markers);
}
