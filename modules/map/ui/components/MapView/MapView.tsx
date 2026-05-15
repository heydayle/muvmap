'use client';

import { MoodCategory } from '@/shared/types';
import { cn } from '@/shared/utils/cn';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useState } from 'react';
import { MapCamera } from '../../../core/models/mapConfig';
import { MapFeatureFlags } from '../../../core/models/mapFlags';
import { MapMarkerData } from '../../../core/models/mapMarker';
import { resolveMapStyle } from '../../../core/usecases/resolveMapStyle';
import { mapRepository } from '../../../infras/mapApi';
import { useMap } from '../../hooks/useMap';
import { useMapMarkers } from '../../hooks/useMapMarkers';
import UserLocationDot from '../UserLocationDot';

/**
 * Props for the MapView component.
 */
export interface MapViewProps {
  /** Active map feature flags */
  flags: MapFeatureFlags;
  /** Currently active mood (for style theming) */
  activeMood: MoodCategory | null;
  /** Initial camera position */
  initialCamera?: Partial<MapCamera>;
  /** Called when a marker is clicked — passes the full marker data */
  onMarkerClick?: (marker: MapMarkerData) => void;
  /**
   * Called once MapLibre finishes loading.
   * Receives a flyTo function so the parent can trigger camera animations
   * (e.g. flying to a deep-linked location from Discovery).
   */
  onReady?: (
    flyTo: (camera: { center: [number, number]; zoom: number }) => void,
  ) => void;
  /**
   * A location deep-linked from Discovery. Always rendered as a selected pin
   * on the map regardless of viewport bounds.
   */
  initialSelectedMarker?: MapMarkerData | null;
  /**
   * When set, bypasses bounds-based marker fetching and renders these markers
   * directly. Used by MapPage when showing mood-matched results.
   */
  overrideMarkers?: MapMarkerData[];
  /**
   * Called when the user clicks on empty map space (not on a marker).
   * Receives the [longitude, latitude] of the click.
   */
  onMapClickCoords?: (lngLat: [number, number]) => void;
  /**
   * When set, renders a pulsing "pending" drop pin at this location.
   * Used while the add-location form is open.
   */
  pendingPinLngLat?: [number, number] | null;
  /** Additional CSS class names for the container */
  className?: string;
  /**
   * User's GPS position as [longitude, latitude].
   * When set and `flags.user_location_enabled` is true, renders a pulsing
   * blue dot on the map at this coordinate.
   */
  userPosition?: [number, number] | null;
}

/**
 * MapView is the core map canvas component.
 * Manages:
 * - MapLibre GL initialization (via useMap)
 * - Mood-adaptive style overlay (Story 10)
 * - Marker injection and interaction (via useMapMarkers)
 * - Marker data fetching on map move (bounds-scoped)
 *
 * @param props - MapViewProps
 * @returns Full-size map canvas with markers and mood overlay
 */
