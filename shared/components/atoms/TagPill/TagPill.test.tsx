import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TagPill from './TagPill';

describe('TagPill', () => {
  it('renders children text correctly', () => {
    render(<TagPill>calm</TagPill>);
    expect(screen.getByText('calm')).toBeInTheDocument();
  });

  it('renders as an inline span', () => {
    const { container } = render(<TagPill>tag</TagPill>);
    expect(container.firstChild?.nodeName).toBe('SPAN');
  });

  it('applies default primary accent color when no accentColor provided', () => {
    const { container } = render(<TagPill>tag</TagPill>);
    const pill = container.firstChild as HTMLElement;
    expect(pill.style.backgroundColor).toContain('rgba(0, 123, 255');
  });

  it('applies custom accentColor as background', () => {
    const { container } = render(<TagPill accentColor="#22c55e">energetic</TagPill>);
    const pill = container.firstChild as HTMLElement;
    // Background should include the hex color with alpha
    expect(pill.style.backgroundColor).toBeTruthy();
  });

  it('merges additional className via cn()', () => {
    const { container } = render(<TagPill className="extra">tag</TagPill>);
    expect((container.firstChild as HTMLElement).className).toContain('extra');
  });

  it('applies pill border-radius class', () => {
    const { container } = render(<TagPill>tag</TagPill>);
    expect((container.firstChild as HTMLElement).className).toContain('rounded-pill');
  });
});
