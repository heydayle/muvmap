'use client';

import Skeleton from '@/shared/components/atoms/Skeleton';
import { cn } from '@/shared/utils/cn';
import { motion } from 'framer-motion';
import { TrendingPeriod } from '../../../core/models/feed';
import { TrendingLocation } from '../../../core/models/publicLocation';

/** Rank badge color based on position */
const RANK_STYLES: Record<number, string> = {
  1: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40',
  2: 'bg-slate-400/20 text-slate-300 border-slate-400/40',
  3: 'bg-orange-600/20 text-orange-400 border-orange-600/40',
};

/** Period selector labels */
const PERIOD_OPTIONS: { value: TrendingPeriod; label: string }[] = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

/**
 * Props for the TrendingSection component.
 */
export interface TrendingSectionProps {
  /** Ordered trending locations (rank 1 = hottest) */
  locations: TrendingLocation[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Active trending period */
  activePeriod: TrendingPeriod;
  /** Called when the user selects a different period */
  onPeriodChange: (period: TrendingPeriod) => void;
  /** Called when a trending card is clicked */
  onLocationClick?: (location: TrendingLocation) => void;
}

/**
 * TrendingSection displays a horizontally scrollable row of the hottest
 * community locations, with a period selector (day / week / month).
 * Each card shows rank badge, name, mood, and engagement stats.
 *
 * @param props - TrendingSectionProps
 * @returns Trending section JSX
 */
export default function TrendingSection({
  locations,
  isLoading,
  activePeriod,
  onPeriodChange,
  onLocationClick,
}: TrendingSectionProps) {
  return (
    <section aria-label="Trending locations" className="px-4 py-6 md:px-8">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-white">
          🔥 Trending Now
        </h2>

        {/* Period selector */}
        <div className="flex items-center gap-1 rounded-full border border-border-glass bg-surface p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              id={`trending-period-${opt.value}`}
              type="button"
              onClick={() => onPeriodChange(opt.value)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-150 cursor-pointer',
                activePeriod === opt.value
                  ? 'bg-primary text-white shadow-[0_2px_8px_rgba(0,123,255,0.4)]'
                  : 'text-text-secondary hover:text-white',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable card row */}
      <div
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pt-4"
        style={{ scrollbarWidth: 'none' }}
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-56 shrink-0 snap-start rounded-[20px] border border-border-glass bg-surface-glass p-4 backdrop-blur-[16px]"
              >
                <Skeleton height="14px" width="40px" />
                <div className="mt-3">
                  <Skeleton height="16px" width="80%" />
                </div>
                <div className="mt-2">
                  <Skeleton height="12px" width="60%" />
                </div>
                <div className="mt-4 flex gap-3">
                  <Skeleton height="12px" width="40px" />
                  <Skeleton height="12px" width="40px" />
                </div>
              </div>
            ))
          : locations.map((location) => (
              <motion.button
                key={location.id}
                type="button"
                onClick={() => onLocationClick?.(location)}
                whileHover={{
                  y: -3,
                  transition: { type: 'spring', stiffness: 400, damping: 30 },
                }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  'w-56 shrink-0 snap-start cursor-pointer rounded-[20px] border border-border-glass',
                  'bg-surface-glass p-4 text-left backdrop-blur-[16px]',
                  'shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-shadow duration-200',
                  'hover:border-white/15 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
                )}
              >
                {/* Rank badge */}
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold',
                    RANK_STYLES[location.rank] ??
                      'bg-white/10 text-white border-white/20',
                  )}
                >
                  {location.rank}
                </span>

                {/* Name */}
                <p className="mt-3 line-clamp-2 text-sm font-semibold leading-tight text-white">
                  {location.name}
                </p>

                {/* Author */}
                <p className="mt-1 text-[11px] text-text-tertiary">
                  {location.author.handle}
                </p>

                {/* Engagement */}
                <div className="mt-3 flex items-center gap-3 text-[11px] text-text-tertiary">
                  <span>❤️ {location.like_count}</span>
                  <span>👁️ {location.view_count}</span>
                </div>
              </motion.button>
            ))}
      </div>
    </section>
  );
}
