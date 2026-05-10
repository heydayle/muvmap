import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Browser-side Supabase client for Client Components.
 * Safe to call multiple times — @supabase/ssr handles singleton internally.
 *
 * Usage (in a 'use client' component):
 *   const supabase = createClient()
 *   const { data } = await supabase.from('table').select()
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
