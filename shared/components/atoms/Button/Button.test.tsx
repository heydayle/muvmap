import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('from-primary');
    expect(btn.className).toContain('to-primary-light');
  });

  it('applies secondary variant classes when variant="secondary"', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-primary');
    expect(btn.className).toContain('border-primary');
  });

  it('applies ghost variant classes when variant="ghost"', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('text-text-secondary');
  });

  it('merges additional className via cn()', () => {
    render(<Button className="custom-class">Test</Button>);
    expect(screen.getByRole('button').className).toContain('custom-class');
  });

  it('calls onClick handler when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('forwards native button attributes', () => {
    render(<Button type="submit" aria-label="Submit form">Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('type', 'submit');
    expect(btn).toHaveAttribute('aria-label', 'Submit form');
  });
});
