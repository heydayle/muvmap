import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Upserts a minimal `profiles` row for the authenticated user before any
 * INSERT that has `user_id → profiles(id)` as a foreign key.
 *
 * Safe to call on every request — uses `ignoreDuplicates: true` so existing
 * profiles are never overwritten. For anonymous users a generated username
 * like `anon_a1b2c3d4` is used; for email/OAuth users the username is derived
 * from their email or display name.
 *
 * @param supabase  Cookie-aware Supabase client (from createClient())
 * @param user      The resolved Supabase user object
 */
export async function ensureProfile(supabase: SupabaseClient, user: User): Promise<void> {
  // Derive a stable, unique username from the user identity
  const shortId = user.id.replace(/-/g, '').slice(0, 10);
  let username: string;

  if (user.email) {
    // e.g. "john.doe@gmail.com" → "john.doe_a1b2c3d4e5"
    const emailSlug = user.email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 18);
    username = `${emailSlug}_${shortId}`;
  } else {
    // Anonymous user
    username = `anon_${shortId}`;
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'MuvMap User';

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        username,
        display_name: displayName,
      },
      {
        onConflict: 'id',
        ignoreDuplicates: true, // Don't overwrite existing profiles
      },
    );

  if (error) {
    // Log but don't throw — username uniqueness conflict shouldn't block the insert
    console.warn('[ensureProfile] Upsert warning (non-fatal):', error.message);
  }
}
