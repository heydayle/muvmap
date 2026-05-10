'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocations } from '../hooks/useLocations';
import { useLocationMutations } from '../hooks/useLocationMutations';
import { Location as LocationModel } from '../../core/models/location';
import LocationCard from '../components/LocationCard';
import LocationForm from '../components/LocationForm';
import Button from '@/shared/components/atoms/Button';
import Skeleton from '@/shared/components/atoms/Skeleton';
import { pageTransition } from '@/shared/hooks/useAnimationPresets';

/**
 * View mode for the location list page.
 */
type ViewMode = 'list' | 'create';

/**
 * LocationListPage is the main locations page.
 * Displays a grid of location cards with skeleton loading,
 * empty state, and a "create" mode with the location form.
 *
 * Source: rules/features/location/flags.md Stories 1–2
 *
 * @returns The location list page component
 */
export default function LocationListPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useLocations({ page });
  const { createLocation } = useLocationMutations();

  /**
   * Handles creating a new location — submits the form
   * and switches back to list view on success.
   */
  const handleCreate = useCallback(
    (payload: Parameters<typeof createLocation.mutate>[0]) => {
      createLocation.mutate(payload, {
        onSuccess: () => setViewMode('list'),
      });
    },
    [createLocation],
  );

  /**
   * Handles clicking a location card — navigates to detail view.
   * TODO: Wire to Next.js router in Phase 2 integration.
   */
  const handleCardClick = useCallback((location: LocationModel) => {
    // Will be wired to router: `/locations/${location.id}`
    console.log('Navigate to location:', location.id);
  }, []);

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-6 md:px-6 md:py-8 lg:px-8">
      <motion.div {...pageTransition}>
        <div className="mb-6 flex items-center justify-between">
          <h2>{viewMode === 'list' ? 'My Spots' : 'Add a New Spot'}</h2>
          {viewMode === 'list' ? (
            <Button onClick={() => setViewMode('create')}>+ Add Spot</Button>
          ) : (
            <Button onClick={() => setViewMode('list')}>← Back</Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'create' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            >
              <LocationForm
                onSubmit={handleCreate}
                isSubmitting={createLocation.isPending}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Loading skeleton */}
              {isLoading && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <Skeleton height="160px" />
                      <Skeleton height="20px" width="60%" />
                      <Skeleton height="14px" width="80%" />
                    </div>
                  ))}
                </div>
              )}

              {/* Error state */}
              {isError && (
                <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
                  <span className="text-5xl">⚠️</span>
                  <p className="text-base text-text-secondary">
                    Failed to load spots. Please try again.
                  </p>
                  <Button onClick={() => refetch()}>Try Again</Button>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && !isError && data?.data.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-4 px-4 py-16 text-center">
                  <span className="text-5xl">📍</span>
                  <p className="text-base text-text-secondary">
                    No spots yet. Add your first one!
                  </p>
                  <Button onClick={() => setViewMode('create')}>
                    + Add Spot
                  </Button>
                </div>
              )}

              {/* Location grid */}
              {!isLoading && !isError && data && data.data.length > 0 && (
                <>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                    {data.data.map((location, i) => (
                      <LocationCard
                        key={location.id}
                        location={location}
                        onClick={handleCardClick}
                        index={i}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {data.hasMore && (
                    <div className="mt-6 flex justify-center">
                      <Button onClick={() => setPage((p) => p + 1)}>
                        Load More
                      </Button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
