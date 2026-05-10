'use client';

import {
  pageTransition,
  springPresets,
} from '@/shared/hooks/useAnimationPresets';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MoodMatchInput,
  MoodMatchedLocation,
} from '../../core/models/moodMatch';
import AiThinkingOverlay from '../components/AiThinkingOverlay';
import MoodInputPanel from '../components/MoodInputPanel';
import MoodMatchHero from '../components/MoodMatchHero';
import MoodResultCard from '../components/MoodResultCard';
import { useMoodMatch } from '../hooks/useMoodMatch';

/**
 * MoodMapPanel loaded dynamically to avoid SSR issues with MapLibre GL.
 * `ssr: false` is mandatory because MapLibre accesses `window` and `document`.
 */
const MoodMapPanel = dynamic(() => import('../components/MoodMapPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-[20px] border border-border-glass bg-surface">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-border-glass border-t-primary" />
    </div>
  ),
});

/**
 * MoodMatchPage — the primary smart component for the Mood Matching feature.
 *
 * Layout:
 * - Idle / Thinking / Error: single-column centered layout (max-w-3xl)
 * - Results: split-screen — left = scrollable input + result cards, right = inline map
 *   with ALL matched locations pinned. Clicking a card OR a map marker syncs
 *   the selected location in both panels and flies the map to that spot.
 *
 * Gated by: mood_matching_enabled (flag.md Story 1)
 *
 * @returns Mood match page JSX
 */
/** Props injected by the Server Component page shell */
export interface MoodMatchPageProps {
  /**
   * Initial URL search params passed down from `app/mood/page.tsx`.
   * Used to restore state on page reload: `?q=cozy+vibes&type=text`
   * or `?emoji=😌,🧘&type=emoji`.
   */
  initialSearchParams?: Record<string, string | string[] | undefined>;
}

