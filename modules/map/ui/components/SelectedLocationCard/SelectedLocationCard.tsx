'use client';

import { useUser } from '@/shared/hooks/useUser';
import { useLocationGuard } from '@/shared/hooks/useLocationGuard';
import type { MoodCategory } from '@/shared/types';
import { cn } from '@/shared/utils/cn';
import { ensureSession } from '@/shared/utils/ensureSession';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  Check,
  ChevronDown,
  Heart,
  MessageSquare,
  Pencil,
  Send,
  Share2,
  Split,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { MapMarkerData } from '../../../core/models/mapMarker';

/** Mood → accent hex for top border and badge */
const MOOD_HEX: Record<string, string> = {
  calm: '#38BDF8',
  happy: '#FACC15',
  romantic: '#FB7185',
  energetic: '#22C55E',
  chill: '#A78BFA',
  excited: '#FB923C',
  sad: '#64748B',
};

const MOOD_EMOJI: Record<string, string> = {
  calm: '😌',
  happy: '😄',
  romantic: '💕',
  energetic: '⚡',
  chill: '🧘',
  excited: '🔥',
  sad: '😢',
};

const MOOD_OPTIONS: { value: MoodCategory; emoji: string; label: string }[] = [
  { value: 'calm', emoji: '😌', label: 'Calm' },
  { value: 'happy', emoji: '😄', label: 'Happy' },
  { value: 'energetic', emoji: '⚡', label: 'Energetic' },
  { value: 'romantic', emoji: '💕', label: 'Romantic' },
  { value: 'chill', emoji: '🧘', label: 'Chill' },
  { value: 'excited', emoji: '🔥', label: 'Excited' },
  { value: 'sad', emoji: '😢', label: 'Sad' },
];

const TAG_MAX_LEN = 24;

function normaliseTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/\s+/g, '-')
    .slice(0, TAG_MAX_LEN);
}

