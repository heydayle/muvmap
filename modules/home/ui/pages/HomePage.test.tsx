import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './HomePage';
import { APP_NAME } from '@/shared/constants/app';

// useRouter is used inside HomePage for navigation on submit
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// next/image requires a DOM environment — stub to a plain <img>
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));


describe('HomePage', () => {
  it('renders the app name heading', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(APP_NAME);
  });

  it('renders the subtitle text', () => {
    render(<HomePage />);
    expect(
      screen.getByText(/ai-powered location discovery/i),
    ).toBeInTheDocument();
  });

  it('renders the MoodInputPanel mode toggle buttons', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('button', { name: /switch to describe mood input/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /switch to emoji mood input/i }),
    ).toBeInTheDocument();
  });

  it('renders the mood submit button', () => {
    render(<HomePage />);
    expect(
      screen.getByRole('button', { name: /match my mood to nearby locations/i }),
    ).toBeInTheDocument();
  });
});
