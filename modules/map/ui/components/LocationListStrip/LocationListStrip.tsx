'use client';

import { MapMarkerData } from '@/modules/map/core/models/mapMarker';
import { cn } from '@/shared/utils/cn';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useRef } from 'react';

/** Mood accent color palette — mirrors useMapMarkers */
const MOOD_COLORS: Record<string, string> = {
  calm:      '#38BDF8',
  happy:     '#FACC15',
  romantic:  '#FB7185',
  energetic: '#22C55E',
  chill:     '#A78BFA',
  excited:   '#FB923C',
  sad:       '#64748B',
};

const MOOD_EMOJI: Record<string, string> = {
  calm:      '😌',
  happy:     '😄',
  romantic:  '💕',
  energetic: '⚡',
  chill:     '😎',
  excited:   '🔥',
  sad:       '😢',
};

export interface LocationListStripProps {
  /** Locations to render in the horizontal strip */
  locations: MapMarkerData[];
  /** Currently selected location ID (highlights that card) */
  selectedId: string | null;
  /** Label shown in the strip header, e.g. "🔥 Trending" */
  title: string;
  /** Whether the API call is in flight */
  loading: boolean;
  /** Called when a location card is clicked */
  onLocationClick: (location: MapMarkerData) => void;
  /** Called when the close button is clicked */
  onClose: () => void;
}

/**
 * LocationListStrip is a glassmorphic bottom panel that
 * displays a horizontally-scrollable row of location cards.
 * Appears when a feed filter (Trending / Today / This Week) is active.
 */
export default function LocationListStrip({
  locations,
  selectedId,
  title,
  loading,
  onLocationClick,
  onClose,
}: LocationListStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <AnimatePresence>
      <motion.div
        key="location-strip"
        initial={{ y: 140, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 140, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        className={cn(
          'absolute bottom-0 left-0 right-0 z-30',
          'pb-safe', // safe area padding for mobile notches
        )}
        aria-label={`${title} locations list`}
      >
        {/* Frosted panel */}
        <div className="mx-0 overflow-hidden rounded-t-[24px] border-t border-x border-white/10 bg-black/75 backdrop-blur-[24px] shadow-[0_-8px_40px_rgba(0,0,0,0.6)]">
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{title}</span>
              {loading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
              ) : (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white/60">
                  {locations.length} spot{locations.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close location list"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/50 transition-colors hover:border-white/35 hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* ── Horizontal scroll row ─────────────────────────────────── */}
          {loading ? (
            /* Skeleton cards while loading */
            <div className="flex gap-3 overflow-hidden px-4 pb-5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[120px] w-[160px] shrink-0 animate-pulse rounded-[16px] bg-white/8"
                />
              ))}
            </div>
          ) : locations.length === 0 ? (
            <p className="px-4 pb-5 text-sm text-white/40">
              No spots found for this period.
            </p>
          ) : (
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto px-4 pb-5 scrollbar-hide"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              {locations.map((loc) => {
                const color = loc.mood_category
                  ? MOOD_COLORS[loc.mood_category]
                  : '#64748B';
                const emoji = loc.mood_category
                  ? MOOD_EMOJI[loc.mood_category]
                  : '📍';
                const isSelected = loc.id === selectedId;

                return (
                  <motion.button
                    key={loc.id}
                    type="button"
                    onClick={() => onLocationClick(loc)}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.96 }}
                    aria-pressed={isSelected}
                    className={cn(
                      'relative flex w-[165px] shrink-0 flex-col rounded-[16px] border p-3 text-left transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                      isSelected
                        ? 'border-white/40 bg-white/15 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                        : 'border-white/10 bg-white/6 hover:border-white/25 hover:bg-white/12',
                    )}
                    style={{
                      scrollSnapAlign: 'start',
                      background: isSelected
                        ? `linear-gradient(135deg, ${color}20, rgba(255,255,255,0.08))`
                        : undefined,
                      borderColor: isSelected ? `${color}60` : undefined,
                    }}
                  >
                    {/* Mood emoji badge */}
                    <div
                      className="mb-2 flex h-9 w-9 items-center justify-center rounded-[10px] text-lg"
                      style={{ background: `${color}22` }}
                    >
                      {emoji}
                    </div>

                    {/* Name */}
                    <p className="mb-1 line-clamp-2 text-[13px] font-semibold leading-snug text-white">
                      {loc.name}
                    </p>

                    {/* Tags */}
                    {loc.tags.length > 0 && (
                      <p
                        className="mt-auto text-[10px] font-medium"
                        style={{ color: `${color}bb` }}
                      >
                        #{loc.tags.slice(0, 2).join(' #')}
                      </p>
                    )}

                    {/* Selected indicator dot */}
                    {isSelected && (
                      <span
                        className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full"
                        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
