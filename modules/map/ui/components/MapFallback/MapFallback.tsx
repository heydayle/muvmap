'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MapMarkerData } from '../../../core/models/mapMarker';

/**
 * Props for the MapFallback component.
 */
export interface MapFallbackProps {
  /** Locations to display in the fallback list */
  markers: MapMarkerData[];
  /** Called when a list item is clicked */
  onLocationClick?: (marker: MapMarkerData) => void;
}

/** Mood emoji for list items */
const MOOD_EMOJI: Record<string, string> = {
  calm: '😌', happy: '😄', romantic: '💕',
  energetic: '⚡', chill: '🧘', excited: '🔥', sad: '😢',
};

/**
 * MapFallback renders a list-based view when `map_render_enabled = false`.
 * Mirrors the data that would be shown as markers on the map.
 *
 * Source: rules/features/map/flag.md Story 1 acceptance criteria
 *
 * @param props - MapFallbackProps
 * @returns Fallback list view JSX
 */
export default function MapFallback({ markers, onLocationClick }: MapFallbackProps) {
  return (
    <section aria-label="Location list (map unavailable)" className="px-4 py-6 md:px-8">
      {/* Banner */}
      <div className="mb-6 rounded-[16px] border border-yellow-400/20 bg-yellow-400/8 px-4 py-3">
        <p className="text-sm text-yellow-300">
          🗺️ Map view is currently unavailable. Showing locations as a list instead.
        </p>
      </div>

      {/* List */}
      {markers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-5xl" aria-hidden="true">📍</span>
          <p className="text-sm text-text-secondary">No locations to display.</p>
        </div>
      ) : (
        <ul className="space-y-3" role="list">
          {markers.map((marker, i) => (
            <motion.li
              key={marker.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25, delay: i * 0.04 }}
            >
              <button
                type="button"
                onClick={() => onLocationClick?.(marker)}
                className="group w-full cursor-pointer rounded-[16px] border border-border-glass bg-surface-glass p-4 text-left backdrop-blur-[16px] transition-all duration-200 hover:border-white/15 hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">
                      {marker.mood_category ? MOOD_EMOJI[marker.mood_category] : '📍'}
                    </span>
                    <span className="text-sm font-semibold text-white">{marker.name}</span>
                  </div>
                  {marker.mood_category && (
                    <span className="text-[11px] text-text-tertiary">{marker.mood_category}</span>
                  )}
                </div>
                {marker.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {marker.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-text-tertiary"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
