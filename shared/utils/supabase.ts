/**
 * Supabase utilities index.
 *
 * Project-wide import paths:
 *   Server Components / API routes  → @/shared/utils/supabase  (this file)
 *   Client Components               → @/shared/utils/supabase/client
 *   Middleware                      → @/shared/utils/supabase/middleware
 */

import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  '';

/**
 * Returns true if Supabase credentials are properly configured.
 * Used by API routes to decide whether to query Supabase or fall back to mock data.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabaseKey &&
      !supabaseKey.startsWith('your-') &&
      supabaseUrl.includes('supabase.co'),
  );
}

/**
 * Creates a lightweight Supabase client for API Route Handlers.
 * Does NOT use cookies — suitable for public data access and service-role operations.
 *
 * For Server Components that need the user's session, use:
 *   import { createClient } from '@/shared/utils/supabase/server'
 */
let _apiClient: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (!_apiClient) {
    _apiClient = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { getAll: () => [], setAll: () => {} },
    }) as SupabaseClient;
  }
  return _apiClient;
}

// ── Re-exports for convenience ───────────────────────────────────────────────
export { createClient as createServerSupabaseClient } from './supabase/server';
export { createClient as createBrowserSupabaseClient } from './supabase/client';
