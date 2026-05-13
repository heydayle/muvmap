'use client';

import { cn } from '@/shared/utils/cn';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Navigation item definition.
 */
interface NavItem {
  /** Display label for the nav link */
  label: string;
  /** Route path */
  href: string;
  /** Emoji icon rendered before the label */
  icon: string;
}

/**
 * Top-level navigation links for the entire app.
 * Add / remove entries here as new routes are created.
 */
const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Discover', href: '/discover', icon: '🔍' },
  { label: 'Map', href: '/map', icon: '🗺️' },
];

/**
 * AppNavbar — site-wide navigation bar.
 *
 * Glassmorphism pill positioned at the top-center of the viewport.
 * Active route is highlighted with the primary accent color.
 * Designed to co-exist with the top-right AuthSection without overlap.
 *
 * Per CLAUDE.md §1: Lives in `shared/components/organisms/`, exported
 * to `app/layout.tsx` via the shared barrel.
 *
 * @returns The navigation bar component
 */
export default function AppNavbar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="fixed left-4 top-4 z-[99]">
      <ul
        className={cn(
          'flex flex-col gap-1 rounded-sm px-1 py-2',
          'border border-border-glass bg-surface-glass',
          'shadow-card backdrop-blur-[var(--blur-glass)]',
        )}
        role="list"
      >
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
                  'flex items-center gap-1.5 rounded-pill px-4 py-2',
                  'text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/20 text-primary shadow-[inset_0_0_0_1px_rgba(0,123,255,0.35)]'
                    : 'text-text-secondary hover:bg-white/5 hover:text-text-primary',
                )}
              >
                <span aria-hidden="true">{icon}</span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
