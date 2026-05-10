import { NextRequest, NextResponse } from 'next/server';
import { Location } from '@/modules/location/core/models/location';

/**
 * Mock location data for development.
 * Will be replaced with Supabase queries in Phase 1 (Foundation).
 */
const MOCK_LOCATIONS: Location[] = [
  {
    id: '1a2b3c4d-0001-4000-a000-000000000001',
    user_id: 'user-001',
    name: 'Sunset Café',
    description: 'A cozy rooftop café with amazing sunset views and artisan coffee.',
    image_url: null,
    latitude: 13.7563,
    longitude: 100.5018,
    is_public: false,
    mood_category: 'calm',
    tags: [
      { name: 'cozy', source: 'ai', confidence: 0.92 },
      { name: 'coffee', source: 'manual' },
      { name: 'sunset', source: 'ai', confidence: 0.88 },
    ],
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
  },
  {
    id: '1a2b3c4d-0002-4000-a000-000000000002',
    user_id: 'user-001',
    name: 'Midnight Park',
    description: 'A peaceful park that comes alive at night with ambient lighting.',
    image_url: null,
    latitude: 13.7469,
    longitude: 100.5349,
    is_public: true,
    mood_category: 'chill',
    tags: [
      { name: 'night', source: 'manual' },
      { name: 'scenic', source: 'ai', confidence: 0.85 },
      { name: 'quiet', source: 'ai', confidence: 0.91 },
    ],
    created_at: '2026-04-02T14:30:00Z',
    updated_at: '2026-04-02T14:30:00Z',
  },
  {
    id: '1a2b3c4d-0003-4000-a000-000000000003',
    user_id: 'user-001',
    name: 'Electric Arcade',
    description: 'Retro gaming arcade with neon lights and a high-energy atmosphere.',
    image_url: null,
    latitude: 13.7462,
    longitude: 100.5347,
    is_public: false,
    mood_category: 'excited',
    tags: [
      { name: 'gaming', source: 'manual' },
      { name: 'neon', source: 'ai', confidence: 0.78 },
      { name: 'late-night', source: 'manual' },
    ],
    created_at: '2026-04-03T20:00:00Z',
    updated_at: '2026-04-03T20:00:00Z',
  },
  {
    id: '1a2b3c4d-0004-4000-a000-000000000004',
    user_id: 'user-001',
    name: 'Lakeside Trail',
    description: 'A winding trail along the lake — perfect for morning jogs and contemplation.',
    image_url: null,
    latitude: 13.7319,
    longitude: 100.5231,
    is_public: false,
    mood_category: 'energetic',
    tags: [
      { name: 'nature', source: 'manual' },
      { name: 'morning', source: 'ai', confidence: 0.86 },
      { name: 'exercise', source: 'manual' },
    ],
    created_at: '2026-04-05T07:00:00Z',
    updated_at: '2026-04-05T07:00:00Z',
  },
];

/**
 * GET /api/locations — Fetch paginated list of locations.
 * Source: rules/system.md §3.1 (always scoped, limited, lean)
 *
 * @param request - Incoming request with query params: page, limit
 * @returns JSON response with paginated locations
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '0', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);

  const start = page * limit;
  const end = start + limit;
  const data = MOCK_LOCATIONS.slice(start, end);

  return NextResponse.json({
    data,
    total: MOCK_LOCATIONS.length,
    page,
    limit,
    hasMore: end < MOCK_LOCATIONS.length,
  });
}

/**
 * POST /api/locations — Create a new location.
 * Source: rules/system.md §2.2 (sanitize all inputs)
 *
 * @param request - Incoming request with JSON body
 * @returns JSON response with the created location
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  const newLocation = {
    id: crypto.randomUUID(),
    user_id: 'user-001',
    name: String(body.name ?? '').trim(),
    description: body.description ? String(body.description).trim() : null,
    image_url: body.image_url ?? null,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    is_public: body.is_public ?? false,
    mood_category: body.mood_category ?? null,
    tags: (body.tags ?? []).map((t: string) => ({
      name: t.toLowerCase().trim(),
      source: 'manual' as const,
    })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  MOCK_LOCATIONS.push(newLocation);

  return NextResponse.json(newLocation, { status: 201 });
}
