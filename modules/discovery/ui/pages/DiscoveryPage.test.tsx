import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DiscoveryPage from './DiscoveryPage';
import * as discoveryApiModule from '../../infras/discoveryApi';
import type { PaginatedPublicLocations } from '../../core/models/publicLocation';
import type { TrendingLocation } from '../../core/models/publicLocation';

/** Mock framer-motion to avoid animation issues in test environment */
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <div {...props}>{children}</div>
      ),
      button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button {...props}>{children}</button>
      ),
      article: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <article {...props}>{children}</article>
      ),
      span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
        <span {...props}>{children}</span>
      ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

/** Minimal public location factory */
const makeMockFeedPage = (overrides: Partial<PaginatedPublicLocations> = {}): PaginatedPublicLocations => ({
  data: [
    {
      id: 'pub-test-001',
      user_id: 'user-001',
      name: 'Cozy Café Corner',
      description: 'Perfect chill spot.',
      image_url: null,
      latitude: 13.7,
      longitude: 100.5,
      is_public: true,
      mood_category: 'calm',
      tags: [{ name: 'cozy', source: 'manual' }],
      created_at: '2026-05-01T00:00:00Z',
      updated_at: '2026-05-01T00:00:00Z',
      author: { id: 'user-001', handle: '@chill_user', avatar_url: null },
      like_count: 42,
      view_count: 210,
    },
  ],
  total: 1,
  page: 0,
  limit: 20,
  hasMore: false,
  ...overrides,
});

const MOCK_TRENDING: TrendingLocation[] = [
  {
    id: 'trend-001',
    user_id: 'user-002',
    name: 'Hot Spot #1',
    description: 'The trendiest place.',
    image_url: null,
    latitude: 13.7,
    longitude: 100.5,
    is_public: true,
    mood_category: 'excited',
    tags: [{ name: 'popular', source: 'ai', confidence: 0.99 }],
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-01T00:00:00Z',
    author: { id: 'user-002', handle: '@hot_spot', avatar_url: null },
    like_count: 999,
    view_count: 5000,
    trending_score: 999,
    rank: 1,
  },
];

describe('DiscoveryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(discoveryApiModule.discoveryRepository, 'getPublicFeed').mockResolvedValue(
      makeMockFeedPage(),
    );
    vi.spyOn(discoveryApiModule.discoveryRepository, 'getTrending').mockResolvedValue(
      MOCK_TRENDING,
    );
  });

  it('renders the page heading', async () => {
    render(<DiscoveryPage />);
    expect(screen.getByRole('heading', { level: 1, name: /discover your vibe/i })).toBeInTheDocument();
  });

  it('shows trending section title', async () => {
    render(<DiscoveryPage />);
    expect(screen.getByText(/trending now/i)).toBeInTheDocument();
  });

  it('renders location cards after loading', async () => {
    render(<DiscoveryPage />);
    await waitFor(() => {
      expect(screen.getByText('Cozy Café Corner')).toBeInTheDocument();
    });
  });

  it('shows skeleton while loading', () => {
    render(<DiscoveryPage />);
    // Skeleton count: 6 card skeletons
    const feed = screen.getByRole('region', { name: /public location feed/i });
    expect(feed).toBeInTheDocument();
  });

  it('shows empty state when no results', async () => {
    vi.spyOn(discoveryApiModule.discoveryRepository, 'getPublicFeed').mockResolvedValue(
      makeMockFeedPage({ data: [], total: 0, hasMore: false }),
    );
    render(<DiscoveryPage />);
    await waitFor(() => {
      expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument();
    });
  });

  it('shows filtered empty state with clear button', async () => {
    vi.spyOn(discoveryApiModule.discoveryRepository, 'getPublicFeed').mockResolvedValue(
      makeMockFeedPage({ data: [], total: 0, hasMore: false }),
    );
    render(<DiscoveryPage />);
    // Click a mood pill
    const happyPill = screen.getByRole('button', { name: /happy/i });
    fireEvent.click(happyPill);

    await waitFor(() => {
      expect(screen.getByText(/no spots match this vibe/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('shows error state when feed fetch fails', async () => {
    vi.spyOn(discoveryApiModule.discoveryRepository, 'getPublicFeed').mockRejectedValue(
      new Error('API Error'),
    );
    render(<DiscoveryPage />);
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('filters cards by search query', async () => {
    render(<DiscoveryPage />);
    await waitFor(() => screen.getByText('Cozy Café Corner'));

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'xyz_nonexistent' } });

    await waitFor(() => {
      expect(screen.queryByText('Cozy Café Corner')).not.toBeInTheDocument();
    });
  });
});
