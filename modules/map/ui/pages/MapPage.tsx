'use client';

import { MoodMatchInput } from '@/modules/mood-matching/core/models/moodMatch';
import {
  pageTransition,
  springPresets,
} from '@/shared/hooks/useAnimationPresets';
import { MoodCategory } from '@/shared/types';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_MAP_FLAGS, MapFeatureFlags } from '../../core/models/mapFlags';
import { MapMarkerData } from '../../core/models/mapMarker';
import AddLocationCard from '../components/AddLocationCard/AddLocationCard';
import MapControls from '../components/MapControls';
import MapFallback from '../components/MapFallback';
import SelectedLocationCard from '../components/SelectedLocationCard';
import { useUserLocation } from '../hooks/useUserLocation';

/**
 * MapView loaded dynamically to avoid SSR issues with MapLibre GL.
 * `ssr: false` is required because MapLibre accesses `window` and `document`.
 */
const MapView = dynamic(() => import('../components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-glass border-t-primary" />
    </div>
  ),
});

const UserLocationDot = dynamic(() => import('../components/UserLocationDot'), {
  ssr: false,
});

/** MoodInputPanel loaded dynamically — avoids pulling framer-motion into the initial map bundle */
const MoodInputPanel = dynamic(
  () => import('@/modules/mood-matching/ui/components/MoodInputPanel'),
  { ssr: false },
);

/**
 * Props for the MapPage component.
 * Flags are injected from the routing shell — enabling full server-side flag resolution.
 */
/** Mood search query forwarded from the /mood page */
export interface MoodQuery {
  inputType: 'text' | 'emoji';
  text?: string;
  emoji?: string[];
}

export interface MapPageProps {
  /** Active map feature flags (defaults applied if not provided) */
  flags?: Partial<MapFeatureFlags>;
  /** Currently active mood (from mood-matching module) */
  activeMood?: MoodCategory | null;
  /**
   * A location to deep-link into — the map will fly here on load
   * and pre-open its SelectedLocationCard.
   * Set by the routing shell when navigating from Discovery.
   */
  initialSelectedMarker?: MapMarkerData | null;
  /**
   * Mood search query forwarded from /mood.
   * When present, MapPage calls the mood-match API and shows results as markers.
   */
  moodQuery?: MoodQuery | null;
}

/**
 * MapPage is the main smart component for the Map feature.
 * Orchestrates:
 * - Full-viewport interactive map (Story 1)
 * - Mood-adaptive style theming (Story 10)
 * - MapControls panel (Stories 3, 7, 9)
 * - UserLocationDot GPS marker (Story 3)
 * - SelectedLocationCard bottom sheet (Stories 4, 5)
 * - MapFallback list view when map_render_enabled = false (Story 1)
 *
 * @param props - MapPageProps
 * @returns Full-viewport map experience
 */
