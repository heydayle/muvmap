import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePublicFeed } from './usePublicFeed';
import * as discoveryApiModule from '../../infras/discoveryApi';
import type { PaginatedPublicLocations } from '../../core/models/publicLocation';
import { DEFAULT_FEED_FILTER } from '../../core/models/feed';

/** Minimal mock location factory */
const makeMockPage = (page: number, hasMore: boolean): PaginatedPublicLocations => ({
  data: [
    {
      id: `loc-${page}-001`,
      user_id: 'user-001',
      name: `Location ${page}-1`,
      description: 'Test location',
      image_url: null,
      latitude: 13.7,
      longitude: 100.5,
      is_public: true,
      mood_category: 'calm',
      tags: [{ name: 'calm', source: 'ai', confidence: 0.9 }],
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
      author: { id: 'user-001', handle: '@tester', avatar_url: null },
      like_count: 10,
      view_count: 50,
    },
  ],
  total: hasMore ? 2 : 1,
  page,
  limit: 20,
  hasMore,
});

describe('usePublicFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(discoveryApiModule.discoveryRepository, 'getPublicFeed').mockResolvedValue(
      makeMockPage(0, false),
    );
  });

  it('fetches the initial page on mount', async () => {
    const { result } = renderHook(() => usePublicFeed());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.locations).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('resets locations when filter changes', async () => {
    const { result, rerender } = renderHook(
      ({ filter }) => usePublicFeed(filter),
      { initialProps: { filter: DEFAULT_FEED_FILTER } },
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.spyOn(discoveryApiModule.discoveryRepository, 'getPublicFeed').mockResolvedValue(
      makeMockPage(0, false),
    );

    rerender({ filter: { ...DEFAULT_FEED_FILTER, mood: 'happy' } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should have reset to fresh single page
    expect(result.current.locations).toHaveLength(1);
  });

  it('appends locations on loadMore', async () => {
    vi.spyOn(discoveryApiModule.discoveryRepository, 'getPublicFeed')
      .mockResolvedValueOnce(makeMockPage(0, true))
      .mockResolvedValueOnce(makeMockPage(1, false));

    const { result } = renderHook(() => usePublicFeed());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.isFetchingMore).toBe(false));

    expect(result.current.locations).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
  });

  it('sets error state when fetch fails', async () => {
    vi.spyOn(discoveryApiModule.discoveryRepository, 'getPublicFeed').mockRejectedValue(
      new Error('Network error'),
    );

    const { result } = renderHook(() => usePublicFeed());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.locations).toHaveLength(0);
  });

  it('refetch resets and re-fetches page 0', async () => {
    const { result } = renderHook(() => usePublicFeed());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.refetch());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.locations).toHaveLength(1);
  });
});
