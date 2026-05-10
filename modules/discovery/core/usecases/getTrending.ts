import { IDiscoveryRepository } from '../repositories/discoveryRepository';
import { TrendingLocation } from '../models/publicLocation';
import { TrendingQueryParams, TrendingPeriod, DEFAULT_TRENDING_PARAMS } from '../models/feed';

/**
 * Valid trending period values for guard checks.
 */
const VALID_PERIODS: TrendingPeriod[] = ['day', 'week', 'month'];

/**
 * Input shape for the getTrending usecase.
 */
export interface GetTrendingInput {
  /** Time period window (default: 'week') */
  period?: TrendingPeriod;
  /** Maximum number of results (clamped to 1–20, default: 10) */
  limit?: number;
}

/**
 * Fetches the top trending public locations for a given time period.
 * Validates period value and clamps limit before passing to the repository.
 *
 * @param repository - The discovery data repository
 * @param input - Raw period/limit inputs from the hook
 * @returns Ordered array of trending locations (rank 1 = hottest)
 */
export async function getTrending(
  repository: IDiscoveryRepository,
  input: GetTrendingInput = {},
): Promise<TrendingLocation[]> {
  const period = VALID_PERIODS.includes(input.period as TrendingPeriod)
    ? (input.period as TrendingPeriod)
    : DEFAULT_TRENDING_PARAMS.period;

  const limit = Math.min(20, Math.max(1, input.limit ?? DEFAULT_TRENDING_PARAMS.limit));

  const params: TrendingQueryParams = { period, limit };

  return repository.getTrending(params);
}
