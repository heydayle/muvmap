import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Supabase client for use inside Next.js middleware.
 * Keeps the user's session token refreshed by reading/writing cookies
 * on both the request and response.
 *
 * Usage in middleware.ts:
 *   import { createClient } from '@/shared/utils/supabase/middleware'
 *   export async function middleware(request: NextRequest) {
 *     return createClient(request)
 *   }
 */
export function createClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } });

  createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  return supabaseResponse;
}
