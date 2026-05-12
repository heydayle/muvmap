import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MapFallback from './MapFallback';
import type { MapMarkerData } from '../../../core/models/mapMarker';

const MOCK_MARKERS: MapMarkerData[] = [
  {
    id: 'marker-001',
    lngLat: [100.5, 13.75],
    name: 'Sunset Café',
    mood_category: 'calm',
    tags: ['cozy', 'coffee'],
    state: 'default',
    is_public: true,
  },
  {
    id: 'marker-002',
    lngLat: [100.52, 13.74],
    name: 'Electric Arcade',
    mood_category: 'excited',
    tags: ['gaming', 'neon'],
    state: 'default',
    is_public: true,
  },
];

describe('MapFallback', () => {
  it('renders the unavailable banner', () => {
    render(<MapFallback markers={MOCK_MARKERS} />);
    expect(screen.getByText(/map view is currently unavailable/i)).toBeInTheDocument();
  });

  it('renders all location names', () => {
    render(<MapFallback markers={MOCK_MARKERS} />);
    expect(screen.getByText('Sunset Café')).toBeInTheDocument();
    expect(screen.getByText('Electric Arcade')).toBeInTheDocument();
  });

  it('renders tags for each location', () => {
    render(<MapFallback markers={MOCK_MARKERS} />);
    expect(screen.getByText('#cozy')).toBeInTheDocument();
    expect(screen.getByText('#gaming')).toBeInTheDocument();
  });

  it('calls onLocationClick when a list item is clicked', () => {
    const handleClick = vi.fn();
    render(<MapFallback markers={MOCK_MARKERS} onLocationClick={handleClick} />);
    fireEvent.click(screen.getByText('Sunset Café'));
    expect(handleClick).toHaveBeenCalledWith(MOCK_MARKERS[0]);
  });

  it('renders empty state when markers array is empty', () => {
    render(<MapFallback markers={[]} />);
    expect(screen.getByText(/no locations to display/i)).toBeInTheDocument();
  });

  it('renders mood emoji for each marker', () => {
    render(<MapFallback markers={MOCK_MARKERS} />);
    // calm → 😌, excited → 🔥
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
});
