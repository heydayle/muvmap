import { IMoodMatchRepository } from '../core/repositories/moodMatchRepository';
import { MoodMatchInput, MoodMatchResult } from '../core/models/moodMatch';

/**
 * Fetch-based implementation of IMoodMatchRepository.
 * Routes requests through the Next.js API route `/api/mood-match`
 * which orchestrates Dify + DeepSeek with rule-based fallback.
 * Source: flag.md Stories 2–4.
 *
 * @implements {IMoodMatchRepository}
 */
export class MoodMatchApiRepository implements IMoodMatchRepository {
  /** Next.js API endpoint for mood matching */
  private readonly endpoint = '/api/mood-match';

  /**
   * Sends mood input to the server-side matching pipeline.
   *
   * @param input - Normalized mood input (text/emoji)
   * @returns Full mood match result with ranked locations
   */
  async matchMood(input: MoodMatchInput): Promise<MoodMatchResult> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (res.status === 429) {
      throw new Error('RATE_LIMITED');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? `Mood match failed: ${res.statusText}`);
    }

    return res.json() as Promise<MoodMatchResult>;
  }
}

/**
 * Singleton instance of the Mood Match API repository.
 * Used by all mood-matching hooks and usecases.
 */
export const moodMatchRepository = new MoodMatchApiRepository();
