import { useMutation, useQueryClient } from '@tanstack/react-query';
import { locationRepository } from '../../infras/locationApi';
import {
  Location,
  CreateLocationPayload,
  UpdateLocationPayload,
  PaginatedLocations,
} from '../../core/models/location';
import { locationKeys } from './useLocations';

/**
 * Provides create, update, and delete mutations for locations
 * with optimistic UI updates and automatic cache invalidation.
 *
 * Source: rules/features/location/flags.md Story 1
 * - Optimistic updates for snappy experience
 * - Rollback on failure
 * - Cache invalidation on success
 *
 * @returns Object containing createLocation, updateLocation, deleteLocation mutations
 */
export function useLocationMutations() {
  const queryClient = useQueryClient();

  /**
   * Creates a new location with optimistic UI.
   * On success, invalidates the locations list cache.
   */
  const createLocation = useMutation({
    mutationFn: (payload: CreateLocationPayload) =>
      locationRepository.createLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });

  /**
   * Updates an existing location with optimistic UI.
   * Optimistically patches the detail cache and list cache,
   * rolling back on error.
   */
  const updateLocation = useMutation({
    mutationFn: (payload: UpdateLocationPayload) =>
      locationRepository.updateLocation(payload),
    onMutate: async (payload) => {
      const { id } = payload;

      await queryClient.cancelQueries({ queryKey: locationKeys.detail(id) });

      const previousDetail = queryClient.getQueryData<Location>(
        locationKeys.detail(id),
      );

      if (previousDetail) {
        const { tags: rawTags, ...restPayload } = payload;
        const optimisticData: Location = {
          ...previousDetail,
          ...restPayload,
          updated_at: new Date().toISOString(),
          ...(rawTags
            ? {
                tags: rawTags.map((name) => ({
                  name,
                  source: 'manual' as const,
                })),
              }
            : {}),
        };
        queryClient.setQueryData<Location>(
          locationKeys.detail(id),
          optimisticData,
        );
      }

      return { previousDetail };
    },
    onError: (_err, payload, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          locationKeys.detail(payload.id),
          context.previousDetail,
        );
      }
    },
    onSettled: (_data, _err, payload) => {
      queryClient.invalidateQueries({
        queryKey: locationKeys.detail(payload.id),
      });
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });

  /**
   * Deletes a location with optimistic removal from the list cache.
   * Rolls back if the delete fails.
   */
  const deleteLocation = useMutation({
    mutationFn: (id: string) => locationRepository.deleteLocation(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: locationKeys.lists() });

      const previousLists = queryClient.getQueriesData<PaginatedLocations>({
        queryKey: locationKeys.lists(),
      });

      queryClient.setQueriesData<PaginatedLocations>(
        { queryKey: locationKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((loc) => loc.id !== id),
            total: old.total - 1,
          };
        },
      );

      return { previousLists };
    },
    onError: (_err, _id, context) => {
      context?.previousLists.forEach(([key, data]) => {
        if (data) {
          queryClient.setQueryData(key, data);
        }
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
    },
  });

  return { createLocation, updateLocation, deleteLocation };
}
