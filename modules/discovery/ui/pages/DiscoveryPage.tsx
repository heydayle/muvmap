'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePublicFeed } from '../hooks/usePublicFeed';
import { useTrending } from '../hooks/useTrending';
import { FeedFilter, DEFAULT_FEED_FILTER, TrendingPeriod, FeedSortOrder } from '../../core/models/feed';
import { MoodCategory } from '@/shared/types';
import { PublicLocation } from '../../core/models/publicLocation';
import { TrendingLocation } from '../../core/models/publicLocation';
import ExploreHero from '../components/ExploreHero';
import TrendingSection from '../components/TrendingSection';
import FeedFilterBar from '../components/FeedFilter';
import PublicLocationCard from '../components/PublicLocationCard';
import EmptyDiscovery from '../components/EmptyDiscovery';
import Skeleton from '@/shared/components/atoms/Skeleton';
import { pageTransition } from '@/shared/hooks/useAnimationPresets';

/** Number of skeletons to show while loading */
const SKELETON_COUNT = 6;

/**
 * DiscoveryPage is the main smart component for the Discovery feature.
 * It orchestrates:
 * - ExploreHero with mood filter pills and search
 * - TrendingSection with period selector
 * - FeedFilterBar with sort order controls
 * - Bento grid of PublicLocationCards with staggered animation
 * - EmptyDiscovery and error states
 *
 * Gated by: beta_features_enabled → discovery_enabled
 *
 * @returns Discovery page JSX
 */
export default function DiscoveryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingPeriod, setTrendingPeriod] = useState<TrendingPeriod>('week');

  const [filter, setFilter] = useState<FeedFilter>(DEFAULT_FEED_FILTER);

  const { locations, total, isLoading, isFetchingMore, error, hasMore, loadMore, refetch } =
    usePublicFeed(filter);

  const { locations: trendingLocations, isLoading: trendingLoading } = useTrending(trendingPeriod);

  /**
   * Handles mood pill selection — updates the active mood filter.
   */
  const handleMoodChange = useCallback((mood: MoodCategory | 'all') => {
    setFilter((prev) => ({ ...prev, mood }));
  }, []);

  /**
   * Handles sort order toggle.
   */
  const handleSortChange = useCallback((sortOrder: FeedSortOrder) => {
    setFilter((prev) => ({ ...prev, sortOrder }));
  }, []);

  /**
   * Clears all filters back to defaults.
   */
  const handleClearFilters = useCallback(() => {
    setFilter(DEFAULT_FEED_FILTER);
    setSearchQuery('');
  }, []);

  /**
   * Navigates to the Map page and flies to the clicked location.
   * Passes id, lat, lng, name, mood, and tags as URL search params
   * so the Map page can restore the full context on load.
   */
  const handleLocationClick = useCallback(
    (location: PublicLocation | TrendingLocation) => {
      if (location.latitude === null || location.longitude === null) return;

      const params = new URLSearchParams({
        id: location.id,
        lat: String(location.latitude),
        lng: String(location.longitude),
        name: location.name,
        mood: location.mood_category ?? '',
        tags: location.tags.map((t) => t.name).join(','),
      });

      router.push(`/map?${params.toString()}`);
    },
    [router],
  );

  /** Whether any non-default filter is active */
  const isFiltered = useMemo(
    () => filter.mood !== 'all' || filter.tags.length > 0 || searchQuery.length > 0,
    [filter.mood, filter.tags.length, searchQuery],
  );

  /** Client-side search filter applied on top of API results */
  const displayLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    const q = searchQuery.toLowerCase();
    return locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.description?.toLowerCase().includes(q) ||
        loc.tags.some((t) => t.name.includes(q)),
    );
  }, [locations, searchQuery]);

  return (
    <main className="min-h-screen bg-background">
      <motion.div {...pageTransition}>
        {/* Hero section with search + mood filters */}
        <ExploreHero
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeMood={filter.mood}
          onMoodChange={handleMoodChange}
        />

        {/* Trending section */}
        <TrendingSection
          locations={trendingLocations}
          isLoading={trendingLoading}
          activePeriod={trendingPeriod}
          onPeriodChange={setTrendingPeriod}
          onLocationClick={handleLocationClick}
        />

        {/* Divider */}
        <div className="mx-4 my-2 border-t border-border md:mx-8" aria-hidden="true" />

        {/* Feed sort + count */}
        <FeedFilterBar
          filter={filter}
          totalCount={total}
          onSortChange={handleSortChange}
        />

        {/* Feed content */}
        <section
          aria-label="Public location feed"
          className="px-4 pb-16 md:px-8"
        >
          {/* Error state */}
          {error && !isLoading && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <span className="text-5xl" aria-hidden="true">⚠️</span>
              <p className="text-sm text-text-secondary">
                Something went wrong loading spots. Please try again.
              </p>
              <button
                type="button"
                onClick={refetch}
                className="rounded-[14px] border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading skeleton grid */}
          {isLoading && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-[20px] border border-border-glass bg-surface-glass p-5 backdrop-blur-[16px]">
                  <Skeleton height="20px" width="70%" />
                  <Skeleton height="14px" width="90%" />
                  <Skeleton height="14px" width="60%" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton height="22px" width="60px" />
                    <Skeleton height="22px" width="60px" />
                  </div>
                  <div className="mt-auto flex justify-between pt-2">
                    <Skeleton height="12px" width="80px" />
                    <Skeleton height="12px" width="60px" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && displayLocations.length === 0 && (
            <EmptyDiscovery isFiltered={isFiltered} onClearFilters={handleClearFilters} />
          )}

          {/* Bento grid */}
          {!isLoading && !error && displayLocations.length > 0 && (
            <>
              <AnimatePresence mode="sync">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {displayLocations.map((location, i) => (
                    <PublicLocationCard
                      key={location.id}
                      location={location}
                      index={i}
                      onClick={handleLocationClick}
                      featured={i === 0}
                    />
                  ))}
                </div>
              </AnimatePresence>

              {/* Load more */}
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <motion.button
                    type="button"
                    onClick={loadMore}
                    disabled={isFetchingMore}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="rounded-[14px] border border-primary/40 bg-primary/10 px-6 py-3 text-sm font-medium text-primary transition-all hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isFetchingMore ? '⏳ Loading...' : 'Load More'}
                  </motion.button>
                </div>
              )}
            </>
          )}
        </section>
      </motion.div>
    </main>
  );
}
