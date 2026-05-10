import { useQuery } from '@tanstack/react-query';
import { locationRepository } from '../../infras/locationApi';
import { PaginatedLocations } from '../../core/models/location';

/**
 * Query key factory for location-related React Query caches.
 * Centralizing keys ensures correct cache invalidation.
 */
export const locationKeys = {
  /** Root key for all location queries */
  all: ['locations'] as const,
  /** Key for paginated list queries */
  lists: () => [...locationKeys.all, 'list'] as const,
  /** Key for a specific page of locations */
  list: (page: number, limit: number) =>
    [...locationKeys.lists(), { page, limit }] as const,
  /** Key for all detail queries */
  details: () => [...locationKeys.all, 'detail'] as const,
  /** Key for a specific location detail */
  detail: (id: string) => [...locationKeys.details(), id] as const,
};

/**
 * Default stale time for location queries (5 minutes).
 * When `location_cache_enabled` is false, stale time is set to 0.
 * Source: rules/features/location/flags.md Story 3
 */
const STALE_TIME = 5 * 60 * 1000;

/** Default page size per system.md §3.1 */
const DEFAULT_LIMIT = 20;

/**
 * Hook options for configuring the locations list query.
 */
interface UseLocationsOptions {
  /** Page number (0-indexed, default: 0) */
  page?: number;
  /** Items per page (default: 20) */
  limit?: number;
  /** Whether caching is enabled (maps to location_cache_enabled flag) */
  cacheEnabled?: boolean;
  /** Whether fetching is enabled (maps to location_fetch_enabled flag) */
  fetchEnabled?: boolean;
}

/**
 * Fetches a paginated list of locations for the current user.
 * Uses React Query for caching, loading, and error states.
 *
 * Source: rules/features/location/flags.md Story 2
 * Data contract: rules/system.md §3.1
 *
 * @param options - Query configuration
 * @returns React Query result with paginated location data
 */
export function useLocations(options: UseLocationsOptions = {}) {
  const {
    page = 0,
    limit = DEFAULT_LIMIT,
    cacheEnabled = true,
    fetchEnabled = true,
  } = options;

  return useQuery<PaginatedLocations>({
    queryKey: locationKeys.list(page, limit),
    queryFn: () => locationRepository.getLocations(page, limit),
    staleTime: cacheEnabled ? STALE_TIME : 0,
    enabled: fetchEnabled,
    placeholderData: (prev) => prev,
  });
}

/**
 * Fetches a single location by its ID.
 *
 * @param id - Location UUID
 * @param options - Optional cache/fetch configuration
 * @returns React Query result with the location detail
 */
export function useLocationDetail(
  id: string,
  options: { cacheEnabled?: boolean } = {},
) {
  const { cacheEnabled = true } = options;

  return useQuery({
    queryKey: locationKeys.detail(id),
    queryFn: () => locationRepository.getLocationById(id),
    staleTime: cacheEnabled ? STALE_TIME : 0,
    enabled: !!id,
  });
}
