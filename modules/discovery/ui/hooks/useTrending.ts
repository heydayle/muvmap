import { useState, useEffect, useCallback } from 'react';
import { TrendingLocation } from '../../core/models/publicLocation';
import { TrendingPeriod, DEFAULT_TRENDING_PARAMS } from '../../core/models/feed';
import { getTrending } from '../../core/usecases/getTrending';
import { discoveryRepository } from '../../infras/discoveryApi';

/**
 * State shape returned by the useTrending hook.
 */
export interface UseTrendingState {
  /** Ordered trending locations (rank 1 = hottest) */
  locations: TrendingLocation[];
  /** Whether the initial fetch is in progress */
  isLoading: boolean;
  /** Error thrown during fetch, if any */
  error: Error | null;
  /** Re-fetches trending data with the current period */
  refetch: () => void;
}

/**
 * Custom hook for fetching trending public locations.
 * Re-fetches automatically when the period changes.
 *
 * @param period - Trending time window ('day' | 'week' | 'month')
 * @param limit - Max number of trending locations to return (default 10)
 * @returns Trending state with locations, loading, and error
 */
export function useTrending(
  period: TrendingPeriod = DEFAULT_TRENDING_PARAMS.period,
  limit = DEFAULT_TRENDING_PARAMS.limit,
): UseTrendingState {
  const [locations, setLocations] = useState<TrendingLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTrending = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getTrending(discoveryRepository, { period, limit });
      setLocations(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load trending'));
    } finally {
      setIsLoading(false);
    }
  }, [period, limit]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return {
    locations,
    isLoading,
    error,
    refetch: fetchTrending,
  };
}