export default function MoodMatchPage({ initialSearchParams = {} }: MoodMatchPageProps) {
  const router = useRouter();
  const { phase, result, errorMessage, submitMood, reset } = useMoodMatch();

  /**
   * Tracks which location is currently highlighted in both the list and the map.
   * Null = none selected (all markers in default state).
   */
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    null,
  );

  /**
   * Controls whether the input form is expanded or collapsed in the results header.
   * Collapsed by default so result cards get maximum vertical space.
   */
  const [inputExpanded, setInputExpanded] = useState(false);

  /** Scrollable list panel ref — used to scroll to the selected card */
  const listPanelRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const isResultsPhase =
    phase === 'results' && result && result.locations.length > 0;
  /** Separate loading flag safe to use inside the split-screen branch */
  const isSubmitting = phase === 'thinking' || phase === 'idle';

  /**
   * Selects a location and scrolls the card into view in the list panel.
   * Called from both card clicks and map marker clicks.
   *
   * @param locationId - ID of the location to select
   */
  const selectLocation = useCallback((locationId: string) => {
    setSelectedLocationId((prev) => (prev === locationId ? null : locationId));
    // Scroll the corresponding card into view in the left panel
    const el = cardRefs.current.get(locationId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  /**
   * Called when a card's "View on Map" button is tapped — navigates away
   * to the full /map page with deep-link params.
   *
   * @param location - The selected matched location
   */
  const handleOpenFullMap = useCallback(
    (location: MoodMatchedLocation) => {
      if (location.latitude === null || location.longitude === null) return;
      const params = new URLSearchParams({
        id: location.id,
        lat: String(location.latitude),
        lng: String(location.longitude),
        name: location.name,
        mood: location.mood_category ?? '',
        tags: location.tags.join(','),
      });
      router.push(`/map?${params.toString()}`);
    },
    [router],
  );

  /**
   * Handles card click — selects the location (highlights the map marker).
   * Separate from "View on Map" which navigates away.
   *
   * @param location - Clicked location
   */
  const handleCardClick = useCallback(
    (location: MoodMatchedLocation) => {
      selectLocation(location.id);
    },
    [selectLocation],
  );

  /**
   * Handles mood submission — redirects to /map with the query params.
   * The map page calls the mood-match API and shows results as pins.
   *
   * @param input - User's mood input (text or emoji)
   */
  const handleSubmit = useCallback(
    (input: MoodMatchInput) => {
      const params = new URLSearchParams();
      if (input.inputType === 'text' && input.text) {
        params.set('q', input.text);
        params.set('type', 'text');
      } else if (input.inputType === 'emoji' && input.emoji?.length) {
        params.set('emoji', input.emoji.join(','));
        params.set('type', 'emoji');
      }
      router.push(`/map?${params.toString()}`);
    },
    [router],
  );

  /** Resets everything back to idle and clears URL params */
  const handleReset = useCallback(() => {
    setSelectedLocationId(null);
    router.replace('/mood', { scroll: false });
    reset();
  }, [reset, router]);

  /**
   * On mount: if URL has ?q= or ?emoji=, auto-submit so the result list
   * is restored after a page reload or when following a shared link.
   * Runs only once — the empty dep array is intentional.
   */
  useEffect(() => {
    const q = typeof initialSearchParams.q === 'string' ? initialSearchParams.q : null;
    const emoji = typeof initialSearchParams.emoji === 'string' ? initialSearchParams.emoji : null;
    const type = typeof initialSearchParams.type === 'string' ? initialSearchParams.type : null;

    if (type === 'text' && q) {
      submitMood({ inputType: 'text', text: q });
    } else if (type === 'emoji' && emoji) {
      submitMood({ inputType: 'emoji', emoji: emoji.split(',') });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: run once on mount only

  // ── Split-screen layout (results phase) ─────────────────────────────────
  if (isResultsPhase) {
    return (
      <main
        className="flex h-dvh flex-col overflow-hidden bg-background lg:flex-row"
        aria-label="Mood match results"
      >
        {/* ── Left panel: input + result cards ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={springPresets.smooth}
          className="flex flex-col overflow-hidden lg:w-[420px] lg:shrink-0 xl:w-[460px]"
        >
          {/* ── Collapsed header ──────────────────────────────────────── */}
          <div className="shrink-0 border-b border-border-default bg-background/80 px-4 pb-3 pt-4 backdrop-blur-[12px] md:px-6">
            {/* Top row: title + actions */}
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center justify-end gap-2">
                {/* Toggle expand / collapse input */}
                <motion.button
                  type="button"
                  id="mood-toggle-input"
                  onClick={() => setInputExpanded((v) => !v)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springPresets.snappy}
                  className="flex items-center gap-1.5 rounded-[10px] border border-border-default bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
                  aria-expanded={inputExpanded}
                  aria-controls="mood-input-panel"
                >
                  <motion.span
                    animate={{ rotate: inputExpanded ? 180 : 0 }}
                    transition={springPresets.snappy}
                    aria-hidden="true"
                    className="text-[10px]"
                  >
                    ▼
                  </motion.span>
                  {inputExpanded ? 'Hide search' : '✏️ Edit mood'}
                </motion.button>

                {/* New search */}
                <motion.button
                  type="button"
                  id="mood-new-search"
                  onClick={handleReset}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springPresets.snappy}
                  className="rounded-[10px] border border-border-default bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
                  aria-label="Start a new mood search"
                >
                  🔄 New
                </motion.button>
              </div>
            </div>

            {/* Mini mood pill — always visible, shows current query summary */}
            <AnimatePresence mode="wait">
              {!inputExpanded && (
                <motion.button
                  key="mood-pill"
                  type="button"
                  onClick={() => setInputExpanded(true)}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={springPresets.snappy}
                  className="mt-2 flex w-full items-center gap-2 rounded-[12px] border border-primary/20 bg-primary/6 px-3 py-2 text-left"
                  aria-label="Click to edit mood search"
                >
                  <span className="text-base leading-none" aria-hidden="true">
                    {result.detectedMood === 'calm'
                      ? '😌'
                      : result.detectedMood === 'happy'
                        ? '😄'
                        : result.detectedMood === 'energetic'
                          ? '⚡'
                          : result.detectedMood === 'romantic'
                            ? '💕'
                            : result.detectedMood === 'chill'
                              ? '😎'
                              : result.detectedMood === 'excited'
                                ? '🔥'
                                : result.detectedMood === 'sad'
                                  ? '😢'
                                  : '✨'}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[11px] font-semibold capitalize text-primary">
                      {result.detectedMood} mood
                    </span>
                    <span className="truncate text-[10px] text-text-tertiary">
                      {result.locations.length} spot
                      {result.locations.length !== 1 ? 's' : ''} matched · tap
                      to edit
                    </span>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Collapsible full input panel */}
            <AnimatePresence>
              {inputExpanded && (
                <motion.div
                  key="mood-input-panel"
                  id="mood-input-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={springPresets.smooth}
                  className="overflow-hidden"
                >
                  <div className="pt-3">
                    <MoodInputPanel
                      onSubmit={handleSubmit}
                      isLoading={isSubmitting}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Scrollable result cards */}
          <div
            ref={listPanelRef}
            className="flex-1 overflow-y-auto px-4 py-4 md:px-6"
            aria-label="Matched locations list"
          >
            {/* Results count + status badges */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">
                {result.locations.length} spot
                {result.locations.length !== 1 ? 's' : ''} for your{' '}
                <span className="text-primary">{result.detectedMood}</span> mood
              </span>
              {result.fromFallback && (
                <span className="rounded-full border border-[#64748b]/30 bg-[#64748b]/10 px-2 py-0.5 text-[10px] font-medium text-[#64748b]">
                  ⚡ Quick Match
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {result.locations.map((loc, i) => (
                <div
                  key={loc.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(loc.id, el);
                    else cardRefs.current.delete(loc.id);
                  }}
                >
                  <MoodResultCard
                    location={loc}
                    index={i}
                    onViewMap={handleOpenFullMap}
                    onCardClick={handleCardClick}
                    isSelected={selectedLocationId === loc.id}
                    featured={i === 0}
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Right panel: inline map ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...springPresets.smooth, delay: 0.15 }}
          className="relative min-h-[300px] flex-1 overflow-hidden lg:min-h-0"
          aria-label="Map panel"
        >
          <MoodMapPanel
            locations={result.locations}
            selectedLocationId={selectedLocationId}
            detectedMood={result.detectedMood}
            onMarkerClick={selectLocation}
          />
        </motion.div>
      </main>
    );
  }

  // ── Single-column layout (idle / thinking / error) ──────────────────────
  return (
    <main className="min-h-screen bg-background">
      <motion.div {...pageTransition} className="mx-auto max-w-3xl">
        {/* Hero */}
        <MoodMatchHero detectedMood={result?.detectedMood ?? null} />

        {/* Input panel */}
        <section className="px-4 pb-6 md:px-8" aria-label="Mood input">
          <MoodInputPanel
            onSubmit={handleSubmit}
            isLoading={phase === 'thinking'}
          />
        </section>

        {/* Dynamic content area */}
        <section
          className="px-4 pb-16 md:px-8"
          aria-label="Mood matching results"
          aria-live="polite"
        >
          <AnimatePresence mode="wait">
            {/* AI Thinking */}
            {phase === 'thinking' && (
              <motion.div key="thinking" {...pageTransition}>
                <AiThinkingOverlay />
              </motion.div>
            )}

            {/* Empty results */}
            {phase === 'results' && result && result.locations.length === 0 && (
              <motion.div
                key="empty"
                {...pageTransition}
                className="flex flex-col items-center gap-3 py-16 text-center"
              >
                <span className="text-5xl" aria-hidden="true">
                  🌫️
                </span>
                <p className="text-sm text-text-secondary">
                  No spots found for this vibe. Try describing it differently!
                </p>
                <motion.button
                  type="button"
                  onClick={handleReset}
                  whileTap={{ scale: 0.97 }}
                  transition={springPresets.snappy}
                  className="mt-2 rounded-[12px] bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  Try Again
                </motion.button>
              </motion.div>
            )}

            {/* Error */}
            {phase === 'error' && (
              <motion.div
                key="error"
                {...pageTransition}
                className="flex flex-col items-center gap-4 py-16 text-center"
              >
                <motion.span
                  animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="text-5xl"
                  aria-hidden="true"
                >
                  ⚠️
                </motion.span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-text-primary">
                    Something went wrong
                  </p>
                  <p className="max-w-[280px] text-xs text-text-secondary">
                    {errorMessage}
                  </p>
                </div>
                <motion.button
                  type="button"
                  id="mood-retry"
                  onClick={handleReset}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springPresets.snappy}
                  className="rounded-[12px] border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/20"
                  aria-label="Try mood matching again"
                >
                  Try Again
                </motion.button>
              </motion.div>
            )}

            {/* Rate limited */}
            {phase === 'rate_limited' && (
              <motion.div
                key="rate-limited"
                {...pageTransition}
                className="flex flex-col items-center gap-4 py-16 text-center"
              >
                <span className="text-5xl" aria-hidden="true">
                  ⏱️
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-text-primary">
                    Slow down, speed racer!
                  </p>
                  <p className="max-w-[280px] text-xs text-text-secondary">
                    {errorMessage}
                  </p>
                </div>
                <motion.button
                  type="button"
                  id="mood-cooldown-reset"
                  onClick={handleReset}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springPresets.snappy}
                  className="rounded-[12px] border border-[#fb923c]/40 bg-[#fb923c]/10 px-5 py-2.5 text-sm font-medium text-[#fb923c] hover:bg-[#fb923c]/20"
                >
                  Got it 👍
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </motion.div>
    </main>
  );
}
