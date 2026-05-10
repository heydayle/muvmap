'use client';

import React from 'react';
import { motion } from 'framer-motion';

/**
 * Props for the EmptyDiscovery component.
 */
export interface EmptyDiscoveryProps {
  /** Whether a filter is currently active (changes the empty state message) */
  isFiltered?: boolean;
  /** Called when the user clicks "Clear Filters" */
  onClearFilters?: () => void;
}

/**
 * EmptyDiscovery renders a friendly illustrated empty state for the feed.
 * Shows different messaging depending on whether a filter is active.
 *
 * @param props - EmptyDiscoveryProps
 * @returns Animated empty state section
 */
export default function EmptyDiscovery({ isFiltered = false, onClearFilters }: EmptyDiscoveryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="flex flex-col items-center justify-center gap-5 py-20 text-center"
    >
      {/* Floating emoji illustration */}
      <motion.span
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="text-6xl"
        aria-hidden="true"
      >
        {isFiltered ? '🔍' : '🗺️'}
      </motion.span>

      <div className="space-y-2">
        <h3 className="font-display text-lg font-semibold text-white">
          {isFiltered ? 'No spots match this vibe' : 'Nothing here yet'}
        </h3>
        <p className="max-w-xs text-sm text-text-secondary">
          {isFiltered
            ? 'Try a different mood or clear your filters to explore more.'
            : 'Be the first to share a spot with the community.'}
        </p>
      </div>

      {isFiltered && onClearFilters && (
        <motion.button
          type="button"
          onClick={onClearFilters}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="rounded-[14px] border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          Clear Filters
        </motion.button>
      )}
    </motion.div>
  );
}
