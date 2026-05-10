import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlassCard from './GlassCard';

describe('GlassCard', () => {
  it('renders children correctly', () => {
    render(<GlassCard>Card content</GlassCard>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies glassmorphic base classes', () => {
    const { container } = render(<GlassCard>Content</GlassCard>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-surface-glass');
    expect(card.className).toContain('border-border-glass');
    expect(card.className).toContain('backdrop-blur-[16px]');
  });

  it('merges additional className via cn()', () => {
    const { container } = render(
      <GlassCard className="extra-class">Content</GlassCard>,
    );
    expect((container.firstChild as HTMLElement).className).toContain('extra-class');
  });

  it('forwards HTML div attributes', () => {
    const { container } = render(
      <GlassCard id="my-card" data-testid="glass-card">Content</GlassCard>,
    );
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveAttribute('id', 'my-card');
    expect(card).toHaveAttribute('data-testid', 'glass-card');
  });

  it('is a div element', () => {
    const { container } = render(<GlassCard>Content</GlassCard>);
    expect(container.firstChild?.nodeName).toBe('DIV');
  });
});
