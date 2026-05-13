import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { MoodCategory } from '@/shared/types';
import LocationListPage from './LocationListPage';
import { locationRepository } from '../../infras/locationApi';

/** Mock the infrastructure layer — unit tests must not hit the network. */
vi.mock('../../infras/locationApi', () => ({
  locationRepository: {
    getLocations: vi.fn(),
    createLocation: vi.fn(),
    updateLocation: vi.fn(),
    deleteLocation: vi.fn(),
  },
}));

/**
 * LocationForm → MapPicker imports maplibre-gl/dist/maplibre-gl.css which
 * Vite can't resolve in jsdom. Stub it to a no-op div — the heading and
 * back button are rendered by LocationListPage itself, not LocationForm.
 */
vi.mock('../components/LocationForm', () => ({
  default: () => <div data-testid="location-form-stub" />,
}));

/** Creates a fresh QueryClient per test. */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const MOCK_PAGINATED_RESPONSE = {
  data: [
    {
      id: 'loc-1',
      name: 'Sunset Café',
      user_id: 'user-1',
      description: 'A beautiful rooftop café.',
      image_url: null,
      latitude: null,
      longitude: null,
      is_public: false,
      mood_category: 'calm' as MoodCategory,
      tags: [{ name: 'cozy', source: 'manual' as const }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  total: 1,
  page: 0,
  limit: 20,
  hasMore: false,
};

const EMPTY_PAGINATED_RESPONSE = {
  data: [],
  total: 0,
  page: 0,
  limit: 20,
  hasMore: false,
};

describe('LocationListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the "My Spots" heading in list view', () => {
    vi.mocked(locationRepository.getLocations).mockResolvedValue(
      EMPTY_PAGINATED_RESPONSE,
    );
    render(<LocationListPage />, { wrapper: createWrapper() });
    expect(screen.getByText('My Spots')).toBeInTheDocument();
  });

  it('shows the "+ Add Spot" button in list view', () => {
    vi.mocked(locationRepository.getLocations).mockResolvedValue(
      EMPTY_PAGINATED_RESPONSE,
    );
    render(<LocationListPage />, { wrapper: createWrapper() });
    expect(screen.getByRole('button', { name: /add spot/i })).toBeInTheDocument();
  });

  it('switches to create view when "+ Add Spot" is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(locationRepository.getLocations).mockResolvedValue(
      EMPTY_PAGINATED_RESPONSE,
    );
    render(<LocationListPage />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /add spot/i }));
    expect(screen.getByText('Add a New Spot')).toBeInTheDocument();
  });

  it('switches back to list view when "← Back" is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(locationRepository.getLocations).mockResolvedValue(
      EMPTY_PAGINATED_RESPONSE,
    );
    render(<LocationListPage />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /add spot/i }));
    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('My Spots')).toBeInTheDocument();
  });

  it('renders location cards after data loads', async () => {
    vi.mocked(locationRepository.getLocations).mockResolvedValue(
      MOCK_PAGINATED_RESPONSE,
    );
    render(<LocationListPage />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText('Sunset Café')).toBeInTheDocument(),
    );
  });

  it('shows empty state when no locations exist', async () => {
    vi.mocked(locationRepository.getLocations).mockResolvedValue(
      EMPTY_PAGINATED_RESPONSE,
    );
    render(<LocationListPage />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText(/no spots yet/i)).toBeInTheDocument(),
    );
  });

  it('shows error state on fetch failure', async () => {
    vi.mocked(locationRepository.getLocations).mockRejectedValue(
      new Error('Network error'),
    );
    render(<LocationListPage />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument(),
    );
  });
});
