'use client';

import { cn } from '@/shared/utils/cn';
import { motion } from 'framer-motion';

export type FeedFilter = 'trending' | 'today' | 'this_week';

const FILTERS: { id: FeedFilter; label: string; emoji: string }[] = [
  { id: 'trending', label: 'Trending', emoji: '🔥' },
  { id: 'today',    label: 'Today',    emoji: '📅' },
  { id: 'this_week', label: 'This Week', emoji: '📆' },
];

export interface TrendingFiltersProps {
  /** The currently active filter, or null if none */
  activeFilter: FeedFilter | null;
  /** Whether any filter's data is currently loading */
  loading?: boolean;
  /** Called when a filter pill is clicked; called with null if deselected */
  onFilterChange: (filter: FeedFilter | null) => void;
}

/**
 * TrendingFilters renders three pill-shaped filter buttons.
 * Clicking an active filter deselects it (returns to bounds mode).
 */
export default function TrendingFilters({
  activeFilter,
  loading,
  onFilterChange,
}: TrendingFiltersProps) {
  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Location feed filters"
    >
      {FILTERS.map((f) => {
        const isActive = activeFilter === f.id;
        return (
          <motion.button
            key={f.id}
            type="button"
            id={`map-filter-${f.id}`}
            onClick={() => onFilterChange(isActive ? null : f.id)}
            whileTap={{ scale: 0.92 }}
            aria-pressed={isActive}
            disabled={loading}
            className={cn(
              'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold',
              'border transition-all duration-200 select-none',
              'disabled:cursor-not-allowed disabled:opacity-60',
              isActive
                ? 'border-primary/60 bg-primary/20 text-white shadow-[0_0_12px_rgba(99,102,241,0.35)]'
                : 'border-white/15 bg-black/30 text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white backdrop-blur-[12px]',
            )}
          >
            <span aria-hidden="true">{f.emoji}</span>
            {f.label}
            {isActive && loading && (
              <span className="ml-0.5 h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
