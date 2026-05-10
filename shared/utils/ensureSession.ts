import { createClient } from '@/shared/utils/supabase/client';

/**
 * Ensures the browser has a Supabase session before any authenticated operation.
 *
 * When called:
 *  - If a session already exists (anonymous OR signed-in): no-op.
 *  - If no session: calls `signInAnonymously()` which creates an anonymous user,
 *    sets the session cookie, and transitions the DB role from `anon` → `authenticated`.
 *    This makes `auth.uid()` available so RLS INSERT policies succeed.
 *
 * Call this right before any Supabase INSERT/UPDATE from the client side.
 */
export async function ensureSession(): Promise<void> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('[ensureSession] Anonymous sign-in failed:', error.message);
      // Non-fatal: the API route will attempt the insert anyway and may fail RLS.
    }
  }
}
