import { PaginatedPublicLocations, TrendingLocation } from '../models/publicLocation';
import { FeedQueryParams, TrendingQueryParams } from '../models/feed';

/**
 * Repository contract for the Discovery feature.
 * Defines all data access operations required by Discovery usecases.
 *
 * Implementations: DiscoveryApiRepository (infras/discoveryApi.ts)
 */
export interface IDiscoveryRepository {
  /**
   * Fetches a paginated, filtered list of public locations for the feed.
   *
   * @param params - Filter, sort, and pagination options
   * @returns Paginated public locations
   */
  getPublicFeed(params: FeedQueryParams): Promise<PaginatedPublicLocations>;

  /**
   * Fetches the top trending public locations for a given time period.
   *
   * @param params - Period and limit options
   * @returns Ordered list of trending locations (rank 1 = hottest)
   */
  getTrending(params: TrendingQueryParams): Promise<TrendingLocation[]>;
}
