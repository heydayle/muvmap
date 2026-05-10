'use client';

import { createClient } from '@/shared/utils/supabase/client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export interface UseUserResult {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Sign out the current user */
  signOut: () => Promise<void>;
}

/**
 * Reactive hook that tracks the Supabase auth state.
 *
 * - Returns `loading: true` on first render until the session is resolved.
 * - Re-renders automatically on sign-in / sign-out.
 * - Safe to call in any Client Component — uses the browser Supabase client.
 *
 * @example
 *   const { user, isAuthenticated } = useUser();
 *   if (!isAuthenticated) return <SignInPrompt />;
 */
export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Initial session check
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return { user, loading, isAuthenticated: !!user, signOut };
}
