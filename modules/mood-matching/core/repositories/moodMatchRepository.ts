import { MoodMatchInput, MoodMatchResult } from '../models/moodMatch';

/**
 * Contract for the mood matching data layer.
 * Implementations can be Dify/DeepSeek, rule-based fallback, or mock.
 * Source: flag.md Stories 2–4.
 */
export interface IMoodMatchRepository {
  /**
   * Runs the mood matching pipeline for a given user input.
   *
   * @param input - The user's mood input (text or emoji)
   * @returns Ranked list of matching locations with scores and reasoning
   */
  matchMood(input: MoodMatchInput): Promise<MoodMatchResult>;
}
