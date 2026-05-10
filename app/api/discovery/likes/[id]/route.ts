import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/shared/utils/supabase';
import { createClient } from '@/shared/utils/supabase/server';
import { ensureProfile } from '@/shared/utils/ensureProfile';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/discovery/likes/[id]
 *
 * Returns the current like count for a location and whether
 * the calling user has already liked it.
 *
 * Response: { liked: boolean, like_count: number }
 */
export async function GET(
  _request: NextRequest,
  { params }: Params,
) {
  const { id: locationId } = await params;

  if (!locationId) {
    return NextResponse.json({ error: 'Location id is required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ liked: false, like_count: 0 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Count all likes for this location
    const { data: allLikes } = await supabase
      .from('likes')
      .select('id, user_id')
      .eq('location_id', locationId);

    const like_count = allLikes?.length ?? 0;
    const liked = user ? (allLikes ?? []).some((l) => l.user_id === user.id) : false;

    return NextResponse.json({ liked, like_count });
  } catch (err) {
    console.error('[GET /api/discovery/likes/:id]', err);
    return NextResponse.json({ liked: false, like_count: 0 });
  }
}

/**
 * POST /api/discovery/likes/[id]
 *
 * Toggles a like on a public location. Guest users are automatically
 * promoted to anonymous authenticated sessions via signInAnonymously()
 * on the client side (ensureSession), so their session cookie arrives here.
 *
 * - If the user has NOT liked → INSERT → returns { liked: true, like_count }
 * - If the user HAS liked    → DELETE → returns { liked: false, like_count }
 *
 * RLS policy `likes_user_insert`  (auth.uid() = user_id) protects INSERT.
 * RLS policy `likes_user_delete`  (auth.uid() = user_id) protects DELETE.
 *
 * Also upserts the user's profile row first (likes.user_id → profiles(id) FK).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: locationId } = await params;

  if (!locationId) {
    return NextResponse.json({ error: 'Location id is required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    // Graceful fallback: just echo a mock toggle
    return NextResponse.json({ liked: true, like_count: 1 }, { status: 200 });
  }

  try {
    const supabase = await createClient();

    // Must be authenticated (anonymous counts)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Ensure profile row exists (likes.user_id → profiles(id) FK)
    await ensureProfile(supabase, user);

    // ── Check existing like ────────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('location_id', locationId)
      .maybeSingle();

    let liked: boolean;

    if (existing) {
      // ── Unlike ─────────────────────────────────────────────────────────
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
      liked = false;
    } else {
      // ── Like ───────────────────────────────────────────────────────────
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: user.id, location_id: locationId });
      if (error) throw error;
      liked = true;
    }

    // ── Return updated count ───────────────────────────────────────────────
    const { data: countRows } = await supabase
      .from('likes')
      .select('id')
      .eq('location_id', locationId);

    const like_count = countRows?.length ?? 0;

    return NextResponse.json({ liked, like_count });
  } catch (err) {
    console.error('[POST /api/discovery/likes/:id]', err);
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 });
  }
}
