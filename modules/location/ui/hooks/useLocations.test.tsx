import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useLocations, useLocationDetail, locationKeys } from './useLocations';
import { locationRepository } from '../../infras/locationApi';

/** Mock the infrastructure layer — unit tests must not hit the network. */
vi.mock('../../infras/locationApi', () => ({
  locationRepository: {
    getLocations: vi.fn(),
    getLocationById: vi.fn(),
  },
}));

/** Creates a fresh QueryClient per test to avoid cross-test cache contamination. */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const MOCK_PAGINATED = {
  data: [
    {
      id: 'loc-1',
      name: 'Test Cafe',
      user_id: 'user-1',
      description: null,
      image_url: null,
      latitude: null,
      longitude: null,
      is_public: false,
      mood_category: null,
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  total: 1,
  page: 0,
  limit: 20,
  hasMore: false,
};

describe('useLocations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches paginated locations successfully', async () => {
    vi.mocked(locationRepository.getLocations).mockResolvedValue(MOCK_PAGINATED);

    const { result } = renderHook(() => useLocations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].name).toBe('Test Cafe');
  });

  it('passes page and limit to repository', async () => {
    vi.mocked(locationRepository.getLocations).mockResolvedValue(MOCK_PAGINATED);

    renderHook(() => useLocations({ page: 2, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(locationRepository.getLocations).toHaveBeenCalledWith(2, 10),
    );
  });

  it('does not fetch when fetchEnabled is false', () => {
    const { result } = renderHook(
      () => useLocations({ fetchEnabled: false }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(false);
    expect(locationRepository.getLocations).not.toHaveBeenCalled();
  });
});

describe('locationKeys', () => {
  it('generates stable list key with page and limit', () => {
    expect(locationKeys.list(0, 20)).toEqual(['locations', 'list', { page: 0, limit: 20 }]);
  });

  it('generates stable detail key with id', () => {
    expect(locationKeys.detail('abc-123')).toEqual(['locations', 'detail', 'abc-123']);
  });
});
