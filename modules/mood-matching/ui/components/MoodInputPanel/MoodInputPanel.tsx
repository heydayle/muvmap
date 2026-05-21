'use client';

import { springPresets } from '@/shared/hooks/useAnimationPresets';
import { MoodInputType } from '@/shared/types';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { MoodMatchInput } from '../../../core/models/moodMatch';
import EmojiMoodPicker from '../EmojiMoodPicker';
import MoodTextInput from '../MoodTextInput';

/** Props for the MoodInputPanel */
export interface MoodInputPanelProps {
  /** Called when the user submits their mood */
  onSubmit: (input: MoodMatchInput) => void;
  /** Whether the panel is in a submitting/loading state */
  isLoading?: boolean;
}

const MODE_CONFIG: { id: MoodInputType; icon: string; label: string }[] = [
  { id: 'text', icon: '✏️', label: 'Describe' },
  { id: 'emoji', icon: '😊', label: 'Emoji' },
];

/**
 * MoodInputPanel — the primary mood input surface.
 * Toggles between text and emoji input modes.
 * Contains the submit button with spring-physics animation.
 *
 * @param props - MoodInputPanelProps
 * @returns Glassmorphic input panel with mode switcher
 */
export default function MoodInputPanel({
  onSubmit,
  isLoading = false,
}: MoodInputPanelProps) {
  const [inputMode, setInputMode] = useState<MoodInputType>('text');
  const [textValue, setTextValue] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string[]>([]);

  /** Toggles emoji selection (max 3) */
  const handleEmojiToggle = useCallback((emoji: string) => {
    setSelectedEmoji((prev) => {
      if (prev.includes(emoji)) return prev.filter((e) => e !== emoji);
      if (prev.length >= 3) return prev;
      return [...prev, emoji];
    });
  }, []);

  /** Validates and dispatches the mood input */
  const handleSubmit = useCallback(() => {
    const isTextMode = inputMode === 'text';
    const hasText = textValue.trim().length >= 2;
    const hasEmoji = selectedEmoji.length > 0;

    if (isTextMode && !hasText) return;
    if (!isTextMode && !hasEmoji) return;

    onSubmit({
      inputType: inputMode,
      text: isTextMode ? textValue.trim() : undefined,
      emoji: !isTextMode ? selectedEmoji : undefined,
    });
  }, [inputMode, textValue, selectedEmoji, onSubmit]);

  const canSubmit =
    !isLoading &&
    (inputMode === 'text'
      ? textValue.trim().length >= 2
      : selectedEmoji.length > 0);

  return (
    <div className="w-full space-y-4">
      {/* ── Mode toggle ── */}
      <div className="flex w-full gap-2 rounded-2xl bg-white/5 p-1 ring-1 ring-white/8">
        {MODE_CONFIG.map(({ id, icon, label }) => {
          const isActive = inputMode === id;
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => setInputMode(id)}
              whileTap={{ scale: 0.96 }}
              transition={springPresets.snappy}
              className="relative flex-1 rounded-xl py-2.5 text-sm font-semibold"
              aria-pressed={isActive}
              aria-label={`Switch to ${label} mood input`}
            >
              {isActive && (
                <motion.div
                  layoutId="mood-mode-indicator"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(59,130,246,0.9) 50%, rgba(6,182,212,0.9) 100%)',
                    boxShadow: '0 0 20px rgba(99,102,241,0.4)',
                  }}
                  transition={springPresets.smooth}
                  aria-hidden="true"
                />
              )}
              <span
                className={[
                  'relative z-10 flex items-center justify-center gap-1.5 transition-colors duration-200',
                  isActive ? 'text-white' : 'text-white/40 hover:text-white/60',
                ].join(' ')}
              >
                <span className="text-base leading-none">{icon}</span>
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Input area ── */}
      <AnimatePresence mode="wait">
        {inputMode === 'text' ? (
          <motion.div
            key="text"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={springPresets.smooth}
          >
            <MoodTextInput
              value={textValue}
              onChange={setTextValue}
              disabled={isLoading}
            />
          </motion.div>
        ) : (
          <motion.div
            key="emoji"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={springPresets.smooth}
            className="max-h-[35vh] overflow-y-auto overflow-x-hidden pr-1"
          >
            <EmojiMoodPicker
              selected={selectedEmoji}
              onToggle={handleEmojiToggle}
              disabled={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Submit button ── */}
      <motion.button
        type="button"
        id="mood-match-submit"
        onClick={handleSubmit}
        disabled={!canSubmit}
        whileHover={canSubmit ? { y: -2, scale: 1.01 } : {}}
        whileTap={canSubmit ? { scale: 0.97 } : {}}
        transition={springPresets.snappy}
        className={[
          'relative w-full overflow-hidden rounded-2xl py-3.5 text-sm font-bold tracking-wide text-white',
          'transition-all duration-200',
          'disabled:cursor-not-allowed disabled:opacity-35',
        ].join(' ')}
        style={
          canSubmit
            ? {
                background:
                  'linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #0891b2 100%)',
                boxShadow:
                  '0 4px 24px rgba(99,102,241,0.45), 0 1px 0 rgba(255,255,255,0.12) inset',
              }
            : {
                background: 'rgba(255,255,255,0.06)',
              }
        }
        aria-label="Match my mood to nearby locations"
      >
        {/* Shimmer sweep on hover */}
        {canSubmit && (
          <motion.div
            className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
            aria-hidden="true"
          />
        )}

        {isLoading ? (
          <span className="relative flex items-center justify-center gap-2">
            <span className="text-base">🎯</span>
            Reading your vibe
            <span className="flex gap-0.5" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                  className="inline-block h-1 w-1 rounded-full bg-white"
                />
              ))}
            </span>
          </span>
        ) : (
          <span className="relative flex items-center justify-center gap-2">
            <span className="text-base">✨</span>
            Match My Mood
          </span>
        )}
      </motion.button>
    </div>
  );
}
