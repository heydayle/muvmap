'use client';

import { springPresets } from '@/shared/hooks/useAnimationPresets';
import { MoodCategory } from '@/shared/types';
import { AnimatePresence, motion } from 'framer-motion';
import { EMOJI_MOOD_MAP, EMOJI_PRESETS } from '../../../core/models/moodMatch';

/** Mood color mapping — used for glow and selection halo */
const MOOD_COLORS: Record<MoodCategory, { hex: string; glow: string }> = {
  calm:     { hex: '#38bdf8', glow: 'rgba(56,189,248,0.45)' },
  happy:    { hex: '#facc15', glow: 'rgba(250,204,21,0.45)' },
  energetic:{ hex: '#22c55e', glow: 'rgba(34,197,94,0.45)' },
  romantic: { hex: '#fb7185', glow: 'rgba(251,113,133,0.45)' },
  chill:    { hex: '#a78bfa', glow: 'rgba(167,139,250,0.45)' },
  excited:  { hex: '#fb923c', glow: 'rgba(251,146,60,0.45)' },
  sad:      { hex: '#64748b', glow: 'rgba(100,116,139,0.45)' },
};

/** Props for the EmojiMoodPicker component */
export interface EmojiMoodPickerProps {
  /** Currently selected emoji */
  selected: string[];
  /** Called when the user taps/clicks an emoji */
  onToggle: (emoji: string) => void;
  /** Whether to disable interactions */
  disabled?: boolean;
}

/**
 * Emoji mood picker — a preset grid of emoji organized by mood category.
 * Supports multi-select (up to 3 emoji) for nuanced expression.
 *
 * @param props - EmojiMoodPickerProps
 * @returns Animated emoji grid with per-mood glow
 */
export default function EmojiMoodPicker({
  selected,
  onToggle,
  disabled = false,
}: EmojiMoodPickerProps) {
  const MAX_SELECT = 3;

  const allEmoji = EMOJI_PRESETS.flatMap(({ mood, emoji }) =>
    emoji.map((e) => ({ e, mood })),
  );

  return (
    <div role="group" aria-label="Select emoji to express your mood" className="space-y-3">
      {/* Emoji grid */}
      <div className="flex flex-wrap justify-center gap-2 p-1">
        {allEmoji.map(({ e, mood }, idx) => {
          const isSelected = selected.includes(e);
          const isDisabledDueToLimit = !isSelected && selected.length >= MAX_SELECT;
          const resolvedMood = (EMOJI_MOOD_MAP[e] ?? mood) as MoodCategory;
          const { hex, glow } = MOOD_COLORS[resolvedMood] ?? MOOD_COLORS.sad;

          return (
            <motion.button
              key={e}
              type="button"
              onClick={() => onToggle(e)}
              disabled={disabled || isDisabledDueToLimit}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                ...springPresets.bouncy,
                delay: idx * 0.015,
              }}
              whileHover={
                !disabled && !isDisabledDueToLimit ? { scale: 1.2, y: -2 } : {}
              }
              whileTap={!disabled ? { scale: 0.88 } : {}}
              aria-label={`${e} — ${resolvedMood} mood${isSelected ? ' (selected)' : ''}`}
              aria-pressed={isSelected}
              className={[
                'relative flex h-11 w-11 items-center justify-center rounded-2xl text-xl',
                'border transition-all duration-150',
                'disabled:cursor-not-allowed disabled:opacity-25',
                isSelected
                  ? 'border-transparent'
                  : isDisabledDueToLimit
                    ? 'border-white/5 bg-white/3 opacity-40'
                    : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10',
              ].join(' ')}
              style={
                isSelected
                  ? {
                      background: `${hex}20`,
                      borderColor: hex,
                      boxShadow: `0 0 16px ${glow}, 0 0 0 1px ${hex}`,
                    }
                  : undefined
              }
            >
              {e}

              {/* Selection check badge */}
              <AnimatePresence>
                {isSelected && (
                  <motion.span
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 20 }}
                    transition={springPresets.bouncy}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ background: hex, boxShadow: `0 0 8px ${glow}` }}
                    aria-hidden="true"
                  >
                    ✓
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Selection count hint */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center justify-center gap-2 pb-1"
            aria-live="polite"
          >
            <div className="flex gap-1">
              {Array.from({ length: MAX_SELECT }).map((_, i) => (
                <motion.span
                  key={i}
                  animate={{
                    background:
                      i < selected.length
                        ? 'linear-gradient(135deg,#7c3aed,#2563eb)'
                        : 'rgba(255,255,255,0.1)',
                  }}
                  className="inline-block h-1.5 w-4 rounded-full"
                />
              ))}
            </div>
            <span className="text-[11px] text-white/40">
              {selected.length}/{MAX_SELECT} selected
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
