'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Location } from '../../../core/models/location';
import TagPill from '@/shared/components/atoms/TagPill';
import GlassCard from '@/shared/components/atoms/GlassCard';

/**
 * Mood → accent color mapping for tag pills.
 * Source: rules/design.md §2.3
 */
const MOOD_COLORS: Record<string, string> = {
  calm: '#38BDF8',
  sad: '#64748B',
  happy: '#FACC15',
  romantic: '#FB7185',
  energetic: '#22C55E',
  chill: '#A78BFA',
  excited: '#FB923C',
};

/**
 * Props for the LocationCard component.
 */
interface LocationCardProps {
  /** The location data to display */
  location: Location;
  /** Callback when the card is clicked */
  onClick?: (location: Location) => void;
  /** Animation index for staggered list entrance */
  index?: number;
}

/**
 * LocationCard renders a glassmorphic bento card for a single location.
 * Includes image, name, tags (mood-colored pills), description, and
 * visibility badge.
 *
 * Source: rules/design.md §5.2 (Location Cards)
 * - Glassmorphic background with backdrop blur
 * - Hover lift (translateY(-4px)) + electric blue shadow glow
 * - Active press down (scale(0.98)) for tactile feedback
 * - Staggered entrance animation
 *
 * @param props - LocationCard props
 * @returns The location card component
 */
export default function LocationCard({
  location,
  onClick,
  index = 0,
}: LocationCardProps) {
  /** Determine accent color from mood category */
  const accentColor = location.mood_category
    ? MOOD_COLORS[location.mood_category]
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        delay: index * 0.05,
      }}
    >
      <GlassCard
        className="flex cursor-pointer flex-col overflow-hidden"
        onClick={() => onClick?.(location)}
        role="button"
        tabIndex={0}
        aria-label={`View ${location.name}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(location);
          }
        }}
      >
        {location.image_url && (
          <div
            className="h-40 w-full rounded-t-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${location.image_url})` }}
          />
        )}

        <div className="flex flex-col gap-2 p-4">
          <h3 className="text-base font-semibold leading-tight text-text-primary">
            {location.name}
          </h3>

          {location.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {location.tags.map((tag) => (
                <TagPill key={tag.name} accentColor={accentColor}>
                  {tag.name}
                </TagPill>
              ))}
            </div>
          )}

          {location.description && (
            <p className="line-clamp-2 text-sm leading-normal text-text-secondary">
              {location.description}
            </p>
          )}

          {location.is_public && (
            <span className="inline-flex w-fit rounded-pill bg-mood-energetic/10 px-2 py-0.5 text-[11px] text-mood-energetic">
              Public
            </span>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
