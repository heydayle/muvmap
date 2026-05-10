'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';

/**
 * Button variant type — determines visual style.
 */
type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/**
 * Props for the Button component.
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Child content */
  children: React.ReactNode;
}

/**
 * Variant class map following rules/design.md §5.1 button specs.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'bg-gradient-to-br from-primary to-primary-light text-white',
    'hover:-translate-y-px hover:shadow-glow',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none',
  ].join(' '),
  secondary: [
    'bg-transparent text-primary border border-primary',
    'hover:bg-primary/10 hover:-translate-y-px hover:shadow-[0_0_12px_rgba(0,123,255,0.15)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-text-secondary border-none',
    'hover:bg-white/5',
  ].join(' '),
};

/**
 * Multi-variant button with spring-physics press feedback.
 * Source: rules/design.md §5.1 (Buttons)
 *
 * @param props - Button props
 * @returns Button component
 */
export default function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-[14px] px-6 py-3 font-primary text-sm font-medium',
        'cursor-pointer transition-transform duration-150',
        'active:scale-[0.97]',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
