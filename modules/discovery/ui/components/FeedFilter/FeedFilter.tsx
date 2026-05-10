'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FeedFilter, FeedSortOrder } from '../../../core/models/feed';
import { cn } from '@/shared/utils/cn';

/** Sort order options */
const SORT_OPTIONS: { value: FeedSortOrder; label: string }[] = [
  { value: 'recent', label: '🕐 Recent' },
  { value: 'popular', label: '🔥 Popular' },
];

/**
 * Props for the FeedFilter component.
 */
export interface FeedFilterBarProps {
  /** Current active filter state */
  filter: FeedFilter;
  /** Total number of results matching the current filter */
  totalCount: number;
  /** Called when the sort order changes */
  onSortChange: (sortOrder: FeedSortOrder) => void;
}

/**
 * FeedFilterBar renders the sort order controls and a result count badge
 * above the discovery feed grid.
 *
 * @param props - FeedFilterBarProps
 * @returns Feed filter control bar JSX
 */
export default function FeedFilterBar({ filter, totalCount, onSortChange }: FeedFilterBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-between px-4 pb-3 pt-0 md:px-8"
    >
      {/* Result count */}
      <p className="text-xs text-text-tertiary">
        <span className="font-semibold text-text-secondary">{totalCount}</span>{' '}
        {totalCount === 1 ? 'place' : 'places'} found
      </p>

      {/* Sort controls */}
      <div
        role="group"
        aria-label="Sort feed"
        className="flex items-center gap-1 rounded-full border border-border-glass bg-surface p-0.5"
      >
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            id={`feed-sort-${opt.value}`}
            type="button"
            onClick={() => onSortChange(opt.value)}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-150 cursor-pointer',
              filter.sortOrder === opt.value
                ? 'bg-primary text-white shadow-[0_2px_8px_rgba(0,123,255,0.4)]'
                : 'text-text-secondary hover:text-white',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
