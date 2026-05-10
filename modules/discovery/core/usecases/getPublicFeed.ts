import { IDiscoveryRepository } from '../repositories/discoveryRepository';
import { PaginatedPublicLocations } from '../models/publicLocation';
import { FeedQueryParams, DEFAULT_FEED_FILTER } from '../models/feed';
import { MoodCategory } from '@/shared/types';

/**
 * Default page size for the public discovery feed.
 */
const DEFAULT_PAGE_SIZE = 20;

/**
 * Validated and normalized query parameters for a public feed request.
 * Ensures all consumer inputs are safe before passing to the repository.
 */
export interface GetPublicFeedInput {
  /** Page number (0-indexed, clamped to >= 0) */
  page?: number;
  /** Items per page (clamped to 1–50) */
  limit?: number;
  /** Mood filter ('all' means no filter) */
  mood?: MoodCategory | 'all';
  /** Tag names to filter by */
  tags?: string[];
  /** Sort order */
  sortOrder?: FeedQueryParams['sortOrder'];
}

/**
 * Fetches and returns a paginated page of public locations.
 * Validates and normalizes all input params before delegating to the repository.
 *
 * @param repository - The discovery data repository
 * @param input - Raw filter/page inputs from the hook
 * @returns Paginated public location data
 */
export async function getPublicFeed(
  repository: IDiscoveryRepository,
  input: GetPublicFeedInput = {},
): Promise<PaginatedPublicLocations> {
  const page = Math.max(0, input.page ?? 0);
  const limit = Math.min(50, Math.max(1, input.limit ?? DEFAULT_PAGE_SIZE));
  const mood = input.mood ?? DEFAULT_FEED_FILTER.mood;
  const tags = (input.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean);
  const sortOrder = input.sortOrder ?? DEFAULT_FEED_FILTER.sortOrder;

  const params: FeedQueryParams = {
    page,
    limit,
    mood,
    tags: tags.join(','),
    sortOrder,
  };

  return repository.getPublicFeed(params);
}
