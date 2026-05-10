'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { springPresets } from '@/shared/hooks/useAnimationPresets';

/**
 * AI thinking overlay — shown while the AI mood matching pipeline runs.
 * Uses animated pulse dots per rules/design.md §8 (Conversational Design).
 * Never shows a spinner — animated dots feel more conversational.
 *
 * @returns Fullscreen glassmorphic thinking overlay
 */
export default function AiThinkingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={springPresets.smooth}
      className="flex flex-col items-center justify-center gap-6 py-16"
      role="status"
      aria-label="AI is analyzing your mood"
      aria-live="polite"
    >
      {/* Glassmorphic bubble */}
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={springPresets.heavy}
        className="flex flex-col items-center gap-5 rounded-[24px] border border-border-glass bg-surface-glass px-10 py-8 text-center backdrop-blur-[16px]"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
      >
        {/* Brain emoji with pulse */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-5xl"
          aria-hidden="true"
        >
          🧠
        </motion.div>

        {/* Animated dots */}
        <div className="flex items-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              animate={{
                y: [0, -8, 0],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
              className="h-2.5 w-2.5 rounded-full bg-primary"
            />
          ))}
        </div>

        {/* Label */}
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-text-primary">Reading your vibe…</p>
          <p className="max-w-[240px] text-sm text-text-secondary">
            Our AI is finding spots that match exactly how you feel right now
          </p>
        </div>

        {/* Electric blue progress bar */}
        <motion.div
          className="h-0.5 w-48 overflow-hidden rounded-full bg-surface-elevated"
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
