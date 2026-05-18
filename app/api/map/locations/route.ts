import { MapMarkerData } from '@/modules/map/core/models/mapMarker';
import { MoodCategory } from '@/shared/types';
import { ensureProfile } from '@/shared/utils/ensureProfile';
import { isSupabaseConfigured } from '@/shared/utils/supabase';
import { createClient } from '@/shared/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/** DB stores tags as a comma-joined string; UI expects string[] */
const parseTags = (raw: string | null | undefined): string[] =>
  raw ? raw.split(',').map((t) => t.trim()).filter(Boolean) : [];

const joinTags = (arr: string[]): string => arr.join(',');

interface AddLocationBody {
  name: string;
  longitude: number;
  latitude: number;
  mood_category?: MoodCategory | null;
  tags?: string[];
  creator_note?: string;
  is_public?: boolean;
}

/**
 * POST /api/map/locations
 *
 * Flow:
 *  1. Validate request body
 *  2. Resolve user from session cookie (anonymous or authenticated)
 *  3. Upsert a `profiles` row — satisfies the FK constraint `locations.user_id → profiles(id)`
 *  4. Insert the location
 *
 * Uses the cookie-aware `createClient()` so the INSERT inherits the
 * user's session role (`authenticated`) and satisfies RLS.
 */
export async function POST(request: NextRequest) {
  let body: AddLocationBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, longitude, latitude, mood_category = null, tags = [], creator_note } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'name must be at least 2 characters' }, { status: 422 });
  }
  if (typeof longitude !== 'number' || typeof latitude !== 'number') {
    return NextResponse.json({ error: 'longitude and latitude must be numbers' }, { status: 422 });
  }

  const sanitizedNote = typeof creator_note === 'string'
    ? creator_note.trim().slice(0, 500)
    : undefined;

  const sanitizedTags = joinTags(Array.isArray(tags) ? tags.slice(0, 10) : []);

  // ── Supabase path ──────────────────────────────────────────────────────────
  if (isSupabaseConfigured()) {
    try {
      // Cookie-aware client: inherits the user's session role (authenticated)
      const supabase = await createClient();

      // Resolve the authenticated user (anonymous or real)
      const { data: { user } } = await supabase.auth.getUser();

      // ── STEP 1: Ensure the profiles row exists ─────────────────────────────
      // locations.user_id → profiles(id) FK requires the profile to exist first.
      if (user) {
        await ensureProfile(supabase, user);
      }

      // ── STEP 2: Insert the location ────────────────────────────────────────
      const { data, error } = await supabase
        .from('locations')
        .insert({
          name: name.trim(),
          longitude,
          latitude,
          mood_category: mood_category ?? null,
          tags: sanitizedTags,
          is_public: true,
          ...(sanitizedNote ? { creator_note: sanitizedNote } : {}),
          ...(user ? { user_id: user.id } : {}),
        })
        .select('id, name, latitude, longitude, mood_category, tags, creator_note, user_id, is_public')
        .single();

      if (error) throw error;

      // ── WEBHOOK TO MISSYOU (Fire and forget) ─────────────────────────────
      const webhookUrl = process.env.MISSYOU_WEBHOOK_URL;
      const webhookSecret = process.env.MISSYOU_WEBHOOK_SECRET;
      
      if (webhookUrl && webhookSecret) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${webhookSecret}`,
          },
          body: JSON.stringify(data),
        }).catch((err) => console.error('[Webhook] Failed to sync to Missyou:', err));
      }
      // ───────────────────────────────────────────────────────────────────────

      const marker: MapMarkerData = {
        id: data.id,
        lngLat: [data.longitude, data.latitude],
        name: data.name,
        mood_category: data.mood_category ?? null,
        tags: parseTags(data.tags),
        state: 'default',
        is_public: data.is_public,
        ...(data.creator_note ? { creator_note: data.creator_note } : {}),
        ...(data.user_id ? { user_id: data.user_id } : {}),
      };

      return NextResponse.json(marker, { status: 201 });
    } catch (err) {
      console.error('[POST /api/map/locations] Supabase error, falling back to in-memory:', err);
    }
  }

  // ── In-memory fallback (Supabase not configured) ───────────────────────────
  const newMarker: MapMarkerData = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    lngLat: [longitude, latitude],
    name: name.trim(),
    mood_category: mood_category ?? null,
    tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
    state: 'default',
    is_public: true,
    ...(sanitizedNote ? { creator_note: sanitizedNote } : {}),
  };

  return NextResponse.json(newMarker, { status: 201 });
}
