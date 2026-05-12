'use client';

import { useUser } from '@/shared/hooks/useUser';
import { cn } from '@/shared/utils/cn';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Top-level navigation items rendered inside the header pill.
 * Add / remove entries here as new routes are created.
 */
const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Mood', href: '/mood', icon: '✨' },
  { label: 'Discover', href: '/discover', icon: '🔍' },
  { label: 'Map', href: '/map', icon: '🗺️' },
] as const;

interface UserButtonProps {
  onSignInClick: () => void;
}

/**
 * UserButton — unified top-right header combining site navigation and auth.
 *
 * Renders a single glassmorphism pill containing:
 * - Nav links (Home, Mood, Discover, Map) with active-route highlight
 * - A divider
 * - Auth control: "✦ Sign in" button (guest) or avatar + dropdown (authenticated)
 *
 * @param props.onSignInClick - Callback to open the AuthModal
 * @returns The unified header component
 */
export default function UserButton({ onSignInClick }: UserButtonProps) {
  const { user, loading, isAuthenticated, signOut } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Shared pill wrapper ─────────────────────────────────────────────────────
  return (
    <div
      ref={dropdownRef}
      className={cn(
        'relative flex items-center gap-0.5 sm:gap-1',
        'rounded-full border border-border-glass bg-surface-glass px-1.5 py-1 sm:px-2 sm:py-1.5',
        'shadow-card backdrop-blur-[var(--blur-glass)]',
      )}
    >
      {/* ── Nav links ── */}
      <nav aria-label="Main navigation">
        <ul className="flex items-center gap-0.5" role="list">
          {NAV_ITEMS.map(({ label, href, icon }) => {
            const isActive =
              href === '/' ? pathname === '/' : pathname.startsWith(href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  id={`nav-link-${label.toLowerCase()}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-1.5 sm:px-3',
                    'text-[13px] font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/8 text-white shadow-[inset_0_0_0_1px_rgba(0,123,255,0.3)]'
                      : 'text-text-secondary hover:bg-white/5 hover:text-text-primary',
                  )}
                >
                  <span aria-hidden="true">{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Divider ── */}
      <div className="mx-1 h-5 w-px bg-border-glass" aria-hidden="true" />

      {/* ── Auth control ── */}
      {loading && (
        <div
          className="h-7 w-7 animate-pulse rounded-full bg-white/10"
          aria-hidden="true"
        />
      )}

      {!loading && !isAuthenticated && (
        <motion.button
          id="auth-signin-btn"
          onClick={onSignInClick}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white"
          aria-label="Sign in"
        >
          <span className="text-xs">✦</span>
          Sign in
        </motion.button>
      )}

      {!loading &&
        isAuthenticated &&
        (() => {
          const initials = user?.email
            ? user.email.slice(0, 2).toUpperCase()
            : user?.user_metadata?.name
              ? (user.user_metadata.name as string)
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : '✦';

          return (
            <>
              <motion.button
                id="auth-avatar-btn"
                onClick={() => setDropdownOpen((o) => !o)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-primary to-primary-light text-[11px] font-bold text-white shadow-glow"
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
                      onClick={async () => {
                        setDropdownOpen(false);
                        await signOut();
                      }}
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-white/70 transition-colors hover:bg-white/8 hover:text-white"
                    >
                      <span>👋</span> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          );
        })()}
    </div>
  );
}
