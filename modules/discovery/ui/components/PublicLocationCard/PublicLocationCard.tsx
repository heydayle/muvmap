'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicLocation } from '../../core/models/publicLocation';
import { cn } from '@/shared/utils/cn';
import { ensureSession } from '@/shared/utils/ensureSession';

/** Mood → accent color token map */
const MOOD_COLORS: Record<string, string> = {
  calm:     'text-sky-300 bg-sky-500/15 border-sky-500/25',
  happy:    'text-yellow-300 bg-yellow-400/15 border-yellow-400/25',
  chill:    'text-violet-300 bg-violet-500/15 border-violet-500/25',
  excited:  'text-orange-300 bg-orange-400/15 border-orange-400/25',
  energetic:'text-green-300 bg-green-500/15 border-green-500/25',
  romantic: 'text-pink-300 bg-pink-500/15 border-pink-500/25',
  sad:      'text-slate-300 bg-slate-500/15 border-slate-500/25',
};

const MOOD_HEX: Record<string, string> = {
  calm: '#38BDF8', happy: '#FACC15', chill: '#A78BFA',
  excited: '#FB923C', energetic: '#22C55E', romantic: '#FB7185', sad: '#64748B',
};

const MOOD_EMOJI: Record<string, string> = {
  calm: '😌', happy: '😄', chill: '🧘',
  excited: '🔥', energetic: '⚡', romantic: '💕', sad: '😢',
};

/** Stagger animation for card entrance */
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 200, damping: 25, delay: i * 0.05 },
  }),
};

/**
 * Props for the PublicLocationCard component.
 */
export interface PublicLocationCardProps {
  /** The public location data to render */
  location: PublicLocation;
  /** Called when the card body is clicked — passes the full location */
  onClick?: (location: PublicLocation) => void;
  /** Stagger index for entrance animation */
  index?: number;
  /** Whether this card is a feature card (spans 2 columns) */
  featured?: boolean;
}

/**
 * PublicLocationCard renders a glassmorphic card for a community-shared location.
 * Includes author info, mood badge, tags, like button with optimistic UI, and hover lift.
 *
 * Like state is fully self-contained: the card manages its own optimistic toggle
 * and syncs with POST /api/discovery/likes/:id.
 */
export default function PublicLocationCard({
  location,
  onClick,
  index = 0,
  featured = false,
}: PublicLocationCardProps) {
  const moodColor = location.mood_category ? MOOD_COLORS[location.mood_category] : '';
  const moodEmoji = location.mood_category ? MOOD_EMOJI[location.mood_category] : '📍';
  const accentHex = location.mood_category ? (MOOD_HEX[location.mood_category] ?? '#fff') : '#fff';

  // ── Like state (optimistic) ─────────────────────────────────────────────────
  const [liked, setLiked]         = useState(location.is_liked ?? false);
  const [likeCount, setLikeCount] = useState(location.like_count);
  const [liking, setLiking]       = useState(false);

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger card click → map navigation
    if (liking) return;

    // Optimistic update
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    setLiking(true);

    try {
      // Ensure anonymous session so the server can attribute the like
      await ensureSession();

      const res = await fetch(`/api/discovery/likes/${location.id}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const { liked: serverLiked, like_count: serverCount } = await res.json();
      // Sync with server truth
      setLiked(serverLiked);
      setLikeCount(serverCount);
    } catch {
      // Revert on failure
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    } finally {
      setLiking(false);
    }
  }, [liked, liking, location.id]);

  return (
    <motion.article
      role="article"
      aria-label={location.name}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 30 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(location)}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-3 rounded-[20px] border border-border-glass',
        'bg-surface-glass p-5 backdrop-blur-[16px]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.25)] transition-shadow duration-300',
        'hover:border-white/15 hover:shadow-[0_12px_48px_rgba(0,0,0,0.35)]',
        featured && 'md:col-span-2',
      )}
    >
      {/* Accent top line (mood color) */}
      {location.mood_category && (
        <div
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-[20px]"
          style={{ background: `linear-gradient(90deg, ${accentHex}, ${accentHex}33)` }}
        />
      )}

      {/* Mood badge */}
      {location.mood_category && (
        <span
          className={cn(
            'absolute right-4 top-4 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
            moodColor,
          )}
        >
          {moodEmoji} {location.mood_category}
        </span>
      )}

      {/* Location name */}
      <h3 className="pr-20 text-base font-semibold leading-tight text-white">
        {location.name}
      </h3>

      {/* Description */}
      {location.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-text-secondary">
          {location.description}
        </p>
      )}

      {/* Tags */}
      {location.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {location.tags.slice(0, 4).map((tag) => (
            <span
              key={tag.name}
              className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium border opacity-80', moodColor)}
            >
              #{tag.name}
            </span>
          ))}
          {location.tags.length > 4 && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] text-text-tertiary">
              +{location.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer: author + engagement */}
      <div className="mt-auto flex items-center justify-between pt-1">
        {/* Author */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
            {location.author.handle.replace('@', '').charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-text-tertiary">{location.author.handle}</span>
        </div>

        {/* Like button + view count */}
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          {/* Like button — stops propagation, full optimistic UI */}
          <motion.button
            type="button"
            onClick={handleLike}
            disabled={liking}
            whileTap={!liking ? { scale: 1.3 } : {}}
            aria-label={liked ? 'Unlike this spot' : 'Like this spot'}
            aria-pressed={liked}
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 transition-all',
              'border disabled:cursor-not-allowed',
              liked
                ? 'border-pink-500/40 bg-pink-500/15 text-pink-300'
                : 'border-transparent hover:border-white/15 hover:bg-white/8',
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={liked ? 'liked' : 'unliked'}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                aria-hidden="true"
              >
                {liked ? '❤️' : '🤍'}
              </motion.span>
            </AnimatePresence>
            <span className="tabular-nums">{likeCount}</span>
          </motion.button>

          {/* View count */}
          <span className="flex items-center gap-1">
            <span aria-hidden="true">👁️</span>
            {location.view_count}
          </span>
        </div>
      </div>
    </motion.article>
  );
}
