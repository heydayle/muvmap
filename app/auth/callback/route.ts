import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/utils/supabase/server';

/**
 * GET /auth/callback
 *
 * Supabase redirects here after:
 *  - Email magic link click
 *  - OAuth provider (Google) authorization
 *
 * Exchanges the one-time `code` for a Supabase session cookie,
 * then redirects the user back to the page they came from (or /map).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/map';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to an error page or home on failure
  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
