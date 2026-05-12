'use client';

import { springPresets } from '@/shared/hooks/useAnimationPresets';
import { MoodCategory } from '@/shared/types';
import { cn } from '@/shared/utils/cn';
import { ensureSession } from '@/shared/utils/ensureSession';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import { MapMarkerData } from '../../../core/models/mapMarker';

const MOOD_OPTIONS: { value: MoodCategory; emoji: string; label: string }[] = [
  { value: 'calm', emoji: '😌', label: 'Calm' },
  { value: 'happy', emoji: '😄', label: 'Happy' },
  { value: 'energetic', emoji: '⚡', label: 'Energetic' },
  { value: 'romantic', emoji: '💕', label: 'Romantic' },
  { value: 'chill', emoji: '😎', label: 'Chill' },
  { value: 'excited', emoji: '🔥', label: 'Excited' },
  { value: 'sad', emoji: '😢', label: 'Sad' },
];

const MOOD_HEX: Record<MoodCategory, string> = {
  calm: '#38BDF8',
  happy: '#FACC15',
  energetic: '#22C55E',
  romantic: '#FB7185',
  chill: '#A78BFA',
  excited: '#FB923C',
  sad: '#64748B',
};

const MAX_TAGS = 10;
const TAG_MAX_LEN = 24;

function formatCoords(lngLat: [number, number]): string {
  const [lng, lat] = lngLat;
  return `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}°${lng >= 0 ? 'E' : 'W'}`;
}

function normaliseTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^#/, '')
    .replace(/\s+/g, '-')
    .slice(0, TAG_MAX_LEN);
}

