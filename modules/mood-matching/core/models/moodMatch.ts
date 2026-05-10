import { MoodCategory, MoodInputType } from '@/shared/types';

/**
 * Raw input from the user for mood matching.
 * Supports text and emoji input methods per flag.md Stories 5–6.
 */
export interface MoodMatchInput {
  /** The user's free-form mood description (text input mode) */
  text?: string;
  /** Array of emoji the user selected (emoji input mode) */
  emoji?: string[];
  /** How the mood was expressed */
  inputType: MoodInputType;
  /** ISO 8601 timestamp of the request */
  requestedAt?: string;
}

/**
 * A single location recommended by the AI mood matching engine.
 * Includes the relevance score and human-readable reasoning blurb.
 * Source: flag.md Stories 1, 10.
 */
export interface MoodMatchedLocation {
  /** Location UUID */
  id: string;
  /** Display name of the location */
  name: string;
  /** Short description */
  description: string | null;
  /** Mood category the location is tagged with */
  mood_category: MoodCategory | null;
  /** Tag names for display */
  tags: string[];
  /** Latitude coordinate */
  latitude: number | null;
  /** Longitude coordinate */
  longitude: number | null;
  /**
   * Relevance score from 0–1 (higher = stronger mood alignment).
   * Populated by the AI or rule-based engine.
   */
  relevanceScore: number;
  /**
   * Mood alignment label derived from the score.
   * e.g. "Perfect Match" | "Great Match" | "Good Match"
   */
  moodAlignment: string;
  /**
   * Human-readable explanation of why this location was recommended.
   * Only populated when reasoning_enabled = true (flag.md Story 10).
   */
  reasoning: string | null;
}

/**
 * Full result returned by the mood matching engine.
 * Contains the ranked list of locations and the detected mood.
 */
export interface MoodMatchResult {
  /** The detected/inferred mood category from user input */
  detectedMood: MoodCategory;
  /** Ordered list of matching locations (highest relevance first) */
  locations: MoodMatchedLocation[];
  /**
   * Whether the result was served from cache.
   * Source: flag.md Story 8.
   */
  fromCache: boolean;
  /**
   * Whether this result was produced by the rule-based fallback engine.
   * Source: flag.md Story 4.
   */
  fromFallback: boolean;
  /** ISO 8601 timestamp of when the result was generated */
  generatedAt: string;
}

/**
 * State machine phases for the mood matching flow.
 */
export type MoodMatchPhase =
  | 'idle'
  | 'thinking'
  | 'results'
  | 'error'
  | 'rate_limited';

/**
 * Emoji-to-mood mapping for the emoji input method.
 * Source: flag.md Story 6.
 */
export const EMOJI_MOOD_MAP: Record<string, MoodCategory> = {
  '😌': 'calm',
  '🧘': 'calm',
  '☁️': 'calm',
  '😢': 'sad',
  '😔': 'sad',
  '💧': 'sad',
  '😄': 'happy',
  '😊': 'happy',
  '🌟': 'happy',
  '💕': 'romantic',
  '❤️': 'romantic',
  '🌹': 'romantic',
  '⚡': 'energetic',
  '🏃': 'energetic',
  '🔥': 'excited',
  '😎': 'chill',
  '🎵': 'chill',
  '🌙': 'chill',
  '🎉': 'excited',
  '🚀': 'excited',
  '💜': 'chill',
  '🌈': 'happy',
  '🌊': 'calm',
};

/**
 * Preset emoji groups for the emoji picker grid.
 * Shown as rows per mood category.
 */
export const EMOJI_PRESETS: { mood: MoodCategory; emoji: string[]; label: string }[] = [
  { mood: 'calm', emoji: ['😌', '🧘', '☁️', '🌊'], label: 'Calm' },
  { mood: 'happy', emoji: ['😄', '😊', '🌟', '🌈'], label: 'Happy' },
  { mood: 'energetic', emoji: ['⚡', '🏃', '💪', '🎯'], label: 'Energetic' },
  { mood: 'romantic', emoji: ['💕', '❤️', '🌹', '💫'], label: 'Romantic' },
  { mood: 'chill', emoji: ['😎', '🎵', '🌙', '💜'], label: 'Chill' },
  { mood: 'excited', emoji: ['🔥', '🎉', '🚀', '✨'], label: 'Excited' },
  { mood: 'sad', emoji: ['😢', '😔', '💧', '🌧️'], label: 'Sad' },
];

/**
 * Mood alignment label based on relevance score.
 *
 * @param score - Relevance score from 0–1
 * @returns Human-readable label
 */
export function getMoodAlignment(score: number): string {
  if (score >= 0.85) return 'Perfect Match';
  if (score >= 0.7) return 'Great Match';
  if (score >= 0.5) return 'Good Match';
  return 'Possible Match';
}
