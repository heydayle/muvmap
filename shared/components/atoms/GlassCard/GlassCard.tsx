'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';

/**
 * Props for the GlassCard component.
 */
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Child content */
  children: React.ReactNode;
}

/**
 * Glassmorphic card with frosted glass, depth, and blur.
 * Source: rules/design.md §4 Glassmorphism Cards
 *
 * @param props - GlassCard props
 * @returns Glassmorphic card component
 */
export default function GlassCard({
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border-glass bg-surface-glass shadow-card backdrop-blur-[16px]',
        'transition-transform duration-150',
        'hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_20px_rgba(0,123,255,0.1)]',
        'active:scale-[0.98]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
