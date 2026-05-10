'use client';

/**
 * Location module pages — main entry point.
 *
 * Per CLAUDE.md §1: `pages/index.tsx` is the canonical module page entry exported
 * to `app/<page>/page.tsx`. This file re-exports the primary page component.
 *
 * Usage in `app/locations/page.tsx`:
 * ```tsx
 * import LocationListPage from '@/modules/location/ui/pages';
 * ```
 */
export { default } from './LocationListPage';
