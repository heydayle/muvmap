'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/shared/hooks/useUser';

interface UserButtonProps {
  onSignInClick: () => void;
}

/**
 * UserButton — fixed top-right nav pill for auth state.
 *
 * Guest:  "✦ Sign in" ghost button → triggers AuthModal
 * Auth:   Avatar circle with user initials → dropdown (My Spots, Sign out)
 */
export default function UserButton({ onSignInClick }: UserButtonProps) {
  const { user, loading, isAuthenticated, signOut } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (loading) {
    return (
      <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" aria-hidden="true" />
    );
  }

  if (!isAuthenticated) {
    return (
      <motion.button
        id="auth-signin-btn"
        onClick={onSignInClick}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[13px] font-medium text-white/80 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white"
        aria-label="Sign in"
      >
        <span className="text-xs">✦</span>
        Sign in
      </motion.button>
    );
  }

  // ── Authenticated — avatar + dropdown ──────────────────────────────────────
  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : user?.user_metadata?.name
      ? (user.user_metadata.name as string).split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      : '✦';

  return (
    <div ref={dropdownRef} className="relative">
      <motion.button
        id="auth-avatar-btn"
        onClick={() => setDropdownOpen((o) => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-primary to-primary-light text-[12px] font-bold text-white shadow-glow"
        aria-label="Account menu"
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        {initials}
      </motion.button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            key="user-dropdown"
            initial={{ opacity: 0, scale: 0.93, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="absolute right-0 top-[calc(100%+8px)] z-[150] min-w-[180px] overflow-hidden rounded-[16px] border border-white/10 bg-black/80 py-1.5 shadow-2xl backdrop-blur-xl"
            role="menu"
          >
            {/* User info */}
            <div className="border-b border-white/8 px-4 py-2.5">
              <p className="text-[11px] text-white/40">Signed in as</p>
              <p className="truncate text-[13px] font-medium text-white/85">
                {user?.email ?? user?.user_metadata?.name ?? 'You'}
              </p>
            </div>

            <Link
              href="/profile/spots"
              onClick={() => setDropdownOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-white/70 transition-colors hover:bg-white/8 hover:text-white"
            >
              <span>📍</span> My Spots
            </Link>

            <button
              onClick={async () => { setDropdownOpen(false); await signOut(); }}
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-white/70 transition-colors hover:bg-white/8 hover:text-white"
            >
              <span>👋</span> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
