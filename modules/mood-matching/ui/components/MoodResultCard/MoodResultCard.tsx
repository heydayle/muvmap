'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springPresets, listItemVariants } from '@/shared/hooks/useAnimationPresets';
import { MoodMatchedLocation } from '../../../core/models/moodMatch';
import { MoodCategory } from '@/shared/types';

/** Mood accent color map for tags and score indicators */
const MOOD_ACCENT: Record<MoodCategory, string> = {
  calm: '#38bdf8',
  happy: '#facc15',
  energetic: '#22c55e',
  romantic: '#fb7185',
  chill: '#a78bfa',
  excited: '#fb923c',
  sad: '#64748b',
};

/** Mood emoji for the card accent */
const MOOD_EMOJI: Record<MoodCategory, string> = {
  calm: '😌',
  happy: '😄',
  energetic: '⚡',
  romantic: '💕',
  chill: '😎',
  excited: '🔥',
  sad: '😢',
};

/** Props for MoodResultCard */
export interface MoodResultCardProps {
  /** Location result from the mood matching engine */
  location: MoodMatchedLocation;
  /** Staggered animation index */
  index: number;
  /** Called when user clicks the card body — selects/highlights on the map */
  onCardClick?: (location: MoodMatchedLocation) => void;
  /** Called when user clicks "View on Map" — navigates to full /map page */
  onViewMap?: (location: MoodMatchedLocation) => void;
  /** Whether this card is currently selected (synced with map marker) */
  isSelected?: boolean;
  /** Whether this is the top-ranked result (featured treatment) */
  featured?: boolean;
}

/**
 * A single AI-recommended location card.
 * Follows the AI Suggestion Card spec from rules/design.md §8.
 * Features: relevance score bar, reasoning blurb, tag pills, view-on-map CTA.
 *
 * @param props - MoodResultCardProps
 * @returns Animated glassmorphic location result card
 */
export default function MoodResultCard({
  location,
  index,
  onCardClick,
  onViewMap,
  isSelected = false,
  featured = false,
}: MoodResultCardProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const accentColor = location.mood_category ? MOOD_ACCENT[location.mood_category] : '#007BFF';
  const moodEmoji = location.mood_category ? MOOD_EMOJI[location.mood_category] : '📍';
  const scorePercent = Math.round(location.relevanceScore * 100);

  return (
    <motion.article
      variants={listItemVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={{ y: -4, transition: springPresets.smooth }}
      whileTap={{ scale: 0.98, transition: springPresets.snappy }}
      onClick={() => onCardClick?.(location)}
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onKeyDown={(e) => { if (onCardClick && (e.key === 'Enter' || e.key === ' ')) onCardClick(location); }}
      aria-pressed={onCardClick ? isSelected : undefined}
      className={[
        'group relative flex flex-col gap-4 overflow-hidden rounded-[20px] p-5',
        'border backdrop-blur-[16px] transition-all duration-200',
        onCardClick ? 'cursor-pointer' : '',
        isSelected
          ? 'border-primary/60 shadow-[0_0_0_2px_rgba(0,123,255,0.35),0_8px_32px_rgba(0,0,0,0.3)] bg-primary/6'
          : featured
            ? 'border-primary/30 bg-primary/8 shadow-[0_0_24px_rgba(0,123,255,0.15)]'
            : 'border-border-glass bg-surface-glass',
      ].join(' ')}
      style={{
        boxShadow: isSelected
          ? `0 0 0 2px rgba(0,123,255,0.35), 0 0 20px ${accentColor}30, 0 8px 32px rgba(0,0,0,0.3)`
          : featured
            ? `0 0 24px ${accentColor}20, 0 8px 32px rgba(0,0,0,0.3)`
            : '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* Selected indicator badge */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            key="selected-badge"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={springPresets.bouncy}
            className="absolute right-4 top-4 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #007BFF, #339CFF)' }}
            aria-label="Selected on map"
          >
            📍 On Map
          </motion.div>
        )}
        {!isSelected && featured && (
          <motion.div
            key="featured-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={springPresets.bouncy}
            className="absolute right-4 top-4 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white"
            style={{ background: `linear-gradient(135deg, ${accentColor}, #007BFF)` }}
          >
            ⭐ Best Match
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start gap-3 pr-20">
        {/* Mood emoji indicator */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-xl"
          style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}40` }}
          aria-hidden="true"
        >
          {moodEmoji}
        </div>

        <div className="flex flex-col gap-0.5">
          <h3 className="text-[15px] font-semibold leading-snug text-text-primary">
            {location.name}
          </h3>
          {/* Mood alignment label */}
          <span
            className="text-[11px] font-medium"
            style={{ color: accentColor }}
          >
            {location.moodAlignment}
          </span>
        </div>
      </div>

      {/* Relevance score bar */}
      <div className="flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-elevated"
          role="meter"
          aria-label={`Relevance score: ${scorePercent}%`}
          aria-valuenow={scorePercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${scorePercent}%` }}
            transition={{ ...springPresets.smooth, delay: index * 0.05 + 0.2 }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accentColor}, #007BFF)` }}
          />
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-text-secondary">
          {scorePercent}%
        </span>
      </div>

      {/* Description */}
      {location.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-text-secondary">
          {location.description}
        </p>
      )}

      {/* Tags */}
      {location.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {location.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium capitalize"
              style={{
                background: `${accentColor}18`,
                color: accentColor,
                border: `1px solid ${accentColor}30`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* AI Reasoning (collapsible) */}
      {location.reasoning && (
        <div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setReasoningOpen((prev) => !prev); }}
            className="flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary transition-colors hover:text-text-secondary"
            aria-expanded={reasoningOpen}
            aria-controls={`reasoning-${location.id}`}
          >
            <motion.span
              animate={{ rotate: reasoningOpen ? 90 : 0 }}
              transition={springPresets.snappy}
              aria-hidden="true"
            >
              ▶
            </motion.span>
            Why this spot?
          </button>

          <AnimatePresence>
            {reasoningOpen && (
              <motion.div
                id={`reasoning-${location.id}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={springPresets.smooth}
                className="overflow-hidden"
              >
                <p
                  className="mt-2 rounded-[12px] border px-3 py-2.5 text-[12px] leading-relaxed text-text-secondary"
                  style={{
                    background: `${accentColor}0D`,
                    borderColor: `${accentColor}25`,
                  }}
                >
                  {location.reasoning}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* View on Map CTA */}
      {onViewMap && location.latitude !== null && location.longitude !== null && (
        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); onViewMap(location); }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={springPresets.snappy}
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-[14px] py-2.5 text-sm font-medium text-white transition-all"
          style={{
            background: `linear-gradient(135deg, ${accentColor}CC, #007BFF)`,
          }}
          aria-label={`Open ${location.name} on the full map`}
        >
          🗺️ Open Full Map
        </motion.button>
      )}
    </motion.article>
  );
}
