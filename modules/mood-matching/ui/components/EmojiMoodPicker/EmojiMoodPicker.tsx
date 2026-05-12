'use client';

import { springPresets } from '@/shared/hooks/useAnimationPresets';
import { MoodCategory } from '@/shared/types';
import { AnimatePresence, motion } from 'framer-motion';
import { EMOJI_MOOD_MAP, EMOJI_PRESETS } from '../../../core/models/moodMatch';

/** Mood color mapping for the emoji picker labels */
const MOOD_COLORS: Record<MoodCategory, string> = {
  calm: '#38bdf8',
  happy: '#facc15',
  energetic: '#22c55e',
  romantic: '#fb7185',
  chill: '#a78bfa',
  excited: '#fb923c',
  sad: '#64748b',
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
 * Source: flag.md Story 6.
 *
 * @param props - EmojiMoodPickerProps
 * @returns Animated emoji grid
 */
export default function EmojiMoodPicker({
  selected,
  onToggle,
  disabled = false,
}: EmojiMoodPickerProps) {
  const MAX_SELECT = 3;

  return (
    <div
      className="flex flex-wrap gap-3 justify-center"
      role="group"
      aria-label="Select emoji to express your mood"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springPresets.snappy}
        className="flex flex-wrap gap-2 p-2 justify-center"
      >
        {EMOJI_PRESETS.flatMap(({ mood, emoji }) =>
          emoji.map((e) => {
            const isSelected = selected.includes(e);
            const isDisabledDueToLimit =
              !isSelected && selected.length >= MAX_SELECT;
            const resolvedMood = EMOJI_MOOD_MAP[e] ?? mood;
            const accentColor = MOOD_COLORS[resolvedMood];

            return (
              <motion.button
                key={e}
                type="button"
                onClick={() => onToggle(e)}
                disabled={disabled || isDisabledDueToLimit}
                whileHover={
                  !disabled && !isDisabledDueToLimit ? { scale: 1.15 } : {}
                }
                whileTap={!disabled ? { scale: 0.9 } : {}}
                transition={springPresets.bouncy}
                aria-label={`${e} — ${resolvedMood} mood${isSelected ? ' (selected)' : ''}`}
                aria-pressed={isSelected}
                className={[
                  'relative flex h-8 w-8 items-center justify-center rounded-[14px] text-lg',
                  'border transition-all duration-150',
                  'disabled:cursor-not-allowed disabled:opacity-30',
                  isSelected
                    ? 'border-transparent shadow-[0_0_12px_rgba(0,123,255,0.4)]'
                    : 'border-border-default bg-surface hover:border-opacity-40',
                ].join(' ')}
                style={
                  isSelected
                    ? {
                        background: `${accentColor}22`,
                        borderColor: accentColor,
                      }
                    : {}
                }
              >
                {e}

                {/* Selection indicator dot */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={springPresets.bouncy}
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-white"
                      style={{ background: accentColor }}
                      aria-hidden="true"
                    >
                      ✓
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          }),
        )}
      </motion.div>

      {/* Selection count hint */}
      <motion.p
        animate={{ opacity: selected.length > 0 ? 1 : 0 }}
        className="mt-1 px-2 text-center text-[11px] text-text-tertiary"
        aria-live="polite"
      >
        {selected.length} of {MAX_SELECT} emoji selected
      </motion.p>
    </div>
  );
}
