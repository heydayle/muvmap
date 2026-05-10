import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTrending } from './useTrending';
import * as discoveryApiModule from '../../infras/discoveryApi';
import type { TrendingLocation } from '../../core/models/publicLocation';
import type { TrendingPeriod } from '../../core/models/feed';

/** Minimal trending location factory */
const makeTrending = (rank: number): TrendingLocation => ({
  id: `trend-${rank}`,
  user_id: 'user-001',
  name: `Trending Spot #${rank}`,
  description: 'A trending place',
  image_url: null,
  latitude: 13.7,
  longitude: 100.5,
  is_public: true,
  mood_category: 'excited',
  tags: [{ name: 'popular', source: 'ai', confidence: 0.95 }],
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  author: { id: 'user-001', handle: '@hot_spot', avatar_url: null },
  like_count: rank * 100,
  view_count: rank * 500,
  trending_score: rank * 10,
  rank,
});

describe('useTrending', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(discoveryApiModule.discoveryRepository, 'getTrending').mockResolvedValue([
      makeTrending(1),
      makeTrending(2),
      makeTrending(3),
    ]);
  });

  it('fetches trending locations on mount', async () => {
    const { result } = renderHook(() => useTrending());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.locations).toHaveLength(3);
    expect(result.current.locations[0].rank).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('re-fetches when period changes', async () => {
    const { result, rerender } = renderHook(({ period }) => useTrending(period), {
      initialProps: { period: 'week' as TrendingPeriod },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.spyOn(discoveryApiModule.discoveryRepository, 'getTrending').mockResolvedValue([
      makeTrending(1),
    ]);

    rerender({ period: 'day' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(discoveryApiModule.discoveryRepository.getTrending).toHaveBeenCalledTimes(2);
  });

  it('sets error state when fetch fails', async () => {
    vi.spyOn(discoveryApiModule.discoveryRepository, 'getTrending').mockRejectedValue(
      new Error('Trending fetch failed'),
    );

    const { result } = renderHook(() => useTrending());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toBe('Trending fetch failed');
    expect(result.current.locations).toHaveLength(0);
  });

  it('refetch re-fetches with the same period', async () => {
    const { result } = renderHook(() => useTrending('week'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.refetch();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(discoveryApiModule.discoveryRepository.getTrending).toHaveBeenCalledTimes(2);
  });
});
