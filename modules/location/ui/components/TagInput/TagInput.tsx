'use client';

import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/shared/utils/cn';

/**
 * Props for the TagInput component.
 */
interface TagInputProps {
  /** Current list of tag strings */
  tags: string[];
  /** Callback when the tag list changes */
  onChange: (tags: string[]) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Maximum number of tags allowed */
  maxTags?: number;
}

/**
 * Normalizes a tag string: trims whitespace, converts to lowercase.
 * Source: rules/features/location/flags.md Story 5 acceptance criteria.
 *
 * @param tag - Raw tag string
 * @returns Normalized tag string
 */
function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

/**
 * TagInput provides a pill-based tag entry field.
 * Users can type tags, press Enter/comma to add, and click ×
 * to remove them.
 *
 * Source: rules/features/location/flags.md Story 5
 * - Free-text entry with normalization (lowercase, trimmed)
 * - Duplicate prevention
 * - Removable pills with close button
 *
 * @param props - TagInput props
 * @returns The tag input component
 */
export default function TagInput({
  tags,
  onChange,
  placeholder = 'Add a tag...',
  disabled = false,
  maxTags = 20,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Adds a new tag if it passes validation (non-empty, unique, under limit).
   */
  const addTag = useCallback(
    (raw: string) => {
      const normalized = normalizeTag(raw);

      if (!normalized) return;
      if (tags.includes(normalized)) return;
      if (tags.length >= maxTags) return;

      onChange([...tags, normalized]);
      setInputValue('');
    },
    [tags, onChange, maxTags],
  );

  /**
   * Removes a tag by its value.
   */
  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((t) => t !== tagToRemove));
    },
    [tags, onChange],
  );

  /**
   * Handles keyboard events: Enter/comma to add, Backspace to remove last.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      }
    },
    [inputValue, tags, addTag, removeTag],
  );

  return (
    <div
      className={cn(
        'flex cursor-text flex-wrap items-center gap-1.5 rounded-md border border-transparent bg-surface-elevated px-3 py-2',
        'transition-all duration-200 ease-out',
        'focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,123,255,0.2),0_0_20px_rgba(0,123,255,0.1)]',
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            'inline-flex cursor-pointer items-center gap-1 rounded-pill bg-primary/15 px-3 py-1 text-xs font-medium text-primary-light',
            'active:scale-95',
          )}
          onClick={(e) => {
            e.stopPropagation();
            removeTag(tag);
          }}
          aria-label={`Remove tag ${tag}`}
        >
          {tag}
          <span className="text-sm leading-none opacity-60 hover:opacity-100">
            ×
          </span>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue) addTag(inputValue);
        }}
        placeholder={tags.length === 0 ? placeholder : ''}
        disabled={disabled}
        aria-label="Add tag"
        className="min-w-[100px] flex-1 border-none bg-transparent px-0 py-1 font-primary text-sm text-text-primary outline-none placeholder:text-text-disabled"
      />
    </div>
  );
}
