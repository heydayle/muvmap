import { type NextRequest } from 'next/server';
import { createClient } from '@/shared/utils/supabase/middleware';

/**
 * Next.js proxy — runs on every matched request.
 * Uses Supabase's SSR helper to keep user sessions alive by refreshing
 * the auth token cookie before it expires.
 */
export async function proxy(request: NextRequest) {
  return createClient(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (static assets)
     *  - _next/image   (Next.js image optimisation)
     *  - favicon.ico   (favicon)
     *  - Public files with extensions (.svg, .png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
