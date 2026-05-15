import {
  DEFAULT_LOCATION_STORAGE_RULES,
  FeatureFlagPayload,
} from '@/shared/constants/storage-limits';
import { isSupabaseConfigured } from '@/shared/utils/supabase';
import { createClient } from '@/shared/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/map/saved
 *
 * Two modes:
 *  - `?location_id=<id>` → `{ saved: boolean; saved_count: number }`
 *    Returns whether the current user has saved the given location.
 *  - (no params)         → `{ saved_count: number; locations: MapMarkerData[] }`
 *    Returns the user's full saved list as map markers.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('location_id');

  if (!isSupabaseConfigured()) {
    return locationId
      ? NextResponse.json({ saved: false, saved_count: 0 })
      : NextResponse.json({ saved_count: 0, locations: [] });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return locationId
        ? NextResponse.json({ saved: false, saved_count: 0 })
        : NextResponse.json({ saved_count: 0, locations: [] });
    }

    // ── Mode A: single-location saved check ────────────────────────────────
    if (locationId) {
      const [statusResult, countResult] = await Promise.all([
        supabase
          .from('saved_locations')
          .select('id')
          .eq('user_id', user.id)
          .eq('location_id', locationId)
          .maybeSingle(),
        supabase
          .from('saved_locations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      return NextResponse.json({
        saved: !!statusResult.data,
        saved_count: countResult.count ?? 0,
      });
    }

    // ── Mode B: full saved list with location data ──────────────────────────
    const { data, error } = await supabase
      .from('saved_locations')
      .select(`
        location_id,
        saved_at,
        locations (
          id, name, latitude, longitude, mood_category, tags, creator_note, user_id, is_public
        )
      `)
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false });

    if (error) throw error;

    const parseTags = (raw: string | null | undefined): string[] =>
      raw ? raw.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

    const locations = (data ?? [])
      .map((row: any) => {
        const loc = row.locations;
        if (!loc) return null;
        return {
          id: loc.id,
          lngLat: [loc.longitude, loc.latitude] as [number, number],
          name: loc.name,
          mood_category: loc.mood_category ?? null,
          tags: Array.isArray(loc.tags) ? loc.tags : parseTags(loc.tags),
          state: 'default' as const,
          is_public: loc.is_public,
          ...(loc.creator_note ? { creator_note: loc.creator_note } : {}),
          ...(loc.user_id ? { user_id: loc.user_id } : {}),
          saved_at: row.saved_at,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ saved_count: locations.length, locations });
  } catch (err) {
    console.error('[GET /api/map/saved] error:', err);
    return locationId
      ? NextResponse.json({ saved: false, saved_count: 0 })
      : NextResponse.json({ saved_count: 0, locations: [] });
  }
}

/**
 * POST /api/map/saved
 *
 * Saves a location to the user's personal saved list.
 * Enforces the `feat-location-management` storage limit (default: 50).
 *
 * Body: `{ location_id: string }`
 * Response (success): `{ saved: true; saved_count: number }`
 * Response (limit):   `{ error: 'LIMIT_EXCEEDED'; message: string }` — HTTP 429
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  let body: { location_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { location_id } = body;
  if (!location_id || typeof location_id !== 'string') {
    return NextResponse.json({ error: 'location_id is required' }, { status: 422 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // ── Enforce storage limit (feat-location-management) ──────────────────────
    const { data: flagData } = await supabase
      .from('feature_flags')
      .select('is_enabled, rules')
      .eq('key', 'feat-location-management')
      .maybeSingle();

    const flag = flagData as FeatureFlagPayload | null;
    const rules = flag?.rules ?? DEFAULT_LOCATION_STORAGE_RULES;
    const flagEnabled = flag === null || flag.is_enabled;

    if (flagEnabled) {
      const { count, error: countError } = await supabase
        .from('saved_locations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (!countError && count !== null && count >= rules.free_tier_max_limit) {
        const message = rules.enable_premium_marketing_ui
          ? rules.messages.monetized_limit_reached
          : rules.messages.standard_limit_reached;
        return NextResponse.json({ error: 'LIMIT_EXCEEDED', message }, { status: 429 });
      }
    }

    // ── Insert the save ────────────────────────────────────────────────────────
    const { error: insertError } = await supabase
      .from('saved_locations')
      .insert({ user_id: user.id, location_id });

    if (insertError) {
      // Unique constraint violation = already saved — treat as success
      if (insertError.code === '23505') {
        const { count } = await supabase
          .from('saved_locations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        return NextResponse.json({ saved: true, saved_count: count ?? 0 });
      }
      throw insertError;
    }

    const { count } = await supabase
      .from('saved_locations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({ saved: true, saved_count: count ?? 0 }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/map/saved] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/map/saved
 *
 * Removes a location from the user's saved list.
 *
 * Body: `{ location_id: string }`
 * Response: `{ saved: false; saved_count: number }`
 */
export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  let body: { location_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { location_id } = body;
  if (!location_id || typeof location_id !== 'string') {
    return NextResponse.json({ error: 'location_id is required' }, { status: 422 });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await supabase
      .from('saved_locations')
      .delete()
      .eq('user_id', user.id)
      .eq('location_id', location_id);

    const { count } = await supabase
      .from('saved_locations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({ saved: false, saved_count: count ?? 0 });
  } catch (err) {
    console.error('[DELETE /api/map/saved] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