export default function MapPage({
  flags: flagOverrides,
  activeMood = null,
  initialSelectedMarker = null,
  moodQuery = null,
}: MapPageProps) {
  const flags: MapFeatureFlags = { ...DEFAULT_MAP_FLAGS, ...flagOverrides };
  const router = useRouter();

  const [selectedMarker, setSelectedMarker] = useState<MapMarkerData | null>(
    initialSelectedMarker,
  );

  /** Called when the creator edits their spot in SelectedLocationCard */
  const handleMarkerUpdate = useCallback((updated: MapMarkerData) => {
    setSelectedMarker(updated);
    // Also patch it in the mood markers list if it came from a mood search
    setMoodMarkers((prev) =>
      prev ? prev.map((m) => (m.id === updated.id ? { ...updated, state: m.state } : m)) : prev,
    );
  }, []);
  const [heatmapActive, setHeatmapActive] = useState(false);
  const [is3DActive, setIs3DActive] = useState(false);

  // ── Text search ─────────────────────────────────────────────────────────
  const [searchText, setSearchText]       = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMarkers, setSearchMarkers] = useState<MapMarkerData[] | null>(null);

  /** Debounced effect: fetch markers matching the search text */
  useEffect(() => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setSearchMarkers(null);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/map/markers?q=${encodeURIComponent(trimmed)}`);
        const data: MapMarkerData[] = await res.json();
        setSearchMarkers(data);
      } catch {
        // silently keep old markers
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  /** Mood-search results — override bounds-based markers when present */
  const [moodMarkers, setMoodMarkers] = useState<MapMarkerData[] | null>(null);
  const [moodLabel, setMoodLabel] = useState<{
    mood: string;
    count: number;
  } | null>(null);
  const [moodLoading, setMoodLoading] = useState(!!moodQuery);

  // Search results take priority over mood results; both override bounds markers
  const overrideMarkers = searchMarkers ?? moodMarkers ?? undefined;

  /** Whether the floating mood search panel is open */
  const [showMoodPanel, setShowMoodPanel] = useState(false);
  /** True while a user-initiated (in-map) mood search is in flight */
  const [isSearching, setIsSearching] = useState(false);

  /**
   * When moodQuery is present, call the mood-match API on mount
   * and convert results to MapMarkerData for the map.
   */
  useEffect(() => {
    if (!moodQuery) return;
    setMoodLoading(true);
    fetch('/api/mood-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(moodQuery),
    })
      .then((r) => r.json())
      .then((result) => {
        const markers: MapMarkerData[] = (result.locations ?? [])
          .filter(
            (l: { latitude: number | null; longitude: number | null }) =>
              l.latitude !== null && l.longitude !== null,
          )
          .map(
            (l: {
              id: string;
              name: string;
              mood_category: MoodCategory | null;
              tags: string[];
              longitude: number;
              latitude: number;
            }) => ({
              id: l.id,
              lngLat: [l.longitude, l.latitude] as [number, number],
              name: l.name,
              mood_category: l.mood_category,
              tags: l.tags,
              state: 'default' as const,
            }),
          );
        setMoodMarkers(markers);
        setMoodLabel({
          mood: result.detectedMood ?? '',
          count: markers.length,
        });
      })
      .catch(() => {
        /* silently fall back to bounds markers */
      })
      .finally(() => setMoodLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: run once on mount

  /**
   * Stable ref to the MapView's flyTo function.
   * Populated via the onReady callback once MapLibre loads.
   */
  const flyToRef = useRef<
    ((camera: { center: [number, number]; zoom: number }) => void) | null
  >(null);

  const {
    position: userPosition,
    status: locationStatus,
    requestLocation,
  } = useUserLocation();

  /**
   * Runs a mood search from within the map (floating panel).
   * Updates markers in-place without navigating away.
   * Also updates the URL so the result is shareable / reload-safe.
   */
  const searchMoodOnMap = useCallback(
    async (input: MoodMatchInput) => {
      setIsSearching(true);
      setShowMoodPanel(false);

      // Push query to URL for shareability
      const params = new URLSearchParams();
      if (input.inputType === 'text' && input.text) {
        params.set('q', input.text);
        params.set('type', 'text');
      } else if (input.inputType === 'emoji' && input.emoji?.length) {
        params.set('emoji', input.emoji.join(','));
        params.set('type', 'emoji');
      }
      router.replace(`/map?${params.toString()}`, { scroll: false });

      try {
        const res = await fetch('/api/mood-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const result = await res.json();
        const markers: MapMarkerData[] = (result.locations ?? [])
          .filter(
            (l: { latitude: number | null; longitude: number | null }) =>
              l.latitude !== null && l.longitude !== null,
          )
          .map(
            (l: {
              id: string;
              name: string;
              mood_category: MoodCategory | null;
              tags: string[];
              longitude: number;
              latitude: number;
            }) => ({
              id: l.id,
              lngLat: [l.longitude, l.latitude] as [number, number],
              name: l.name,
              mood_category: l.mood_category,
              tags: l.tags,
              state: 'default' as const,
            }),
          );
        setMoodMarkers(markers);
        setMoodLabel({
          mood: result.detectedMood ?? '',
          count: markers.length,
        });
      } catch {
        // silently keep existing markers
      } finally {
        setIsSearching(false);
      }
    },
    [router],
  );

  /**
   * Handles marker click — sets the selected marker for the bottom card.
   */
  const handleMarkerClick = useCallback((marker: MapMarkerData) => {
    setSelectedMarker(marker);
  }, []);

  /**
   * Dismisses the selected location card.
   */
  const handleDismissCard = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  /** [lng, lat] of a pending drop-pin (user clicked empty map space) */
  const [pendingPin, setPendingPin] = useState<[number, number] | null>(null);

  /**
   * Called when the user clicks empty map space.
   * Clears any selected location and sets a pending drop pin for the add-location form.
   */
  const handleMapClickCoords = useCallback((lngLat: [number, number]) => {
    setSelectedMarker(null);
    setPendingPin(lngLat);
  }, []);

  /**
   * Called after the user successfully saves a new location.
   * Adds it to the visible markers so it appears on map immediately.
   */
  const handleLocationSaved = useCallback((newMarker: MapMarkerData) => {
    setPendingPin(null);
    // Append to moodMarkers if in mood mode, otherwise add to override list
    setMoodMarkers((prev) => prev ? [...prev, newMarker] : [newMarker]);
    setSelectedMarker(newMarker);
  }, []);

  /**
   * Navigates to a full location detail page.
   * TODO: Wire to /locations/[id] route once that page exists.
   */
  const handleViewDetails = useCallback((marker: MapMarkerData) => {
    console.log('Navigate to location detail:', marker.id);
  }, []);

  /**
   * Called by MapView when MapLibre finishes loading.
   * If there's a deep-linked marker, fly to it now.
   */
  const handleMapReady = useCallback(
    (flyTo: (camera: { center: [number, number]; zoom: number }) => void) => {
      flyToRef.current = flyTo;
      if (initialSelectedMarker) {
        flyTo({
          center: initialSelectedMarker.lngLat,
          zoom: 15,
        });
      }
    },
    [initialSelectedMarker],
  );

  /**
   * Toggles the 3D pitch mode.
   * Pitch 60° = 3D angled view, 0° = flat 2D.
   */
  const handleToggle3D = useCallback(() => {
    setIs3DActive((prev) => !prev);
  }, []);

  /**
   * Toggles the heatmap overlay.
   */
  const handleToggleHeatmap = useCallback(() => {
    setHeatmapActive((prev) => !prev);
  }, []);

  // ── Fallback: map rendering is disabled ──────────────────────────────────
  if (!flags.map_render_enabled) {
    return (
      <motion.main className="min-h-screen bg-background" {...pageTransition}>
        <MapFallback markers={[]} onLocationClick={handleMarkerClick} />
      </motion.main>
    );
  }

  // ── Main map experience ───────────────────────────────────────────────────
  return (
    <main
      className="relative h-dvh w-full overflow-hidden bg-background"
      aria-label="Map view"
    >
      {/* Full-viewport map canvas */}
      <MapView
        flags={flags}
        activeMood={activeMood}
        initialCamera={{
          zoom: is3DActive ? 14 : 12,
          pitch: is3DActive ? 60 : 0,
          ...(initialSelectedMarker && {
            center: initialSelectedMarker.lngLat,
            zoom: 15,
          }),
        }}
        onMarkerClick={handleMarkerClick}
        onReady={handleMapReady}
        initialSelectedMarker={initialSelectedMarker}
        overrideMarkers={overrideMarkers}
        onMapClickCoords={handleMapClickCoords}
        pendingPinLngLat={pendingPin}
        className="absolute inset-0 z-0"
      />

      {/* Mood loading overlay — shown while mood-match API is in flight */}
      {moodLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 backdrop-blur-[6px]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-border-glass border-t-primary" />
            <p className="text-sm font-medium text-text-secondary">
              Finding spots for your mood…
            </p>
          </div>
        </div>
      )}

      {/* ── Mood search widget — collapsed = badge, expanded = input form ─── */}
      {!moodLoading && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springPresets.smooth}
          className="absolute left-1/2 top-4 z-30 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2"
          aria-label="Location search and mood widget"
        >
          <div className="overflow-hidden rounded-[20px] border border-border-glass bg-surface-glass shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-[20px]">
            {/* ── Text Search bar ── always visible ── */}
            <div className="flex items-center gap-2.5 border-b border-white/8 px-4 py-2.5">
              <span className="shrink-0 text-sm text-white/40">
                {searchLoading ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                ) : '🔍'}
              </span>
              <input
                id="map-text-search"
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by name, vibe, tags…"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-white/35 outline-none"
                aria-label="Search locations by text"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText('')}
                  className="shrink-0 text-xs text-white/30 transition-colors hover:text-white/60"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {/* Search result count badge */}
            {searchText.trim() && !searchLoading && searchMarkers !== null && (
              <div className="border-b border-white/5 px-4 py-1.5">
                <span className="text-[11px] text-white/40">
                  {searchMarkers.length === 0
                    ? 'No spots found'
                    : `${searchMarkers.length} spot${searchMarkers.length !== 1 ? 's' : ''} matching "${searchText.trim()}"`}
                </span>
              </div>
            )}
            {/* ── Collapsed pill header — always visible ── */}
            <button
              type="button"
              id="map-mood-search-toggle"
              onClick={() => setShowMoodPanel((v) => !v)}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
              aria-expanded={showMoodPanel}
              aria-controls="map-mood-panel"
            >
              {/* Left: emoji + label */}
              <span className="text-base" aria-hidden="true">
                {isSearching
                  ? null
                  : moodLabel
                    ? moodLabel.mood === 'calm'
                      ? '😌'
                      : moodLabel.mood === 'happy'
                        ? '😄'
                        : moodLabel.mood === 'energetic'
                          ? '⚡'
                          : moodLabel.mood === 'romantic'
                            ? '💕'
                            : moodLabel.mood === 'chill'
                              ? '😎'
                              : moodLabel.mood === 'excited'
                                ? '🔥'
                                : moodLabel.mood === 'sad'
                                  ? '😢'
                                  : '✨'
                    : '🎭'}
              </span>

              <div className="flex min-w-0 flex-1 items-center gap-2">
                {isSearching ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span className="text-xs font-medium text-text-secondary">
                      Searching…
                    </span>
                  </>
                ) : moodLabel ? (
                  <>
                    <span className="text-xs font-semibold capitalize text-text-primary">
                      {moodLabel.mood} mood
                    </span>
                    <span className="text-xs text-text-tertiary">·</span>
                    <span className="text-xs text-text-secondary">
                      {moodLabel.count} spot{moodLabel.count !== 1 ? 's' : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-text-primary">
                    Mood Search
                  </span>
                )}
              </div>

              {/* Right: chevron + optional dismiss */}
              <div className="flex shrink-0 items-center gap-1.5">
                {moodLabel && !showMoodPanel && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoodLabel(null);
                      setMoodMarkers(null);
                    }}
                    onKeyDown={(e) =>
                      e.key === 'Enter' &&
                      (e.stopPropagation(),
                      setMoodLabel(null),
                      setMoodMarkers(null))
                    }
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-text-tertiary transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Clear mood results"
                  >
                    ✕
                  </span>
                )}
                <motion.span
                  animate={{ rotate: showMoodPanel ? 180 : 0 }}
                  transition={springPresets.snappy}
                  className="text-[10px] text-text-tertiary"
                  aria-hidden="true"
                >
                  ▼
                </motion.span>
              </div>
            </button>

            {/* ── Expanded body: full input form ── */}
            <AnimatePresence>
              {showMoodPanel && (
                <motion.div
                  key="mood-panel"
                  id="map-mood-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={springPresets.smooth}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border-glass/50 px-4 pb-5 pt-4">
                    <MoodInputPanel
                      onSubmit={searchMoodOnMap}
                      isLoading={isSearching}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* User GPS dot */}
      {flags.user_location_enabled && locationStatus === 'success' && (
        <UserLocationDot map={null} position={userPosition} />
      )}

      {/* Floating control panel */}
      <MapControls
        heatmapActive={heatmapActive}
        is3DActive={is3DActive}
        locationStatus={locationStatus}
        flags={{
          user_location_enabled: flags.user_location_enabled,
          heatmap_enabled: flags.heatmap_enabled,
          map_3d_enabled: flags.map_3d_enabled,
        }}
        onToggleHeatmap={handleToggleHeatmap}
        onToggle3D={handleToggle3D}
        onLocateMe={requestLocation}
      />

      {/* Selected location bottom card */}
      <SelectedLocationCard
        marker={selectedMarker}
        onDismiss={handleDismissCard}
        onUpdate={handleMarkerUpdate}
        onViewDetails={handleViewDetails}
      />

      {/* Add location card — appears when user clicks empty map space */}
      <AddLocationCard
        lngLat={pendingPin}
        onDismiss={() => setPendingPin(null)}
        onSaved={handleLocationSaved}
      />
    </main>
  );
}
