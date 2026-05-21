'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { springPresets } from '@/shared/hooks/useAnimationPresets';

/** Typewriter placeholder examples cycling through mood scenarios */
const PLACEHOLDER_EXAMPLES = [
  'I want something cozy and quiet…',
  "Feeling adventurous, let's explore!",
  'Need a romantic spot for tonight…',
  'Want to chill and vibe with good music…',
  'Looking for something to lift my spirits…',
  "I'm feeling energetic, let's move!",
];

/** Max characters allowed in the mood text input */
const MAX_LENGTH = 500;

/** Props for the MoodTextInput component */
export interface MoodTextInputProps {
  /** Current value of the text input */
  value: string;
  /** Called when the user changes the text */
  onChange: (value: string) => void;
  /** Whether to disable the input (e.g. while loading) */
  disabled?: boolean;
}

/**
 * Premium mood text input with typewriter placeholder animation.
 * Renders an animated gradient border on focus + character counter.
 *
 * @param props - MoodTextInputProps
 * @returns Animated textarea with focus glow effect
 */
export default function MoodTextInput({ value, onChange, disabled = false }: MoodTextInputProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Typewriter animation for placeholder cycling */
  const animatePlaceholder = useCallback((text: string) => {
    let i = 0;
    setDisplayedPlaceholder('');
    if (typewriterRef.current) clearTimeout(typewriterRef.current);

    const type = () => {
      if (i <= text.length) {
        setDisplayedPlaceholder(text.slice(0, i));
        i += 1;
        typewriterRef.current = setTimeout(type, 38);
      }
    };
    type();
  }, []);

  /** Cycle placeholder every 3.5s when input is empty and unfocused */
  useEffect(() => {
    if (value || isFocused) return;
    animatePlaceholder(PLACEHOLDER_EXAMPLES[placeholderIndex]);
    cycleRef.current = setInterval(() => {
      setPlaceholderIndex((prev) => {
        const next = (prev + 1) % PLACEHOLDER_EXAMPLES.length;
        animatePlaceholder(PLACEHOLDER_EXAMPLES[next]);
        return next;
      });
    }, 3500);

    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isFocused]);

  const charCount = value.length;
  const isNearLimit = charCount > MAX_LENGTH * 0.8;

  return (
    <div className="relative w-full">

      {/* Input wrapper */}
      <motion.div
        animate={{ scale: isFocused ? 1.005 : 1 }}
        transition={springPresets.gentle}
        className="relative"
      >
        <textarea
          id="mood-text-input"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_LENGTH))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={value ? '' : displayedPlaceholder}
          rows={4}
          maxLength={MAX_LENGTH}
          aria-label="Describe your current mood"
          aria-describedby="mood-text-hint"
          className={[
            'w-full resize-none rounded-[20px] px-5 py-4 text-sm leading-relaxed',
            'bg-white/6 text-white placeholder:text-white/30',
            'border transition-all duration-200',
            'focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isFocused
              ? 'border-transparent'
              : 'border-white/10 hover:border-white/20',
          ].join(' ')}
          style={
            isFocused
              ? { boxShadow: '0 0 0 2px rgba(139,92,246,0.5), 0 8px 32px rgba(99,102,241,0.15)' }
              : undefined
          }
        />
      </motion.div>

      {/* Character counter */}
      <div
        id="mood-text-hint"
        className={[
          'mt-1.5 flex justify-end text-[11px] font-medium transition-colors',
          isNearLimit ? 'text-orange-400' : 'text-white/30',
        ].join(' ')}
        aria-live="polite"
      >
        {charCount}/{MAX_LENGTH}
      </div>
    </div>
  );
}
