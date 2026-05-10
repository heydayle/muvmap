'use client';

/**
 * Centralized re-export hub for all shared components.
 *
 * Per CLAUDE.md §1: `Styled.tsx` is the single import point for
 * all shared UI primitives. Consumers import from here, not from
 * individual atom/organism directories directly.
 *
 * Atomic Design hierarchy:
 *   atoms/ → organisms/ → pages/
 *
 * Usage:
 * ```tsx
 * import { Button, GlassCard, TagPill, Skeleton } from '@/shared/components/Styled';
 * ```
 */

// ── Atoms ──────────────────────────────────────────────────────────────────
export { default as Button } from './atoms/Button';
export { default as GlassCard } from './atoms/GlassCard';
export { default as TagPill } from './atoms/TagPill';
export { default as Skeleton } from './atoms/Skeleton';

// ── Organisms ─────────────────────────────────────────────────────────────
// Organisms will be added here as they are created.
// export { default as AppHeader } from './organisms/AppHeader';
