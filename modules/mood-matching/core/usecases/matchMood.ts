import { IMoodMatchRepository } from '../repositories/moodMatchRepository';
import { MoodMatchInput, MoodMatchResult } from '../models/moodMatch';

/** Maximum text input length accepted before truncation (chars) */
const MAX_TEXT_LENGTH = 500;

/** Minimum text length required before dispatching */
const MIN_TEXT_LENGTH = 2;

/**
 * Validates and normalizes mood input, then dispatches to the repository.
 * Enforces: text sanitization, length limits, and emoji deduplication.
 * Source: flag.md Stories 5–6.
 *
 * @param repository - The mood match data repository
 * @param input - Raw mood input from the UI
 * @returns Mood match result with ranked locations
 * @throws Error when input is empty or too short
 */
export async function matchMood(
  repository: IMoodMatchRepository,
  input: MoodMatchInput,
): Promise<MoodMatchResult> {
  const normalizedInput = normalizeInput(input);
  return repository.matchMood(normalizedInput);
}

/**
 * Sanitizes and normalizes raw mood input.
 * - Trims and length-caps text
 * - Deduplicates emoji
 * - Validates at least one input method has content
 *
 * @param input - Raw user input
 * @returns Cleaned, validated input
 * @throws Error if no usable content is present
 */
function normalizeInput(input: MoodMatchInput): MoodMatchInput {
  const text = input.text?.trim().slice(0, MAX_TEXT_LENGTH) ?? '';
  const emoji = [...new Set(input.emoji ?? [])];

  const hasText = text.length >= MIN_TEXT_LENGTH;
  const hasEmoji = emoji.length > 0;

  if (!hasText && !hasEmoji) {
    throw new Error('Mood input is empty — please describe your mood or pick an emoji.');
  }

  return {
    inputType: input.inputType,
    text: hasText ? text : undefined,
    emoji: hasEmoji ? emoji : undefined,
    requestedAt: new Date().toISOString(),
  };
}
