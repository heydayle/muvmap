'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { springPresets } from '@/shared/hooks/useAnimationPresets';
import { MoodCategory } from '@/shared/types';

/** Mood-to-gradient pairs from rules/design.md §2.3 */
const MOOD_GRADIENTS: Record<MoodCategory, [string, string, string]> = {
  calm: ['#38bdf820', '#0EA5E920', '#38bdf810'],
  happy: ['#facc1520', '#F59E0B20', '#facc1510'],
  energetic: ['#22c55e20', '#16A34A20', '#22c55e10'],
  romantic: ['#fb718520', '#F43F5E20', '#fb718510'],
  chill: ['#a78bfa20', '#8B5CF620', '#a78bfa10'],
  excited: ['#fb923c20', '#F9731620', '#fb923c10'],
  sad: ['#64748b20', '#47556920', '#64748b10'],
};

/** Default aurora colors (no mood detected yet) */
const DEFAULT_AURORA: [string, string, string] = ['#007BFF20', '#339CFF15', '#66B2FF10'];

/** Props for the MoodMatchHero */
export interface MoodMatchHeroProps {
  /** Detected mood (drives aurora color shift) */
  detectedMood?: MoodCategory | null;
}

/**
 * Mood Match Hero — aurora gradient background header.
 * The aurora shifts color based on the detected mood per design.md §2.4.
 * Uses CSS keyframe animation for the ambient drift effect.
 *
 * @param props - MoodMatchHeroProps
 * @returns Hero section with animated aurora background
 */
export default function MoodMatchHero({ detectedMood }: MoodMatchHeroProps) {
  const colors = detectedMood ? MOOD_GRADIENTS[detectedMood] : DEFAULT_AURORA;

  return (
    <header className="relative overflow-hidden px-4 pb-8 pt-12 md:px-8 md:pt-16">
      {/* Aurora ambient background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <motion.div
          animate={{
            background: [
              `radial-gradient(ellipse at 20% 50%, ${colors[0]} 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, ${colors[1]} 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, ${colors[2]} 0%, transparent 40%), var(--color-background)`,
            ],
          }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 20% 50%, ${colors[0]} 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, ${colors[1]} 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, ${colors[2]} 0%, transparent 40%), var(--color-background)`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-2xl text-center">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springPresets.bouncy}
          className="mb-4 inline-flex items-center justify-center"
        >
          <span className="text-5xl" aria-hidden="true">🧠</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springPresets.smooth, delay: 0.1 }}
          className="mb-3 font-display text-3xl font-bold leading-tight text-text-primary md:text-4xl"
        >
          Match My Mood
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springPresets.smooth, delay: 0.15 }}
          className="mx-auto max-w-sm text-sm leading-relaxed text-text-secondary md:text-base"
        >
          Tell us how you're feeling — our AI finds the perfect spot for your vibe
        </motion.p>

        {/* Detected mood badge */}
        {detectedMood && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={springPresets.bouncy}
            className="mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium capitalize"
            style={{
              borderColor: MOOD_GRADIENTS[detectedMood][0].replace('20', '60'),
              background: MOOD_GRADIENTS[detectedMood][0],
              color: MOOD_GRADIENTS[detectedMood][0].replace('20', ''),
            }}
          >
            <span aria-hidden="true">✨</span>
            Vibe detected: <strong>{detectedMood}</strong>
          </motion.div>
        )}
      </div>
    </header>
  );
}
