import { IDiscoveryRepository } from '../core/repositories/discoveryRepository';
import { PaginatedPublicLocations, TrendingLocation } from '../core/models/publicLocation';
import { FeedQueryParams, TrendingQueryParams } from '../core/models/feed';

/**
 * Fetch-based implementation of IDiscoveryRepository.
 * Routes all requests through Next.js API routes as per system.md §1.2.
 *
 * @implements {IDiscoveryRepository}
 */
export class DiscoveryApiRepository implements IDiscoveryRepository {
  /** Base URL for all discovery API endpoints */
  private readonly baseUrl = '/api/discovery';

  /**
   * Fetches a paginated, filtered public location feed.
   *
   * @param params - Filter, sort, and pagination query params
   * @returns Paginated public locations
   */
  async getPublicFeed(params: FeedQueryParams): Promise<PaginatedPublicLocations> {
    const query = new URLSearchParams({
      page:  String(params.page),
      limit: String(params.limit),
    });

    if (params.mood && params.mood !== 'all') query.set('mood', params.mood);
    if (params.tags)                           query.set('tags', params.tags);
    if (params.sortOrder)                      query.set('sortOrder', params.sortOrder);

    const res = await fetch(`${this.baseUrl}/feed?${query.toString()}`);

    if (!res.ok) throw new Error(`Failed to fetch public feed: ${res.statusText}`);

    return res.json();
  }

  /**
   * Fetches the top trending public locations for a given period.
   *
   * @param params - Period and limit options
   * @returns Ordered array of trending locations
   */
  async getTrending(params: TrendingQueryParams): Promise<TrendingLocation[]> {
    const query = new URLSearchParams({
      period: params.period,
      limit:  String(params.limit),
    });

    const res = await fetch(`${this.baseUrl}/trending?${query.toString()}`);

    if (!res.ok) throw new Error(`Failed to fetch trending locations: ${res.statusText}`);

    return res.json();
  }

  /**
   * Toggles a like on a public location.
   * The server resolves the current user from the session cookie.
   *
   * @param locationId - Location UUID to like/unlike
   * @returns { liked, like_count } — server truth after the toggle
   */
  async toggleLike(locationId: string): Promise<{ liked: boolean; like_count: number }> {
    const res = await fetch(`${this.baseUrl}/likes/${locationId}`, { method: 'POST' });

    if (!res.ok) throw new Error(`Failed to toggle like: ${res.statusText}`);

    return res.json();
  }
}

/**
 * Singleton instance of the Discovery API repository.
 * Used by all Discovery hooks and usecases.
 */
export const discoveryRepository = new DiscoveryApiRepository();