export default function MapView({
  flags,
  activeMood,
  initialCamera,
  onMarkerClick,
  onReady,
  overrideMarkers,
  initialSelectedMarker,
  onMapClickCoords,
  pendingPinLngLat,
  className,
  userPosition,
}: MapViewProps) {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [markers, setMarkers] = useState<MapMarkerData[]>([]);

  const { styleUrl, moodOverlayColor } = resolveMapStyle(
    activeMood,
    flags.map_mood_theme_enabled,
  );

  const { containerRef, mapRef, flyTo } = useMap({
    styleUrl,
    initialCamera,
    onLoad: () => {
      setMapLoaded(true);
      onReady?.(flyTo);
    },
  });

  /**
   * Resolved marker list:
   * - When overrideMarkers is set (mood-search mode): use those directly
   * - Otherwise: merge deep-linked marker with bounds-fetched markers
   */
  const resolvedMarkers: MapMarkerData[] = overrideMarkers
    ? overrideMarkers
    : initialSelectedMarker
      ? [
          { ...initialSelectedMarker, state: 'selected' },
          ...markers.filter((m) => m.id !== initialSelectedMarker.id),
        ]
      : markers;

  const { selectedMarkerId, setSelectedMarkerId } = useMapMarkers({
    mapRef,
    mapLoaded,
    markers: resolvedMarkers,
    animationsEnabled: flags.marker_animation_enabled,
    onMarkerClick: onMarkerClick ?? (() => {}),
  });

  /**
   * Fetches markers for the current visible bounds.
   * Called on map load and after every moveend event.
   */
  const fetchMarkersForBounds = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    try {
      const data = await mapRepository.getMarkersInBounds({
        sw: [bounds.getWest(), bounds.getSouth()],
        ne: [bounds.getEast(), bounds.getNorth()],
      });
      setMarkers(data);
    } catch {
      // Silently fail — markers are non-critical
    }
  }, [mapRef]);

  /** Register moveend listener when map loads — skipped in mood-search mode */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || overrideMarkers) return; // skip when markers are externally provided

    fetchMarkersForBounds();
    map.on('moveend', fetchMarkersForBounds);

    return () => {
      map.off('moveend', fetchMarkersForBounds);
    };
  }, [mapRef, mapLoaded, fetchMarkersForBounds, overrideMarkers]);

  /**
   * When mood-matched markers arrive, fit the map so ALL pins are visible.
   * Runs whenever mapLoaded OR overrideMarkers changes — whichever resolves
   * last (map load vs API response) will trigger the fit correctly.
   */
  useEffect(() => {
    if (!mapLoaded || !overrideMarkers || overrideMarkers.length === 0) return;
    const map = mapRef.current;
    if (!map) return;

    if (overrideMarkers.length === 1) {
      map.flyTo({ center: overrideMarkers[0].lngLat, zoom: 15, duration: 800 });
      return;
    }

    const lngs = overrideMarkers.map((m) => m.lngLat[0]);
    const lats = overrideMarkers.map((m) => m.lngLat[1]);
    map.fitBounds(
      [
        Math.min(...lngs),
        Math.min(...lats),
        Math.max(...lngs),
        Math.max(...lats),
      ],
      { padding: 80, maxZoom: 15, duration: 800 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, overrideMarkers]); // mapRef is a stable ref; flyTo excluded to prevent loop

  /** Map click: dismiss selected marker AND emit coordinates for add-location flow */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onMapClick = (e: { lngLat: { lng: number; lat: number } }) => {
      setSelectedMarkerId(null);
      onMapClickCoords?.([e.lngLat.lng, e.lngLat.lat]);
    };
    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRef, setSelectedMarkerId]); // onMapClickCoords excluded — stable callback ref

  /** Pending drop-pin marker — shown while the add-location form is open */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !pendingPinLngLat) return;

    const el = document.createElement('div');
    el.innerHTML = '📍';
    el.style.cssText = [
      'font-size:36px;',
      'filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5));',
      'cursor:default;',
    ].join('');

    // Inject keyframe once
    if (!document.getElementById('pin-drop-style')) {
      const style = document.createElement('style');
      style.id = 'pin-drop-style';
      style.textContent = `
        @keyframes pin-drop {
          0%   { transform: translateY(-40px) scale(0.5); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    let markerInstance: { remove(): void } | null = null;
    let mounted = true;

    // maplibre-gl is already in the bundle via useMap \u2014 import is near-instant
    import('maplibre-gl').then(({ Marker }) => {
      if (!mounted || !mapRef.current) return;
      markerInstance = new Marker({ element: el, anchor: 'center' })
        .setLngLat(pendingPinLngLat)
        .addTo(mapRef.current);
    });

    return () => {
      mounted = false;
      markerInstance?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, pendingPinLngLat]);

  /** Fly to the user's GPS position the first time it arrives */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !userPosition) return;
    map.flyTo({ center: userPosition, zoom: 15, duration: 1000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPosition]); // only on position change; mapRef and mapLoaded are stable

  return (
    <div className={cn('relative w-full h-full overflow-hidden', className)}>
      {/* Map canvas */}
      <div
        ref={containerRef}
        className="w-full h-full"
        aria-label="Interactive map"
        role="application"
      />

      {/* Pulsing blue dot at the user's GPS position */}
      {flags.user_location_enabled && (
        <UserLocationDot map={mapRef.current} position={userPosition ?? null} />
      )}

      {/* Mood color overlay — mix-blend-mode creates a tinted feel */}
      {flags.map_mood_theme_enabled && moodOverlayColor !== 'transparent' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 transition-all duration-[1500ms] ease-in-out"
          style={{
            backgroundColor: moodOverlayColor,
            mixBlendMode: 'multiply',
          }}
        />
      )}

      {/* Loading indicator */}
      {!mapLoaded && (
        <div
          aria-live="polite"
          aria-busy="true"
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-glass border-t-primary" />
          <p className="text-sm text-text-secondary">Loading map…</p>
        </div>
      )}
    </div>
  );
}
