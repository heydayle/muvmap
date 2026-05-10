'use client';

import React from 'react';
import { cn } from '@/shared/utils/cn';

/**
 * Props for the Skeleton component.
 */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton (CSS value) */
  width?: string;
  /** Height of the skeleton (CSS value) */
  height?: string;
}

/**
 * Animated skeleton placeholder (replaces spinners).
 * Source: rules/design.md §5.5
 *
 * @param props - Skeleton props
 * @returns Skeleton loader component
 */
export default function Skeleton({
  width = '100%',
  height = '20px',
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-skeleton-shimmer rounded-sm',
        'bg-gradient-to-r from-white/[0.04] via-white/[0.08] to-white/[0.04]',
        'bg-[length:200%_100%]',
        className,
      )}
      style={{ width, height }}
      {...props}
    />
  );
}
