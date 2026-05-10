import { Location } from '@/modules/location/core/models/location';

/**
 * Lightweight author profile snapshot embedded in public location cards.
 * Avoids a full user profile join — only fields needed for discovery UI.
 */
export interface LocationAuthor {
  /** Author user ID */
  id: string;
  /** Public display handle (e.g. @johndoe) */
  handle: string;
  /** Avatar image URL from Supabase Storage, or null */
  avatar_url: string | null;
}

/**
 * A publicly shared location surfaced in the Discovery feed.
 * Extends the base Location entity with social and engagement fields.
 *
 * DB: locations WHERE is_public = true, joined with profiles + engagement counts
 */
export interface PublicLocation extends Location {
  /** Author profile snapshot */
  author: LocationAuthor;
  /** Total number of likes this location has received */
  like_count: number;
  /** Total number of views (impressions) */
  view_count: number;
  /** Whether the current user has liked this location (undefined = unknown/guest) */
  is_liked?: boolean;
}

/**
 * A trending public location — extends PublicLocation with ranking metadata.
 * Trending score is computed server-side by the getTrending usecase.
 */
export interface TrendingLocation extends PublicLocation {
  /**
   * Computed trending score.
   * Formula: (likes * 3 + views) / hours_since_created^1.5
   * Higher = more trending.
   */
  trending_score: number;
  /** Current rank position in the trending list (1-indexed) */
  rank: number;
}

/**
 * Paginated response wrapper for public location feed results.
 */
export interface PaginatedPublicLocations {
  /** Public location items for the current page */
  data: PublicLocation[];
  /** Total count matching the applied filters */
  total: number;
  /** Current page number (0-indexed) */
  page: number;
  /** Items per page */
  limit: number;
  /** Whether additional pages are available */
  hasMore: boolean;
}