export interface AddLocationCardProps {
  lngLat: [number, number] | null;
  onDismiss: () => void;
  onSaved: (marker: MapMarkerData) => void;
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export default function AddLocationCard({
  lngLat,
  onDismiss,
  onSaved,
}: AddLocationCardProps) {
  const [name, setName] = useState('');
  const [mood, setMood] = useState<MoodCategory | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [creatorNote, setCreatorNote] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const tagInputRef = useRef<HTMLInputElement>(null);

  const accentColor = mood ? MOOD_HEX[mood] : '#fff';
  const canSubmit = name.trim().length >= 2 && submitState === 'idle';

  const commitTag = useCallback(() => {
    const normalised = normaliseTag(tagInput);
    if (!normalised || tags.includes(normalised) || tags.length >= MAX_TAGS) {
      setTagInput('');
      return;
    }
    setTags((prev) => [...prev, normalised]);
    setTagInput('');
  }, [tagInput, tags]);

  const removeTag = useCallback((index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
    tagInputRef.current?.focus();
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
        e.preventDefault();
        commitTag();
      } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
        setTags((prev) => prev.slice(0, -1));
      }
    },
    [commitTag, tagInput, tags],
  );

  const handleTagBlur = useCallback(() => {
    if (tagInput.trim()) commitTag();
  }, [tagInput, commitTag]);

  const handleDismiss = useCallback(() => {
    setName('');
    setMood(null);
    setTags([]);
    setTagInput('');
    setCreatorNote('');
    setSubmitState('idle');
    onDismiss();
  }, [onDismiss]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!lngLat || !canSubmit) return;

      const finalTags = tagInput.trim()
        ? [...new Set([...tags, normaliseTag(tagInput)].filter(Boolean))]
        : tags;

      setSubmitState('loading');
      setErrorMsg('');

      // Ensure authenticated session (anonymous if guest) so RLS INSERT policy passes
      await ensureSession();

      try {
        const res = await fetch('/api/map/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            longitude: lngLat[0],
            latitude: lngLat[1],
            mood_category: mood,
            tags: finalTags,
            is_public: true,
            ...(creatorNote.trim() && { creator_note: creatorNote.trim() }),
          }),
        });

        if (!res.ok) throw new Error('Failed to save location');

        const saved = await res.json();
        setSubmitState('success');

        const newMarker: MapMarkerData = {
          id: saved.id,
          lngLat,
          name: saved.name,
          mood_category: saved.mood_category,
          tags: saved.tags,
          state: 'default',
          ...(saved.creator_note && { creator_note: saved.creator_note }),
        };

        setTimeout(() => {
          onSaved(newMarker);
          handleDismiss();
        }, 1800);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'Something went wrong',
        );
        setSubmitState('error');
        setTimeout(() => setSubmitState('idle'), 3000);
      }
    },
    [
      lngLat,
      name,
      mood,
      tags,
      tagInput,
      creatorNote,
      canSubmit,
      onSaved,
      handleDismiss,
    ],
  );

  /* ─── shared input classes ─── */
  const inputBase =
    'w-full rounded-[12px] border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/40 outline-none transition-colors focus:border-white/35 focus:bg-white/15';

  return (
    <AnimatePresence>
      {lngLat && (
        <motion.div
          key="add-location-card"
          initial={{ y: '110%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '110%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 32 }}
          className={cn(
            'absolute bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] -translate-x-1/2',
            'md:w-[420px]',
            'overflow-hidden rounded-[22px] border border-white/12 bg-black/60 backdrop-blur-[28px]',
            'shadow-[0_24px_64px_rgba(0,0,0,0.6)]',
          )}
          role="dialog"
          aria-label="Add new location"
        >
          {/* Accent top bar */}
          <div
            className="h-[3px] w-full transition-colors duration-300"
            style={{
              background: `linear-gradient(90deg, ${accentColor}, ${accentColor}33)`,
            }}
          />

          <div className="p-5">
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  📍 Add Location
                </h3>
                <p className="mt-0.5 font-mono text-[10px] text-white/50">
                  {formatCoords(lngLat)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/60 transition-all hover:border-white/40 hover:bg-white/10 hover:text-white"
                aria-label="Cancel"
              >
                ✕
              </button>
            </div>

            <AnimatePresence mode="wait">
              {submitState === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-2 py-6 text-center"
                >
                  <span className="text-4xl">🎉</span>
                  <p className="font-semibold text-white">Shared to the map!</p>
                  <p className="text-[11px] text-white/60">
                    Everyone can now discover{' '}
                    <span className="font-medium text-white">{name}</span>
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Name */}
                  <div>
                    <label
                      htmlFor="add-loc-name"
                      className="mb-1.5 block text-xs font-semibold text-white/80"
                    >
                      Location name <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="add-loc-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Hidden Rooftop Garden"
                      maxLength={80}
                      required
                      className={inputBase}
                    />
                  </div>

                  {/* Vibe */}
                  <div>
                    <p className="mb-2 text-xs font-semibold text-white/80">
                      Vibe
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {MOOD_OPTIONS.map((m) => (
                        <motion.button
                          key={m.value}
                          type="button"
                          onClick={() =>
                            setMood((prev) =>
                              prev === m.value ? null : m.value,
                            )
                          }
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.94 }}
                          transition={springPresets.snappy}
                          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all"
                          style={
                            mood === m.value
                              ? {
                                  background: `${MOOD_HEX[m.value]}33`,
                                  color: MOOD_HEX[m.value],
                                  border: `1px solid ${MOOD_HEX[m.value]}88`,
                                }
                              : {
                                  background: 'rgba(255,255,255,0.08)',
                                  color: 'rgba(255,255,255,0.65)',
                                  border: '1px solid rgba(255,255,255,0.15)',
                                }
                          }
                          aria-pressed={mood === m.value}
                        >
                          {m.emoji} {m.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Tag chip input */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label
                        htmlFor="add-loc-tags"
                        className="text-xs font-semibold text-white/80"
                      >
                        Tags
                      </label>
                      <span className="text-[10px] text-white/40">
                        Enter or , to add · {tags.length}/{MAX_TAGS}
                      </span>
                    </div>

                    <div
                      className="flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-[12px] border border-white/15 bg-white/10 px-2.5 py-2 transition-all focus-within:border-white/40 focus-within:bg-white/15"
                      onClick={() => tagInputRef.current?.focus()}
                      role="group"
                      aria-label="Tags"
                    >
                      <AnimatePresence>
                        {tags.map((tag, i) => (
                          <motion.span
                            key={tag}
                            layout
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={springPresets.snappy}
                            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              background: `${accentColor}28`,
                              color: accentColor,
                              border: `1px solid ${accentColor}55`,
                            }}
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTag(i);
                              }}
                              className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] opacity-80 transition-opacity hover:opacity-100"
                              style={{ background: `${accentColor}40` }}
                              aria-label={`Remove ${tag}`}
                            >
                              ✕
                            </button>
                          </motion.span>
                        ))}
                      </AnimatePresence>

                      {tags.length < MAX_TAGS && (
                        <input
                          ref={tagInputRef}
                          id="add-loc-tags"
                          type="text"
                          value={tagInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.endsWith(',')) {
                              setTagInput(val.slice(0, -1));
                              setTimeout(commitTag, 0);
                            } else {
                              setTagInput(val);
                            }
                          }}
                          onKeyDown={handleTagKeyDown}
                          onBlur={handleTagBlur}
                          placeholder={
                            tags.length === 0
                              ? 'cozy, coffee, rooftop…'
                              : '+tag'
                          }
                          maxLength={TAG_MAX_LEN + 1}
                          className="min-w-[80px] flex-1 bg-transparent text-sm text-white placeholder-white/35 outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* Creator's thought */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label
                        htmlFor="add-loc-note"
                        className="text-xs font-semibold text-white/80"
                      >
                        Your thoughts
                      </label>
                      <span className="text-[10px] text-white/40">
                        optional · {creatorNote.length}/500
                      </span>
                    </div>
                    <div
                      className="rounded-[12px] border border-white/15 bg-white/10 transition-all focus-within:border-white/40 focus-within:bg-white/15"
                      style={{
                        boxShadow: creatorNote.trim()
                          ? `inset 3px 0 0 ${accentColor}99`
                          : undefined,
                      }}
                    >
                      <textarea
                        id="add-loc-note"
                        value={creatorNote}
                        onChange={(e) => setCreatorNote(e.target.value)}
                        placeholder='"What makes this place special to you?"'
                        rows={3}
                        maxLength={500}
                        className="w-full resize-none bg-transparent px-3 py-2.5 text-sm italic text-white placeholder-white/35 outline-none"
                      />
                    </div>
                  </div>

                  {/* Error */}
                  {submitState === 'error' && errorMsg && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[11px] text-red-400"
                    >
                      {errorMsg}
                    </motion.p>
                  )}

                  {/* Divider */}
                  <div className="h-px bg-white/10" />

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={!canSubmit}
                    whileHover={canSubmit ? { y: -1 } : {}}
                    whileTap={canSubmit ? { scale: 0.97 } : {}}
                    transition={springPresets.snappy}
                    className="w-full rounded-[14px] py-3 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background: canSubmit
                        ? `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
                        : 'rgba(255,255,255,0.08)',
                      boxShadow: canSubmit
                        ? `0 4px 20px ${accentColor}44`
                        : 'none',
                    }}
                  >
                    {submitState === 'loading' ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Sharing…
                      </span>
                    ) : (
                      '📍 Share to Map'
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
