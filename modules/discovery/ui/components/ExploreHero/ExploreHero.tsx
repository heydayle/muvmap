'use client';

import React, { useId } from 'react';
import { motion } from 'framer-motion';
import { MoodCategory } from '@/shared/types';
import { cn } from '@/shared/utils/cn';

/** All mood options including the 'all' catch-all */
type MoodFilter = MoodCategory | 'all';

/** Mood pill config: display label + color tokens */
const MOOD_PILLS: { value: MoodFilter; label: string; color: string }[] = [
  { value: 'all', label: '✨ All Vibes', color: 'bg-white/10 text-white border-white/20' },
  { value: 'calm', label: '😌 Calm', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { value: 'happy', label: '😄 Happy', color: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30' },
  { value: 'chill', label: '🧘 Chill', color: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
  { value: 'excited', label: '🔥 Excited', color: 'bg-orange-400/15 text-orange-300 border-orange-400/30' },
  { value: 'energetic', label: '⚡ Energetic', color: 'bg-green-500/15 text-green-300 border-green-500/30' },
  { value: 'romantic', label: '💕 Romantic', color: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  { value: 'sad', label: '😢 Sad', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
];

/**
 * Props for the ExploreHero component.
 */
export interface ExploreHeroProps {
  /** Search query value */
  searchQuery: string;
  /** Called when the search input value changes */
  onSearchChange: (query: string) => void;
  /** Currently active mood filter */
  activeMood: MoodFilter;
  /** Called when a mood pill is selected */
  onMoodChange: (mood: MoodFilter) => void;
}

/**
 * ExploreHero is the discovery page's top section.
 * Features an aurora gradient background, a glassmorphic search input,
 * and a row of mood-filter pills.
 *
 * @param props - ExploreHeroProps
 * @returns Hero section JSX
 */
export default function ExploreHero({
  searchQuery,
  onSearchChange,
  activeMood,
  onMoodChange,
}: ExploreHeroProps) {
  const searchId = useId();

  return (
    <section className="relative overflow-hidden px-4 pb-8 pt-12 md:px-8 md:pt-16">
      {/* Aurora gradient background */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(0,123,255,0.15)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(161,139,250,0.12)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_90%,rgba(0,123,255,0.08)_0%,transparent_50%)]" />
      </div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="mb-8 text-center"
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-primary">
          Community Spots
        </p>
        <h1 className="font-display text-3xl font-bold text-white md:text-4xl">
          Discover Your Vibe
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Explore places shared by people with the same energy ✨
        </p>
      </motion.div>

      {/* Search input */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.08 }}
        className="mx-auto mb-6 max-w-xl"
      >
        <label htmlFor={searchId} className="sr-only">
          Search places
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
            🔍
          </span>
          <input
            id={searchId}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by place, vibe, or tag..."
            className={cn(
              'w-full rounded-[20px] border border-border-glass bg-surface-glass py-3 pl-11 pr-4',
              'text-sm text-white placeholder:text-text-tertiary',
              'backdrop-blur-md outline-none',
              'transition-all duration-200',
              'focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,123,255,0.2),0_0_20px_rgba(0,123,255,0.1)]',
            )}
          />
        </div>
      </motion.div>

      {/* Mood filter pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.14 }}
        className="flex flex-wrap justify-center gap-2"
      >
        {MOOD_PILLS.map((pill) => (
          <motion.button
            key={pill.value}
            id={`mood-filter-${pill.value}`}
            type="button"
            onClick={() => onMoodChange(pill.value)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium',
              'transition-all duration-150 cursor-pointer',
              pill.color,
              activeMood === pill.value
                ? 'ring-2 ring-offset-1 ring-offset-background opacity-100 shadow-sm'
                : 'opacity-70 hover:opacity-100',
            )}
          >
            {pill.label}
          </motion.button>
        ))}
      </motion.div>
    </section>
  );
}
