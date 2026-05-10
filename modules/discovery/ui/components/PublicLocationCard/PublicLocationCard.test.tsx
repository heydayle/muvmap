import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PublicLocationCard from './PublicLocationCard';
import type { PublicLocation } from '../../core/models/publicLocation';

/** Minimal mock location for testing */
const MOCK_LOCATION: PublicLocation = {
  id: 'pub-test-001',
  user_id: 'user-001',
  name: 'Sunset Rooftop',
  description: 'A stunning rooftop with city views.',
  image_url: null,
  latitude: 13.76,
  longitude: 100.52,
  is_public: true,
  mood_category: 'romantic',
  tags: [
    { name: 'rooftop', source: 'manual' },
    { name: 'sunset', source: 'ai', confidence: 0.95 },
  ],
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  author: { id: 'user-001', handle: '@test_user', avatar_url: null },
  like_count: 88,
  view_count: 412,
};

describe('PublicLocationCard', () => {
  it('renders the location name', () => {
    render(<PublicLocationCard location={MOCK_LOCATION} />);
    expect(screen.getByText('Sunset Rooftop')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<PublicLocationCard location={MOCK_LOCATION} />);
    expect(screen.getByText('A stunning rooftop with city views.')).toBeInTheDocument();
  });

  it('renders mood badge', () => {
    render(<PublicLocationCard location={MOCK_LOCATION} />);
    expect(screen.getByText(/romantic/i)).toBeInTheDocument();
  });

  it('renders all tags', () => {
    render(<PublicLocationCard location={MOCK_LOCATION} />);
    expect(screen.getByText(/#rooftop/i)).toBeInTheDocument();
    expect(screen.getByText(/#sunset/i)).toBeInTheDocument();
  });

  it('renders author handle', () => {
    render(<PublicLocationCard location={MOCK_LOCATION} />);
    expect(screen.getByText('@test_user')).toBeInTheDocument();
  });

  it('renders like and view counts', () => {
    render(<PublicLocationCard location={MOCK_LOCATION} />);
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('412')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const handleClick = vi.fn();
    render(<PublicLocationCard location={MOCK_LOCATION} onClick={handleClick} />);
    fireEvent.click(screen.getByRole('article'));
    expect(handleClick).toHaveBeenCalledWith(MOCK_LOCATION);
  });

  it('does not throw when onClick is not provided', () => {
    render(<PublicLocationCard location={MOCK_LOCATION} />);
    expect(() => fireEvent.click(screen.getByRole('article'))).not.toThrow();
  });

  it('truncates tags beyond 4 and shows overflow count', () => {
    const manyTags: PublicLocation = {
      ...MOCK_LOCATION,
      tags: [
        { name: 'tag1', source: 'manual' },
        { name: 'tag2', source: 'manual' },
        { name: 'tag3', source: 'manual' },
        { name: 'tag4', source: 'manual' },
        { name: 'tag5', source: 'manual' },
      ],
    };
    render(<PublicLocationCard location={manyTags} />);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
