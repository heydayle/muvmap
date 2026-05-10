'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';

/**
 * Props for the TagPill component.
 */
interface TagPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Mood accent color (hex) — sets dynamic pill coloring */
  accentColor?: string;
  /** Child content (tag name) */
  children: React.ReactNode;
}

/**
 * Pill-shaped tag badge with mood-accent colors.
 * Source: rules/design.md §5.4
 *
 * @param props - TagPill props
 * @returns Tag pill component
 */
export default function TagPill({
  accentColor,
  className,
  children,
  ...props
}: TagPillProps) {
  const bgColor = accentColor
    ? `${accentColor}26`
    : 'rgba(0, 123, 255, 0.15)';
  const hoverBgColor = accentColor
    ? `${accentColor}40`
    : 'rgba(0, 123, 255, 0.25)';
  const textColor = accentColor || 'var(--color-primary-light)';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-3 py-1 text-xs font-medium',
        'transition-all duration-150',
        className,
      )}
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLSpanElement).style.backgroundColor =
          hoverBgColor;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLSpanElement).style.backgroundColor = bgColor;
      }}
      {...props}
    >
      {children}
    </span>
  );
}
