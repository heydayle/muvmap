import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMoodMatch } from './useMoodMatch';
import * as matchMoodUsecase from '../../core/usecases/matchMood';
import * as moodMatchApiModule from '../../infras/moodMatchApi';
import { MoodMatchResult } from '../../core/models/moodMatch';

const MOCK_RESULT: MoodMatchResult = {
  detectedMood: 'happy',
  locations: [
    {
      id: 'loc-1',
      name: 'Happy Place',
      description: 'A bright spot',
      mood_category: 'happy',
      tags: ['outdoor'],
      latitude: 10.77,
      longitude: 106.7,
      relevanceScore: 0.9,
      moodAlignment: 'Perfect Match',
      reasoning: 'Great for your happy mood!',
    },
  ],
  fromCache: false,
  fromFallback: false,
  generatedAt: new Date().toISOString(),
};

describe('useMoodMatch hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in idle phase with no result', () => {
    const { result } = renderHook(() => useMoodMatch());
    expect(result.current.phase).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it('transitions to results on successful match', async () => {
    vi.spyOn(matchMoodUsecase, 'matchMood').mockResolvedValue(MOCK_RESULT);
    const { result } = renderHook(() => useMoodMatch());

    await act(async () => {
      await result.current.submitMood({ inputType: 'emoji', emoji: ['😄'] });
    });

    expect(result.current.phase).toBe('results');
    expect(result.current.result).toEqual(MOCK_RESULT);
    expect(result.current.errorMessage).toBeNull();
  });

  it('transitions to error phase on failure', async () => {
    vi.spyOn(matchMoodUsecase, 'matchMood').mockRejectedValue(new Error('AI timeout'));
    const { result } = renderHook(() => useMoodMatch());

    await act(async () => {
      await result.current.submitMood({ inputType: 'text', text: 'Feeling down' });
    });

    expect(result.current.phase).toBe('error');
    expect(result.current.errorMessage).toBe('AI timeout');
  });

  it('transitions to rate_limited phase on RATE_LIMITED error', async () => {
    vi.spyOn(matchMoodUsecase, 'matchMood').mockRejectedValue(new Error('RATE_LIMITED'));
    const { result } = renderHook(() => useMoodMatch());

    await act(async () => {
      await result.current.submitMood({ inputType: 'text', text: 'Feeling excited' });
    });

    expect(result.current.phase).toBe('rate_limited');
    expect(result.current.errorMessage).toContain('too many requests');
  });

  it('resets to idle on reset()', async () => {
    vi.spyOn(matchMoodUsecase, 'matchMood').mockResolvedValue(MOCK_RESULT);
    const { result } = renderHook(() => useMoodMatch());

    await act(async () => {
      await result.current.submitMood({ inputType: 'emoji', emoji: ['😄'] });
    });

    expect(result.current.phase).toBe('results');

    act(() => {
      result.current.reset();
    });

    expect(result.current.phase).toBe('idle');
    expect(result.current.result).toBeNull();
  });
});
