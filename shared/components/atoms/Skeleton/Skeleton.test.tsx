import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Skeleton from './Skeleton';

describe('Skeleton', () => {
  it('renders a div element', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild?.nodeName).toBe('DIV');
  });

  it('applies default width and height via inline style', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('20px');
  });

  it('applies custom width and height', () => {
    const { container } = render(<Skeleton width="60%" height="48px" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('60%');
    expect(el.style.height).toBe('48px');
  });

  it('applies shimmer animation class', () => {
    const { container } = render(<Skeleton />);
    expect((container.firstChild as HTMLElement).className).toContain(
      'animate-skeleton-shimmer',
    );
  });

  it('applies rounded corner class', () => {
    const { container } = render(<Skeleton />);
    expect((container.firstChild as HTMLElement).className).toContain('rounded-sm');
  });

  it('merges additional className via cn()', () => {
    const { container } = render(<Skeleton className="mt-3" />);
    expect((container.firstChild as HTMLElement).className).toContain('mt-3');
  });
});
