/**
 * @file shared/constants/storage-limits.ts
 *
 * Global constants and types for the `feat-location-management` feature flag.
 * These are compile-time fallbacks used when the remote Supabase flag is
 * unavailable (e.g. in development without Supabase configured).
 *
 * @see rules/features/save-locations/flag.md
 */

/** Hard cap for beta free-tier users. Matches `feature_flags.rules.free_tier_max_limit`. */
export const DEFAULT_FREE_STORAGE_LIMIT = 50;

/** Sentinel value meaning "no limit". Stored as -1 in the DB flag config. */
export const UNLIMITED_STORAGE_VALUE = -1;

export type UserTier = 'free' | 'premium';

export interface LocationStorageRules {
  free_tier_max_limit: number;
  premium_tier_max_limit: number;
  /** When false, suppress all Premium upsell UI (current beta phase). */
  enable_premium_marketing_ui: boolean;
  messages: {
    /** Shown when premium UI is suppressed. */
    standard_limit_reached: string;
    /** Shown when premium upsell UI is active (future phase). */
    monetized_limit_reached: string;
  };
}

export interface FeatureFlagPayload {
  key: string;
  is_enabled: boolean;
  rules: LocationStorageRules;
}

/**
 * Compile-time default rules — used when the remote flag cannot be fetched.
 * `enable_premium_marketing_ui` is always false in the beta phase.
 */
export const DEFAULT_LOCATION_STORAGE_RULES: LocationStorageRules = {
  free_tier_max_limit: DEFAULT_FREE_STORAGE_LIMIT,
  premium_tier_max_limit: UNLIMITED_STORAGE_VALUE,
  enable_premium_marketing_ui: false,
  messages: {
    standard_limit_reached: `You have reached the maximum storage limit (${DEFAULT_FREE_STORAGE_LIMIT} locations) for this beta version. Please remove some existing locations to save new ones.`,
    monetized_limit_reached:
      'Your location vault is completely full! Upgrade to Premium now to protect your curated maps and unlock unlimited storage.',
  },
};
