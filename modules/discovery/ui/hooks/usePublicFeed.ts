import { useState, useEffect, useCallback, useRef } from 'react';
import { PaginatedPublicLocations, PublicLocation } from '../../core/models/publicLocation';
import { FeedFilter, DEFAULT_FEED_FILTER } from '../../core/models/feed';
import { getPublicFeed } from '../../core/usecases/getPublicFeed';
import { discoveryRepository } from '../../infras/discoveryApi';

/**
 * State shape returned by the usePublicFeed hook.
 */
export interface UsePublicFeedState {
  /** All accumulated location items (grows with each page load) */
  locations: PublicLocation[];
  /** Total count matching the current filter */
  total: number;
  /** Whether the initial data fetch is in progress */
  isLoading: boolean;
  /** Whether a subsequent page is being loaded */
  isFetchingMore: boolean;
  /** Error thrown during fetch, if any */
  error: Error | null;
  /** Whether more pages are available to load */
  hasMore: boolean;
  /** Loads the next page of results (appends to existing list) */
  loadMore: () => void;
  /** Resets and re-fetches with the current filter */
  refetch: () => void;
}

/**
 * Custom hook for the public discovery feed.
 * Manages pagination, filter state, and accumulates results across pages.
 *
 * @param filter - Active feed filter (mood, tags, sortOrder)
 * @returns Feed state and pagination controls
 */
export function usePublicFeed(filter: FeedFilter = DEFAULT_FEED_FILTER): UsePublicFeedState {
  const [locations, setLocations] = useState<PublicLocation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  /** Track the latest filter to avoid stale closure issues */
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const fetchPage = useCallback(async (targetPage: number, isNewFilter: boolean) => {
    if (targetPage === 0) {
      setIsLoading(true);
    } else {
      setIsFetchingMore(true);
    }
    setError(null);

    try {
      const result: PaginatedPublicLocations = await getPublicFeed(discoveryRepository, {
        page: targetPage,
        mood: filterRef.current.mood,
        tags: filterRef.current.tags,
        sortOrder: filterRef.current.sortOrder,
      });

      setLocations((prev) => (isNewFilter ? result.data : [...prev, ...result.data]));
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load feed'));
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, []);

  /** Re-fetch when filter changes — always reset to page 0 */
  useEffect(() => {
    setPage(0);
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.mood, filter.sortOrder, filter.tags.join(',')]);

  /** Load the next page without resetting the list */
  const loadMore = useCallback(() => {
    if (isFetchingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, false);
  }, [fetchPage, hasMore, isFetchingMore, page]);

  /** Re-fetches page 0 with the current filter */
  const refetch = useCallback(() => {
    setPage(0);
    fetchPage(0, true);
  }, [fetchPage]);

  return {
    locations,
    total,
    isLoading,
    isFetchingMore,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}
