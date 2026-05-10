import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useLocationMutations } from './useLocationMutations';
import { locationRepository } from '../../infras/locationApi';

/** Mock the infrastructure layer — unit tests must not hit the network. */
vi.mock('../../infras/locationApi', () => ({
  locationRepository: {
    createLocation: vi.fn(),
    updateLocation: vi.fn(),
    deleteLocation: vi.fn(),
  },
}));

/** Creates a fresh QueryClient per test to avoid cross-test cache contamination. */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const MOCK_CREATED_LOCATION = {
  id: 'new-loc-1',
  name: 'New Spot',
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
};

describe('useLocationMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a location successfully via createLocation.mutate', async () => {
    vi.mocked(locationRepository.createLocation).mockResolvedValue(
      MOCK_CREATED_LOCATION,
    );

    const { result } = renderHook(() => useLocationMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.createLocation.mutate({ name: 'New Spot' });
    });

    await waitFor(() =>
      expect(result.current.createLocation.isSuccess).toBe(true),
    );

    expect(locationRepository.createLocation).toHaveBeenCalledWith({
      name: 'New Spot',
    });
  });

  it('deletes a location successfully via deleteLocation.mutate', async () => {
    vi.mocked(locationRepository.deleteLocation).mockResolvedValue(undefined);

    const { result } = renderHook(() => useLocationMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.deleteLocation.mutate('loc-1');
    });

    await waitFor(() =>
      expect(result.current.deleteLocation.isSuccess).toBe(true),
    );

    expect(locationRepository.deleteLocation).toHaveBeenCalledWith('loc-1');
  });

  it('repository is called with the correct payload during mutation', async () => {
    vi.mocked(locationRepository.createLocation).mockResolvedValue(
      MOCK_CREATED_LOCATION,
    );

    const { result } = renderHook(() => useLocationMutations(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.createLocation.mutate({ name: 'Test Spot' });
    });

    expect(locationRepository.createLocation).toHaveBeenCalledWith({
      name: 'Test Spot',
    });
  });
});
