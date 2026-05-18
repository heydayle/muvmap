'use client';

/**
 * @file shared/hooks/useLocationGuard.ts
 *
 * Frontend guard hook for the `feat-location-management` feature flag.
 *
 * Validates whether a user can save a new location before the API call is made.
 * Returns `{ hasHitLimit, limitMessage, validateAndExecuteSave }`.
 *
 * - Premium UI is currently suppressed (`enable_premium_marketing_ui: false`).
 * - The hook falls back to compile-time defaults when `configRules` is null,
 *   so it works without an active Supabase connection.
 *
 * @see rules/features/save-locations/flag.md  §5.1
 */

import { useMemo } from 'react';
import {
  DEFAULT_LOCATION_STORAGE_RULES,
  LocationStorageRules,
  UserTier,
} from '../constants/storage-limits';

export interface UseLocationGuardOptions {
  /** Number of locations the user has already saved. */
  currentCount: number;
  /** User tier — always 'free' until premium tier is implemented. */
  userTier?: UserTier;
  /** Rules fetched from the remote feature flag. Falls back to defaults if null. */
  configRules?: LocationStorageRules | null;
}

export interface UseLocationGuardReturn {
  /** True when the user has reached their storage limit. */
  hasHitLimit: boolean;
  /**
   * The message to display to the user when the limit is reached.
   * Respects `enable_premium_marketing_ui` — always `standard_limit_reached`
   * in the current beta phase.
   */
  limitMessage: string;
  /**
   * Call this instead of the raw save callback.
   * Returns `true` if the save was allowed and the callback was called,
   * `false` if the limit was hit (no callback is called).
   */
  validateAndExecuteSave: (saveCallback: () => void) => boolean;
}

export function useLocationGuard({
  currentCount,
  userTier = 'free',
  configRules = null,
}: UseLocationGuardOptions): UseLocationGuardReturn {
  // Resolve effective rules, falling back to compile-time defaults
  const rules = useMemo<LocationStorageRules>(
    () => configRules ?? DEFAULT_LOCATION_STORAGE_RULES,
    [configRules],
  );

  const hasHitLimit = useMemo(() => {
    // Premium users are never blocked (future phase — currently no premium users)
    if (userTier === 'premium') return false;
    return currentCount >= rules.free_tier_max_limit;
  }, [currentCount, userTier, rules]);

  // Resolve the correct message based on marketing UI flag
  // Currently always `standard_limit_reached` because enable_premium_marketing_ui = false
  const limitMessage = useMemo(
    () =>
      rules.enable_premium_marketing_ui
        ? rules.messages.monetized_limit_reached
        : rules.messages.standard_limit_reached,
    [rules],
  );

  const validateAndExecuteSave = (saveCallback: () => void): boolean => {
    if (!hasHitLimit) {
      saveCallback();
      return true;
    }
    // Limit is hit — do NOT call saveCallback.
    // The caller is responsible for displaying limitMessage.
    return false;
  };

  return { hasHitLimit, limitMessage, validateAndExecuteSave };
}
