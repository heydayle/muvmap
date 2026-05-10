import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './HomePage';

describe('HomePage', () => {
  it('renders the MoodMap heading', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('MoodMap');
  });

  it('renders the status badge', () => {
    render(<HomePage />);
    expect(screen.getByText(/phase 0/i)).toBeInTheDocument();
  });

  it('renders the subtitle text', () => {
    render(<HomePage />);
    expect(screen.getByText(/ai-powered location discovery/i)).toBeInTheDocument();
  });

  it('renders the "Match My Mood" CTA button', () => {
    render(<HomePage />);
    expect(screen.getByRole('button', { name: /match my mood/i })).toBeInTheDocument();
  });
});