/** Friendly display of lat/lng */
function formatCoords(lngLat: [number, number]): string {
  const [lng, lat] = lngLat;
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

export interface SelectedLocationCardProps {
  marker: MapMarkerData | null;
  onDismiss: () => void;
  onUpdate?: (updated: MapMarkerData) => void;
  onViewDetails?: (marker: MapMarkerData) => void;
  /** Called after a confirmed save or unsave — useful for refreshing external lists */
  onSaveChange?: (locationId: string, saved: boolean) => void;
}

type ReviewState = 'idle' | 'open' | 'submitting' | 'submitted';
type EditState = 'idle' | 'editing' | 'saving' | 'saved';

/** Shape of a single review row from GET /api/reviews */
interface ReviewRow {
  id: string;
  rating: number;
  text: string | null;
  created_at: string;
  author_handle: string | null;
}

/** Relative time helper */
function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SelectedLocationCard({
  marker,
  onDismiss,
  onUpdate,
  onSaveChange,
}: SelectedLocationCardProps) {
  const { user } = useUser();
  const isCreator = !!(user && marker?.user_id && user.id === marker.user_id);

  // ── Review state ───────────────────────────────────────────────────────────
  const [reviewState, setReviewState] = useState<ReviewState>('idle');
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [editState, setEditState] = useState<EditState>('idle');
  const [editName, setEditName] = useState('');
  const [editMood, setEditMood] = useState<MoodCategory | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editError, setEditError] = useState('');
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);

  const accentColor = marker?.mood_category
    ? (MOOD_HEX[marker.mood_category] ?? '#fff')
    : '#fff';

  // ── Like state ─────────────────────────────────────────────────────────
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);

  // ── Save (bookmark) state ──────────────────────────────────────────────
  const [savedInList, setSavedInList] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { hasHitLimit, limitMessage } = useLocationGuard({ currentCount: savedCount });

  /** Fetch current like status whenever the opened marker changes */
  useEffect(() => {
    if (!marker?.id) return;
    setLiked(false);
    setLikeCount(0);
    let cancelled = false;
    fetch(`/api/discovery/likes/${marker.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setLiked(data.liked);
        setLikeCount(data.like_count);
      })
      .catch(() => {
        /* silently ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [marker?.id]);

  /** Fetch saved status + count whenever the opened marker changes */
  useEffect(() => {
    setSavedInList(false);
    setSavedCount(0);
    setSaveError('');
    if (!marker?.id) return;
    let cancelled = false;
    fetch(`/api/map/saved?location_id=${marker.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setSavedInList(data.saved);
        setSavedCount(data.saved_count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [marker?.id]);

  const handleLike = useCallback(async () => {
    if (!marker?.id || liking) return;
    // Optimistic update
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    setLiking(true);
    try {
      await ensureSession();
      const res = await fetch(`/api/discovery/likes/${marker.id}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { liked: serverLiked, like_count: serverCount } = await res.json();
      setLiked(serverLiked);
      setLikeCount(serverCount);
    } catch {
      // Revert on failure
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    } finally {
      setLiking(false);
    }
  }, [marker?.id, liked, liking]);

  /** Toggles save/unsave for the current location. */
  const handleSaveToggle = useCallback(async () => {
    if (!marker?.id || saving) return;
    setSaveError('');

    // Unsave path — always allowed regardless of limit
    if (savedInList) {
      const wasSaved = savedInList;
      setSavedInList(false);
      setSavedCount((c) => Math.max(0, c - 1));
      setSaving(true);
      try {
        await ensureSession();
        const res = await fetch('/api/map/saved', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location_id: marker.id }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSavedCount(data.saved_count ?? 0);
        onSaveChange?.(marker.id, false);
      } catch {
        // Revert on failure
        setSavedInList(wasSaved);
        setSavedCount((c) => c + 1);
        setSaveError('Failed to unsave. Please try again.');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Save path — block if limit hit
    if (hasHitLimit) {
      setSaveError(limitMessage);
      setTimeout(() => setSaveError(''), 6000);
      return;
    }

    // Optimistic save
    setSavedInList(true);
    setSavedCount((c) => c + 1);
    setSaving(true);
    try {
      await ensureSession();
      const res = await fetch('/api/map/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: marker.id }),
      });
      if (res.status === 429) {
        // Limit enforced by server
        const errData = await res.json().catch(() => ({}));
        setSavedInList(false);
        setSavedCount((c) => Math.max(0, c - 1));
        setSaveError(errData.message ?? limitMessage);
        setTimeout(() => setSaveError(''), 6000);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSavedCount(data.saved_count ?? 0);
      onSaveChange?.(marker.id, true);
    } catch {
      // Revert on failure
      setSavedInList(false);
      setSavedCount((c) => Math.max(0, c - 1));
      setSaveError('Failed to save. Please try again.');
      setTimeout(() => setSaveError(''), 4000);
    } finally {
      setSaving(false);
    }
  }, [marker?.id, savedInList, saving, hasHitLimit, limitMessage, onSaveChange]);

  // ── Reviews list state ────────────────────────────────────────────
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  /** Fetch reviews whenever the opened marker changes */
  useEffect(() => {
    if (!marker?.id) return;
    setReviews([]);
    setAvgRating(0);
    setShowReviews(false);
    setReviewsLoading(true);
    let cancelled = false;
    fetch(`/api/reviews?location_id=${marker.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setReviews(data.reviews ?? []);
        setAvgRating(data.average_rating ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [marker?.id]);

  // ── Start edit ────────────────────────────────────────────────────────────
  function openEdit() {
    if (!marker) return;
    setEditName(marker.name);
    setEditMood(marker.mood_category);
    setEditTags([...marker.tags]);
    setEditTagInput('');
    setEditNote(marker.creator_note ?? '');
    setEditError('');
    setEditState('editing');
  }

  function cancelEdit() {
    setEditState('idle');
    setEditError('');
  }

  // ── Tag helpers in edit mode ───────────────────────────────────────────────
  const commitEditTag = useCallback(() => {
    const tag = normaliseTag(editTagInput);
    if (!tag || editTags.includes(tag) || editTags.length >= 10) {
      setEditTagInput('');
      return;
    }
    setEditTags((prev) => [...prev, tag]);
    setEditTagInput('');
  }, [editTagInput, editTags]);

  // ── Save edit ─────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!marker || editState === 'saving') return;

    const finalName = editName.trim();
    if (finalName.length < 2) {
      setEditError('Name must be at least 2 characters');
      return;
    }

    setEditState('saving');
    setEditError('');

    const finalTags = editTagInput.trim()
      ? [...new Set([...editTags, normaliseTag(editTagInput)].filter(Boolean))]
      : editTags;

    try {
      const res = await fetch(`/api/map/locations/${marker.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          mood_category: editMood,
          tags: finalTags,
          creator_note: editNote.trim() || null,
        }),
      });

      if (res.status === 403) {
        setEditError('You are not the creator of this location.');
        setEditState('editing');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const updated: MapMarkerData = await res.json();
      setEditState('saved');
      onUpdate?.(updated);
      setTimeout(() => setEditState('idle'), 1500);
    } catch (err) {
      console.error('[SelectedLocationCard] Save failed:', err);
      setEditError('Failed to save. Please try again.');
      setEditState('editing');
    }
  }

  // ── Review submit ─────────────────────────────────────────────────────────
  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!marker || rating === 0) return;

    setReviewState('submitting' as ReviewState);

    // Ensure authenticated session (anonymous if guest) so RLS INSERT policy passes
    await ensureSession();

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: marker.id,
          rating,
          ...(reviewText.trim() ? { text: reviewText.trim() } : {}),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Prepend new review to the local list for instant feedback
      const newReview: ReviewRow = {
        id: `temp-${Date.now()}`,
        rating,
        text: reviewText.trim() || null,
        created_at: new Date().toISOString(),
        author_handle: null,
      };
      setReviews((prev) => [newReview, ...prev]);
      setAvgRating((prev) => {
        const newTotal = prev * reviews.length + rating;
        return newTotal / (reviews.length + 1);
      });
    } catch (err) {
      console.error('[SelectedLocationCard] Review submit failed:', err);
    }

    setReviewState('submitted');
    setTimeout(() => {
      setReviewState('idle');
      setRating(0);
      setReviewText('');
    }, 2500);
  }

  function handleDirections() {
    if (!marker) return;
    const [lng, lat] = marker.lngLat;
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(directionsUrl, '_blank', 'noopener,noreferrer');
  }

  if (!marker) return null;

  const editAccent = editMood ? (MOOD_HEX[editMood] ?? '#fff') : '#fff';

  const handleShareClick = (marker: MapMarkerData) => {
    if (marker.lngLat[0] === null || marker.lngLat[1] === null) return;

    const params = new URLSearchParams({
      id: marker.id,
      lat: String(marker.lngLat[1]),
      lng: String(marker.lngLat[0]),
      name: marker.name,
      mood: marker.mood_category ?? '',
      tags: marker.tags.join(','),
    });

    window.navigator.clipboard.writeText(
      `${window.location.origin}/map?${params.toString()}`,
    );
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        key={`loc-card-${marker.id}`}
        initial={{ y: '110%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '110%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className={cn(
          'absolute bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] -translate-x-1/2',
          'md:w-[400px]',
          'overflow-hidden rounded-[22px] border border-white/12 bg-black/65 backdrop-blur-[28px]',
          'shadow-[0_24px_64px_rgba(0,0,0,0.55)]',
        )}
        role="region"
        aria-label={`Location: ${marker.name}`}
      >
        {/* Accent top bar */}
        <div
          className="h-[3px] w-full"
          style={{
            background: `linear-gradient(90deg, ${accentColor}, ${accentColor}33)`,
          }}
        />

        <div className="p-5">
          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {marker.mood_category && (
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-xs">
                    {MOOD_EMOJI[marker.mood_category]}
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: accentColor }}
                  >
                    {marker.mood_category}
                  </span>
                </div>
              )}
              <h3 className="truncate text-base font-bold text-white">
                {marker.name}
              </h3>
              <p className="mt-0.5 font-mono text-[10px] text-white/40">
                {formatCoords(marker.lngLat)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              {/* Edit button — only shown to the creator */}
              {isCreator && editState === 'idle' && (
                <motion.button
                  onClick={openEdit}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  title="Edit your spot"
                  aria-label="Edit location"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-[13px] text-white/60 transition-all hover:border-white/40 hover:bg-white/10 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </motion.button>
              )}
              <button
                onClick={onDismiss}
                aria-label="Close location card"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/60 transition-all hover:border-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ── EDIT FORM ──────────────────────────────────────────────── */}
            {(editState === 'editing' || editState === 'saving') && (
              <motion.form
                key="edit-form"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                onSubmit={handleSave}
                className="space-y-3"
              >
                {/* Name */}
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-white/70">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={80}
                    required
                    className="w-full rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/35 outline-none transition-colors focus:border-white/35 focus:bg-white/15"
                  />
                </div>

                {/* Mood */}
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold text-white/70">
                    Vibe
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {MOOD_OPTIONS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() =>
                          setEditMood((prev) =>
                            prev === m.value ? null : m.value,
                          )
                        }
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all"
                        style={
                          editMood === m.value
                            ? {
                                background: `${MOOD_HEX[m.value]}33`,
                                color: MOOD_HEX[m.value],
                                border: `1px solid ${MOOD_HEX[m.value]}88`,
                              }
                            : {
                                background: 'rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.6)',
                                border: '1px solid rgba(255,255,255,0.15)',
                              }
                        }
                      >
                        {m.emoji} {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-white/70">
                    Tags
                  </p>
                  <div className="flex min-h-[38px] flex-wrap items-center gap-1 rounded-[10px] border border-white/15 bg-white/10 px-2.5 py-1.5 transition-all focus-within:border-white/35">
                    <AnimatePresence>
                      {editTags.map((tag, i) => (
                        <motion.span
                          key={tag}
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{
                            background: `${editAccent}28`,
                            color: editAccent,
                            border: `1px solid ${editAccent}55`,
                          }}
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() =>
                              setEditTags((t) =>
                                t.filter((_, idx) => idx !== i),
                              )
                            }
                            className="ml-0.5 flex h-3 w-3 items-center justify-center rounded-full text-[9px] opacity-70 hover:opacity-100"
                            style={{ background: `${editAccent}40` }}
                          >
                            <X className="h-2 w-2" />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                    {editTags.length < 10 && (
                      <input
                        value={editTagInput}
                        onChange={(e) => setEditTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            commitEditTag();
                          }
                          if (
                            e.key === 'Backspace' &&
                            !editTagInput &&
                            editTags.length > 0
                          )
                            setEditTags((t) => t.slice(0, -1));
                        }}
                        onBlur={() => editTagInput.trim() && commitEditTag()}
                        placeholder={
                          editTags.length === 0 ? 'cozy, rooftop…' : '+tag'
                        }
                        className="min-w-[60px] flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Creator note */}
                <div>
                  <p className="mb-1 text-[11px] font-semibold text-white/70">
                    Your thoughts
                  </p>
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder='"What makes this place special?"'
                    className="w-full resize-none rounded-[10px] border border-white/15 bg-white/10 px-3 py-2 text-sm italic text-white placeholder-white/30 outline-none transition-colors focus:border-white/35 focus:bg-white/15"
                  />
                </div>

                {editError && (
                  <p className="text-[11px] text-red-400">{editError}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={editState === 'saving'}
                    className="flex-1 rounded-[12px] border border-white/15 py-2 text-[13px] text-white/60 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    disabled={editState === 'saving'}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-2 text-[13px] font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: editAccent }}
                  >
                    {editState === 'saving' ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Saving…
                      </>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> Save changes
                      </span>
                    )}
                  </motion.button>
                </div>
              </motion.form>
            )}

            {/* ── SAVED CONFIRMATION ─────────────────────────────────────── */}
            {editState === 'saved' && (
              <motion.div
                key="edit-saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 py-4 text-sm font-semibold text-white"
              >
                <span>✅</span> Spot updated!
              </motion.div>
            )}

            {/* ── NORMAL VIEW ────────────────────────────────────────────── */}
            {editState === 'idle' && (
              <motion.div
                key="normal-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Tags */}
                {marker.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {marker.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{
                          background: `${accentColor}18`,
                          color: accentColor,
                          border: `1px solid ${accentColor}33`,
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Creator note */}
                {marker.creator_note && (
                  <div
                    className="mb-3 rounded-[12px] border p-3"
                    style={{
                      background: `${accentColor}10`,
                      borderColor: `${accentColor}30`,
                    }}
                  >
                    <p
                      className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: accentColor }}
                    >
                      <span>✦</span> Creator's note
                    </p>
                    <p className="text-[13px] italic leading-relaxed text-white/85">
                      "{marker.creator_note}"
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={handleDirections}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-white/15 py-2 text-[13px] font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
                  >
                    <Split className="h-4 w-4" />
                  </button>

                  {/* Like button */}
                  <motion.button
                    type="button"
                    onClick={handleLike}
                    disabled={liking}
                    whileTap={!liking ? { scale: 1.25 } : {}}
                    aria-label={liked ? 'Unlike this spot' : 'Like this spot'}
                    aria-pressed={liked}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-[12px] border px-3.5 py-2 text-[13px] font-semibold transition-all disabled:cursor-not-allowed',
                      liked
                        ? 'border-pink-500/40 bg-pink-500/15 text-pink-300'
                        : 'border-white/15 text-white/70 hover:border-white/30 hover:text-white',
                    )}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={liked ? 'liked' : 'unliked'}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 20,
                        }}
                        aria-hidden="true"
                        className="flex items-center justify-center"
                      >
                        <Heart
                          className={cn(
                            'h-4 w-4',
                            liked ? 'fill-current text-white' : '',
                          )}
                        />
                      </motion.span>
                    </AnimatePresence>
                    <span className="tabular-nums">{likeCount}</span>
                  </motion.button>

                  {/* Bookmark / Save button */}
                  <motion.button
                    type="button"
                    id="save-location-btn"
                    onClick={handleSaveToggle}
                    disabled={saving}
                    whileTap={!saving ? { scale: 1.2 } : {}}
                    aria-label={savedInList ? 'Remove from saved list' : 'Save to your list'}
                    aria-pressed={savedInList}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-[12px] border px-3.5 py-2 text-[13px] font-semibold transition-all disabled:cursor-not-allowed',
                      savedInList
                        ? 'border-violet-500/40 bg-violet-500/15 text-violet-300'
                        : 'border-white/15 text-white/70 hover:border-white/30 hover:text-white',
                    )}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={savedInList ? 'saved' : 'unsaved'}
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        aria-hidden="true"
                        className="flex items-center justify-center"
                      >
                        <Bookmark
                          className={cn('h-4 w-4', savedInList ? 'fill-current text-white' : '')}
                        />
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>

                  {/* Share button */}
                  <motion.button
                    type="button"
                    onClick={() => handleShareClick(marker)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-2 text-[13px] font-semibold transition-opacity',
                      shareSuccess ? 'opacity-100' : 'text-white opacity-90',
                    )}
                    style={{
                      background: shareSuccess
                        ? 'linear-gradient(135deg, #FF5E62, #FF9966)'
                        : accentColor,
                    }}
                  >
                    {shareSuccess ? (
                      <>
                        <Check className="h-4 w-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" /> Share
                      </>
                    )}
                  </motion.button>

                  {reviewState === 'idle' && (
                    <button
                      onClick={() => setReviewState('open')}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: accentColor }}
                    >
                      <MessageSquare className="h-4 w-4" /> Rate it
                    </button>
                  )}
                </div>

                {/* Save error / limit warning */}
                <AnimatePresence>
                  {saveError && (
                    <motion.div
                      key="save-error"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="mb-3 rounded-[10px] border border-amber-500/30 bg-amber-500/10 px-3 py-2"
                    >
                      <p className="text-[11px] leading-relaxed text-amber-300">
                        🗂️ {saveError}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Review UI ──────────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                  {(reviewState === 'open' || reviewState === 'submitting') && (
                    <motion.form
                      key="review-form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleReviewSubmit}
                      className="space-y-3 overflow-hidden"
                    >
                      <div className="h-px bg-white/10" />
                      <p className="text-[11px] font-semibold text-white/60">
                        Your vibe rating
                      </p>

                      {/* Stars */}
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="text-xl transition-transform hover:scale-110"
                            style={{
                              color:
                                star <= rating
                                  ? accentColor
                                  : 'rgba(255,255,255,0.2)',
                            }}
                            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="What was the vibe like? (optional)"
                        rows={2}
                        maxLength={500}
                        className="w-full resize-none rounded-[12px] border border-white/12 bg-white/8 px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/30"
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewState('idle');
                            setRating(0);
                            setReviewText('');
                          }}
                          className="flex-1 rounded-[14px] border border-white/15 py-2 text-[13px] text-white/60 transition-colors hover:text-white"
                        >
                          Cancel
                        </button>
                        <motion.button
                          type="submit"
                          disabled={
                            rating === 0 || reviewState === 'submitting'
                          }
                          whileHover={
                            rating > 0 && reviewState !== 'submitting'
                              ? { scale: 1.02 }
                              : {}
                          }
                          whileTap={
                            rating > 0 && reviewState !== 'submitting'
                              ? { scale: 0.97 }
                              : {}
                          }
                          className="flex flex-1 items-center justify-center gap-2 rounded-[14px] py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                          style={{
                            background:
                              rating > 0 ? accentColor : `${accentColor}44`,
                          }}
                        >
                          {reviewState === 'submitting' ? (
                            <>
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              Submitting…
                            </>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <Send className="h-3.5 w-3.5" /> Submit Review
                            </span>
                          )}
                        </motion.button>
                      </div>
                    </motion.form>
                  )}

                  {reviewState === 'submitted' && (
                    <motion.div
                      key="review-success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-2 flex flex-col items-center gap-1.5 rounded-[14px] py-4 text-center"
                      style={{
                        background: `${accentColor}18`,
                        border: `1px solid ${accentColor}33`,
                      }}
                    >
                      <Check className="h-6 w-6 text-green-400" />
                      <p className="mt-1 text-sm font-semibold text-white">
                        Review submitted!
                      </p>
                      <p className="text-[11px] text-white/50">
                        Thanks for sharing your vibe ✨
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Reviews list ── */}
                <div className="mt-1">
                  {/* Toggle button */}
                  <button
                    type="button"
                    onClick={() => setShowReviews((v) => !v)}
                    className="flex w-full items-center justify-between rounded-[12px] border border-white/10 px-3 py-2 text-[12px] transition-colors hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2 text-white/60">
                      {reviewsLoading ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
                      ) : (
                        <span aria-hidden="true">⭐</span>
                      )}
                      {reviewsLoading
                        ? 'Loading reviews…'
                        : reviews.length === 0
                          ? 'No reviews yet'
                          : `${reviews.length} review${reviews.length !== 1 ? 's' : ''}`}
                      {avgRating > 0 && !reviewsLoading && (
                        <span
                          className="ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                          style={{
                            background: `${accentColor}22`,
                            color: accentColor,
                          }}
                        >
                          {avgRating.toFixed(1)} avg
                        </span>
                      )}
                    </span>
                    <motion.span
                      animate={{ rotate: showReviews ? 180 : 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 30,
                      }}
                      className="text-[10px] text-white/30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </motion.span>
                  </button>

                  {/* Expanded reviews */}
                  <AnimatePresence>
                    {showReviews && reviews.length > 0 && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 35,
                        }}
                        className="mt-2 space-y-2 overflow-hidden"
                      >
                        {reviews.map((rev) => (
                          <motion.li
                            key={rev.id}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="rounded-[12px] border border-white/8 bg-white/5 px-3 py-2.5"
                          >
                            {/* Header: stars + author + time */}
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                {/* Star row */}
                                <span className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <span
                                      key={s}
                                      className="text-[11px]"
                                      style={{
                                        color:
                                          s <= rev.rating
                                            ? accentColor
                                            : 'rgba(255,255,255,0.15)',
                                      }}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </span>
                                {rev.author_handle && (
                                  <span className="text-[11px] text-white/40">
                                    {rev.author_handle}
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 text-[10px] text-white/25">
                                {timeAgo(rev.created_at)}
                              </span>
                            </div>
                            {/* Review text */}
                            {rev.text && (
                              <p className="text-[12px] italic leading-relaxed text-white/65">
                                "{rev.text}"
                              </p>
                            )}
                          </motion.li>
                        ))}
                      </motion.ul>
                    )}
                    {showReviews && reviews.length === 0 && !reviewsLoading && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="mt-2 text-center text-[12px] text-white/30"
                      >
                        Be the first to review this spot!
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
