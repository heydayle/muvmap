import { useState, useCallback, useRef } from 'react';
import { MoodMatchInput, MoodMatchResult, MoodMatchPhase } from '../../core/models/moodMatch';
import { matchMood } from '../../core/usecases/matchMood';
import { moodMatchRepository } from '../../infras/moodMatchApi';

/**
 * State and actions returned by useMoodMatch.
 */
export interface UseMoodMatchState {
  /** Current phase of the mood matching flow */
  phase: MoodMatchPhase;
  /** Successful match result, or null if not yet fetched */
  result: MoodMatchResult | null;
  /** Error message to display, or null */
  errorMessage: string | null;
  /** Triggers a mood match request with the given input */
  submitMood: (input: MoodMatchInput) => Promise<void>;
  /** Resets state back to idle (clear results) */
  reset: () => void;
}

/**
 * UI hook for the mood matching flow.
 * Manages phase transitions: idle → thinking → results | error | rate_limited.
 * Delegates business logic to the matchMood usecase.
 *
 * @returns Mood match state and actions
 */
export function useMoodMatch(): UseMoodMatchState {
  const [phase, setPhase] = useState<MoodMatchPhase>('idle');
  const [result, setResult] = useState<MoodMatchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** Abort controller ref for cancelling in-flight requests */
  const abortRef = useRef<AbortController | null>(null);

  /**
   * Submits mood input, transitions to thinking, then results or error.
   *
   * @param input - The user's mood input (text or emoji)
   */
  const submitMood = useCallback(async (input: MoodMatchInput) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setPhase('thinking');
    setResult(null);
    setErrorMessage(null);

    try {
      const matched = await matchMood(moodMatchRepository, input);
      setResult(matched);
      setPhase('results');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      if (msg === 'RATE_LIMITED') {
        setPhase('rate_limited');
        setErrorMessage('You\'ve sent too many requests. Take a breather and try again soon! 😅');
      } else {
        setPhase('error');
        setErrorMessage(msg);
      }
    }
  }, []);

  /** Resets the mood matching flow back to the initial state */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase('idle');
    setResult(null);
    setErrorMessage(null);
  }, []);

  return { phase, result, errorMessage, submitMood, reset };
}
