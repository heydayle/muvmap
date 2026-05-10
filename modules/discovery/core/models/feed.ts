import { MoodCategory } from '@/shared/types';

/**
 * Time period options for the trending section.
 * Controls the lookback window for trending score calculation.
 */
export type TrendingPeriod = 'day' | 'week' | 'month';

/**
 * Sort order options for the public feed.
 * - recent: newest first
 * - popular: highest like_count first
 * - nearby: nearest by geo distance (requires user location)
 */
export type FeedSortOrder = 'recent' | 'popular' | 'nearby';

/**
 * Active filter state for the Discovery feed.
 * 'all' mood means no mood filtering is applied.
 */
export interface FeedFilter {
  /** Mood category to filter by, or 'all' for unfiltered */
  mood: MoodCategory | 'all';
  /** Tag names to filter by (AND logic) */
  tags: string[];
  /** Sort order for the result set */
  sortOrder: FeedSortOrder;
}

/**
 * Query parameters for fetching the public feed from the API.
 */
export interface FeedQueryParams {
  /** Page number (0-indexed) */
  page: number;
  /** Items per page */
  limit: number;
  /** Mood filter (omit for all moods) */
  mood?: MoodCategory | 'all';
  /** Comma-separated tag filter */
  tags?: string;
  /** Sort order */
  sortOrder?: FeedSortOrder;
}

/**
 * Query parameters for fetching trending locations from the API.
 */
export interface TrendingQueryParams {
  /** Lookback window */
  period: TrendingPeriod;
  /** Max results to return */
  limit: number;
}

/**
 * Default filter state — unfiltered, most recent first.
 */
export const DEFAULT_FEED_FILTER: FeedFilter = {
  mood: 'all',
  tags: [],
  sortOrder: 'recent',
};

/**
 * Default trending query params.
 */
export const DEFAULT_TRENDING_PARAMS: TrendingQueryParams = {
  period: 'week',
  limit: 10,
};
