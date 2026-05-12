import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './HomePage';
import { APP_NAME } from '@/shared/constants/app';

describe('HomePage', () => {
  it('renders the heading', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(APP_NAME);
  });

  it('renders the status badge', () => {
    render(<HomePage />);
    expect(screen.getByText(/phase 0/i)).toBeInTheDocument();
  });

  it('renders the subtitle text', () => {
    render(<HomePage />);
    expect(screen.getByText(/ai-powered location discovery/i)).toBeInTheDocument();
  });

  it('renders the "Match My Mood" CTA link', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /match my mood/i })).toBeInTheDocument();
  });
});
