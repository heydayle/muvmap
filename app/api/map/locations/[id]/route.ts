import { MoodCategory } from '@/shared/types';
import { isSupabaseConfigured } from '@/shared/utils/supabase';
import { createClient } from '@/shared/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const parseTags = (raw: string | null | undefined): string[] =>
  raw ? raw.split(',').map((t) => t.trim()).filter(Boolean) : [];

const joinTags = (arr: string[]): string => arr.join(',');

interface UpdateLocationBody {
  name?: string;
  mood_category?: MoodCategory | null;
  tags?: string[];
  creator_note?: string | null;
  is_public?: boolean;
}

/**
 * PATCH /api/map/locations/[id]
 *
 * Updates a location. The Supabase RLS policy `locations_owner_update`
 * (`auth.uid() = user_id`) ensures only the creator can modify their spot.
 * No extra server-side ownership check is needed — the DB enforces it.
 *
 * Body: { name?, mood_category?, tags?, creator_note? }
 * Returns: updated MapMarkerData-shaped object
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Location id is required' }, { status: 400 });
  }

  let body: UpdateLocationBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, mood_category, tags, creator_note } = body;

  // Build the patch — only include provided fields
  const patch: Record<string, unknown> = {};

  if (name !== undefined) {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      return NextResponse.json({ error: 'name must be at least 2 characters' }, { status: 422 });
    }
    patch.name = trimmed;
  }
  if (mood_category !== undefined) patch.mood_category = mood_category;
  if (tags !== undefined) patch.tags = joinTags(Array.isArray(tags) ? tags.slice(0, 10) : []);
  if (creator_note !== undefined) {
    patch.creator_note = typeof creator_note === 'string'
      ? creator_note.trim().slice(0, 500) || null
      : null;
  }
  patch.is_public = true;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 422 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // Cookie-aware client: RLS `locations_owner_update` (auth.uid() = user_id)
    // will silently reject the UPDATE if the caller is not the owner.
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('locations')
      .update(patch)
      .eq('id', id)
      .select('id, name, latitude, longitude, mood_category, tags, creator_note, user_id, is_public')
      .single();

    if (error) {
      // RLS rejection returns PGRST116 (no rows) — surface as 403
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Not found or you are not the creator of this location.' },
          { status: 403 },
        );
      }
      throw error;
    }

    return NextResponse.json({
      id: data.id,
      lngLat: [data.longitude, data.latitude],
      name: data.name,
      mood_category: data.mood_category ?? null,
      tags: parseTags(data.tags),
      state: 'default',
      is_public: data.is_public,
      ...(data.creator_note ? { creator_note: data.creator_note } : {}),
      ...(data.user_id ? { user_id: data.user_id } : {}),
    });
  } catch (err) {
    console.error('[PATCH /api/map/locations/:id]', err);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}
