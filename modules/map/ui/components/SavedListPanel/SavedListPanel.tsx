'use client';

import { springPresets } from '@/shared/hooks/useAnimationPresets';
import { cn } from '@/shared/utils/cn';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, X } from 'lucide-react';
import { MapMarkerData } from '../../../core/models/mapMarker';

const MOOD_HEX: Record<string, string> = {
  calm: '#38BDF8',
  happy: '#FACC15',
  romantic: '#FB7185',
  energetic: '#22C55E',
  chill: '#A78BFA',
  excited: '#FB923C',
  sad: '#64748B',
};

const MOOD_EMOJI: Record<string, string> = {
  calm: '😌',
  happy: '😄',
  romantic: '💕',
  energetic: '⚡',
  chill: '🧘',
  excited: '🔥',
  sad: '😢',
};

export interface SavedListPanelProps {
  /** List of saved map markers */
  locations: MapMarkerData[];
  /** True while the list is being fetched */
  loading: boolean;
  /** Called when the user clicks a location row */
  onLocationClick: (marker: MapMarkerData) => void;
  /** Called to close the panel */
  onClose: () => void;
}

/**
 * SavedListPanel
 *
 * A slide-up bottom sheet that displays the user's saved locations.
 * Clicking a row fires `onLocationClick` so the parent can fly to it
 * and open the SelectedLocationCard.
 * The panel also acts as the "saved mode" indicator — while it's open,
 * MapPage passes the saved list as `overrideMarkers` so only saved pins
 * are shown on the map.
 */
export default function SavedListPanel({
  locations,
  loading,
  onLocationClick,
  onClose,
}: SavedListPanelProps) {
  return (
    <motion.div
      key="saved-list-panel"
      initial={{ y: '110%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '110%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 32 }}
      className={cn(
        'absolute bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] -translate-x-1/2',
        'md:w-[420px]',
        'overflow-hidden rounded-[22px] border border-white/12 bg-black/70 backdrop-blur-[28px]',
        'shadow-[0_24px_64px_rgba(0,0,0,0.65)]',
      )}
      role="dialog"
      aria-label="Your saved locations"
    >
      {/* Accent bar */}
      <div
        className="h-[3px] w-full"
        style={{ background: 'linear-gradient(90deg, #A78BFA, #A78BFA33)' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 fill-current text-violet-400" />
          <h3 className="text-sm font-bold text-white">Saved Places</h3>
          {!loading && (
            <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
              {locations.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/60 transition-all hover:border-white/40 hover:bg-white/10 hover:text-white"
          aria-label="Close saved list"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[52vh] overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center gap-2.5 py-10 text-white/50">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            <span className="text-xs">Loading your saves…</span>
          </div>
        ) : locations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-3xl">🗂️</span>
            <p className="text-sm font-semibold text-white/60">No saved places yet</p>
            <p className="text-[11px] text-white/35">
              Tap the bookmark icon on any location to save it here.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {locations.map((loc, i) => {
              const accent = loc.mood_category
                ? (MOOD_HEX[loc.mood_category] ?? '#fff')
                : '#fff';
              return (
                <motion.button
                  key={loc.id}
                  type="button"
                  id={`saved-list-item-${loc.id}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springPresets.smooth, delay: i * 0.04 }}
                  onClick={() => onLocationClick(loc)}
                  className="flex w-full items-center gap-3 border-b border-white/6 px-5 py-3.5 text-left transition-colors hover:bg-white/5 last:border-0"
                  aria-label={`Go to ${loc.name}`}
                >
                  {/* Mood dot */}
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
                    style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}
                  >
                    {loc.mood_category ? (MOOD_EMOJI[loc.mood_category] ?? '📍') : '📍'}
                  </span>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{loc.name}</p>
                    {loc.tags.length > 0 && (
                      <p className="truncate text-[11px] text-white/45">
                        {loc.tags.map((t) => `#${t}`).join(' ')}
                      </p>
                    )}
                  </div>

                  {/* Chevron */}
                  <span className="shrink-0 text-[10px] text-white/30">▶</span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
