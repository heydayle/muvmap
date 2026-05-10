import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/shared/utils/supabase';
import { createClient } from '@/shared/utils/supabase/server';
import { ensureProfile } from '@/shared/utils/ensureProfile';

interface ReviewBody {
  location_id: string;
  rating: number;
  text?: string;
}

/** Shape returned per review in the GET response */
export interface ReviewRow {
  id: string;
  location_id: string;
  rating: number;
  text: string | null;
  created_at: string;
  /** Display handle from the reviewer's profile, or null for anonymous */
  author_handle: string | null;
}

// ── GET ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/reviews?location_id=:id
 *
 * Returns all reviews for a location, newest first.
 * Joins the `profiles` table (separate query, merged in route layer)
 * to resolve author handles.
 *
 * Response: { reviews: ReviewRow[], average_rating: number, total: number }
 */
export async function GET(request: NextRequest) {
  const locationId = new URL(request.url).searchParams.get('location_id');

  if (!locationId) {
    return NextResponse.json({ error: 'location_id query param is required' }, { status: 400 });
  }

  // ── Supabase path ──────────────────────────────────────────────────────────
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      // 1. Fetch reviews for the location
      const { data: reviewRows, error } = await supabase
        .from('reviews')
        .select('id, location_id, rating, text, user_id, created_at')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const rows = reviewRows ?? [];

      // 2. Fetch profiles for all reviewers (reviews.user_id === profiles.id)
      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      const handleMap = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        for (const p of profileRows ?? []) {
          if (p.username) handleMap.set(p.id, `@${p.username}`);
        }
      }

      // 3. Merge
      const reviews: ReviewRow[] = rows.map((r) => ({
        id:            r.id,
        location_id:   r.location_id,
        rating:        r.rating,
        text:          r.text ?? null,
        created_at:    r.created_at,
        author_handle: r.user_id ? (handleMap.get(r.user_id) ?? null) : null,
      }));

      const average_rating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      return NextResponse.json({ reviews, average_rating, total: reviews.length });
    } catch (err) {
      console.error('[GET /api/reviews] Supabase error:', err);
      return NextResponse.json(
        { reviews: [], average_rating: 0, total: 0 },
        { status: 200 },
      );
    }
  }

  // ── Mock fallback ──────────────────────────────────────────────────────────
  return NextResponse.json({ reviews: [], average_rating: 0, total: 0 });
}

// ── POST ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/reviews
 *
 * Flow:
 *  1. Validate request body
 *  2. Resolve user from session cookie (anonymous or authenticated)
 *  3. Upsert a `profiles` row — satisfies any FK constraints on `reviews.user_id`
 *  4. Insert the review
 *
 * Uses the cookie-aware `createClient()` so the INSERT inherits the
 * user's session role (`authenticated`) and satisfies RLS.
 */
export async function POST(request: NextRequest) {
  let body: ReviewBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { location_id, rating, text } = body;

  if (!location_id || typeof location_id !== 'string') {
    return NextResponse.json({ error: 'location_id is required' }, { status: 422 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be an integer between 1 and 5' }, { status: 422 });
  }

  const sanitizedText = typeof text === 'string' ? text.trim().slice(0, 1000) || undefined : undefined;

  // ── Supabase path ──────────────────────────────────────────────────────────
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();

      // Ensure profile exists before inserting (reviews.user_id → profiles(id))
      if (user) {
        await ensureProfile(supabase, user);
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          location_id,
          rating,
          ...(sanitizedText ? { text: sanitizedText } : {}),
          ...(user ? { user_id: user.id } : {}),
        })
        .select('id, location_id, rating, text, created_at')
        .single();

      if (error) throw error;

      return NextResponse.json(data, { status: 201 });
    } catch (err) {
      console.error('[POST /api/reviews] Supabase error:', err);
      return NextResponse.json({ error: 'Failed to save review. Please try again.' }, { status: 500 });
    }
  }

  // ── Graceful fallback (Supabase not configured) ────────────────────────────
  return NextResponse.json(
    {
      id: `review-${Date.now()}`,
      location_id,
      rating,
      text: sanitizedText ?? null,
      created_at: new Date().toISOString(),
    },
    { status: 201 },
  );
}
