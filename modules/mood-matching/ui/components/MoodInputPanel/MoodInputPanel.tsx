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

/**
 * MoodInputPanel — the primary mood input surface.
 * Toggles between text and emoji input modes (flag.md Stories 5–6).
 * Contains the submit button with spring-physics animation.
 * This is the #1 priority component per rules/design.md §13.
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
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springPresets.smooth}
      className="w-full rounded-[24px] border border-border-glass bg-surface-glass p-2 backdrop-blur-[16px]"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
    >
      {/* Mode toggle */}
      <div className="mb-6 flex w-full rounded-[14px] border border-border-default bg-surface p-1">
        {(['text', 'emoji'] as MoodInputType[]).map((mode) => (
          <motion.button
            key={mode}
            type="button"
            onClick={() => setInputMode(mode)}
            whileTap={{ scale: 0.97 }}
            transition={springPresets.snappy}
            className={[
              'relative flex-1 rounded-[10px] py-2 text-sm font-medium capitalize transition-colors',
              inputMode === mode
                ? 'text-white'
                : 'text-text-tertiary hover:text-text-secondary',
            ].join(' ')}
            aria-pressed={inputMode === mode}
            aria-label={`Switch to ${mode} mood input`}
          >
            {inputMode === mode && (
              <motion.div
                layoutId="mode-indicator"
                className="absolute inset-0 rounded-[10px] bg-primary"
                transition={springPresets.smooth}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">
              {mode === 'text' ? '✏️ Text' : '😊 Emoji'}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Input area */}
      <AnimatePresence mode="wait">
        {inputMode === 'text' ? (
          <motion.div
            key="text"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
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
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={springPresets.smooth}
            className="max-h-[35vh] overflow-y-auto overflow-x-hidden pr-2"
          >
            <EmojiMoodPicker
              selected={selectedEmoji}
              onToggle={handleEmojiToggle}
              disabled={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      <motion.button
        type="button"
        id="mood-match-submit"
        onClick={handleSubmit}
        disabled={!canSubmit}
        whileHover={canSubmit ? { y: -1 } : {}}
        whileTap={canSubmit ? { scale: 0.97 } : {}}
        transition={springPresets.snappy}
        className={[
          'mt-5 w-full rounded-[14px] py-3.5 text-sm font-semibold tracking-wide text-white',
          'transition-all duration-150',
          'disabled:cursor-not-allowed disabled:opacity-40',
          canSubmit
            ? 'bg-gradient-to-r from-primary to-primary-light shadow-[0_4px_20px_rgba(0,123,255,0.4)] hover:shadow-[0_6px_24px_rgba(0,123,255,0.5)]'
            : 'bg-surface-elevated',
        ].join(' ')}
        aria-label="Match my mood to nearby locations"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
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
          '✨ Match My Mood'
        )}
      </motion.button>
    </motion.div>
  );
}
