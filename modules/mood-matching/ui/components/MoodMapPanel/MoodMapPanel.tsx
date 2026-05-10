'use client';

import { MapMarkerData } from '@/modules/map/core/models/mapMarker';
import { resolveMapStyle } from '@/modules/map/core/usecases/resolveMapStyle';
import { useMap } from '@/modules/map/ui/hooks/useMap';
import { useMapMarkers } from '@/modules/map/ui/hooks/useMapMarkers';
import { springPresets } from '@/shared/hooks/useAnimationPresets';
import { MoodCategory } from '@/shared/types';
import { motion } from 'framer-motion';
import 'maplibre-gl/dist/maplibre-gl.css';
import React, { useCallback, useEffect, useState } from 'react';
import { MoodMatchedLocation } from '../../../core/models/moodMatch';

/** Props for MoodMapPanel */
export interface MoodMapPanelProps {
  /** All matched locations to render as markers */
  locations: MoodMatchedLocation[];
  /** The currently selected/focused location */
  selectedLocationId: string | null;
  /** Detected mood — drives map color theme */
  detectedMood: MoodCategory | null;
  /** Called when the user clicks a marker on the map */
  onMarkerClick: (locationId: string) => void;
}

/**
 * Converts a MoodMatchedLocation into the MapMarkerData shape.
 * Uses [longitude, latitude] order as required by MapLibre GL.
 */
function toMarkerData(
  location: MoodMatchedLocation,
  isSelected: boolean,
): MapMarkerData {
  return {
    id: location.id,
    lngLat: [location.longitude!, location.latitude!],
    name: location.name,
    mood_category: location.mood_category,
    tags: location.tags,
    state: isSelected ? 'selected' : 'default',
  };
}

/**
 * MoodMapPanel — inline map embedded in the MoodMatchPage split layout.
 *
 * Root cause of "markers at top-left" bug:
 * MapLibre initialises its canvas using the container's current dimensions.
 * When the container is inside an animated flex layout it often has 0×0 dimensions
 * at mount time.  Every pixel projection then maps to (0, 0) — the top-left corner.
 *
 * Fix: a ResizeObserver watches the map container div and calls `map.resize()`
 * whenever the flex layout settles into its real size.  This forces MapLibre to
 * recompute all marker positions at the correct geographic coordinates.
 *
 * @param props - MoodMapPanelProps
 * @returns Inline map canvas with mood-result markers
 */
export default function MoodMapPanel({
  locations,
  selectedLocationId,
  detectedMood,
  onMarkerClick,
}: MoodMapPanelProps) {
  const [mapLoaded, setMapLoaded] = useState(false);

  const { styleUrl, moodOverlayColor } = resolveMapStyle(detectedMood, true);

  /** Only keep locations with valid coordinates */
  const validLocations = React.useMemo(
    () => locations.filter((l) => l.latitude !== null && l.longitude !== null),
    [locations],
  );

  /**
   * Compute initial map center as the centroid of all valid locations.
   * Stable: only recalculates once (locations won't change after mount).
   */
  const initialCenter: [number, number] = React.useMemo(() => {
    if (validLocations.length === 0) return [106.7, 10.77]; // HCMC default
    const avgLng =
      validLocations.reduce((s, l) => s + l.longitude!, 0) /
      validLocations.length;
    const avgLat =
      validLocations.reduce((s, l) => s + l.latitude!, 0) /
      validLocations.length;
    return [avgLng, avgLat];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally stable — computed once on mount

  /** Tracks whether MapLibre fired the 'load' event */
  const mapIsLoadedRef = React.useRef(false);

  /** useMap returns containerRef, mapRef, flyTo */
  const { containerRef, mapRef, flyTo } = useMap({
    styleUrl,
    initialCamera: { center: initialCenter, zoom: 13 },
    onLoad: () => {
      mapIsLoadedRef.current = true;
      // If the ResizeObserver already fired with real dimensions, open the gate now
      const container = containerRef.current;
      if (
        container &&
        container.offsetWidth > 0 &&
        container.offsetHeight > 0
      ) {
        mapRef.current?.resize();
        setMapLoaded(true);
      }
    },
  });

  /**
   * ResizeObserver — gates marker rendering on real canvas dimensions.
   *
   * Problem: MapLibre fires 'load' while the flex container is still 0×0.
   * Markers added at that point project to pixel (0,0) = top-left of canvas.
   *
   * Fix: watch the container. On the first meaningful resize (non-zero size),
   * call map.resize() so MapLibre recomputes its canvas projection, THEN set
   * mapLoaded=true so useMapMarkers adds pins onto a correctly-sized canvas
   * and they appear at their correct geographic positions.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let readied = false;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return; // skip zero-size frames

      const map = mapRef.current;
      if (!map) return;

      map.resize();

      if (!readied && mapIsLoadedRef.current) {
        readied = true;
        setMapLoaded(true);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, mapRef]);

  /**
   * Marker data — rebuilt whenever selection or locations change.
   * The `state` field is set here so useMapMarkers can re-create
   * the marker element with the correct visual (selected ring vs default).
   */
  const markers: MapMarkerData[] = React.useMemo(
    () =>
      validLocations.map((loc) =>
        toMarkerData(loc, loc.id === selectedLocationId),
      ),
    [validLocations, selectedLocationId],
  );

  /** Propagate map marker clicks to the parent (list panel) */
  const handleMarkerClick = useCallback(
    (marker: MapMarkerData) => onMarkerClick(marker.id),
    [onMarkerClick],
  );

  useMapMarkers({
    mapRef,
    mapLoaded,
    markers,
    animationsEnabled: true,
    onMarkerClick: handleMarkerClick,
  });

  /**
   * Once map is ready, fit the viewport to the bounding box of all locations.
   * This ensures all pins are visible regardless of whether initialCenter
   * was accurate, and compensates for any residual projection drift.
   */
  useEffect(() => {
    if (!mapLoaded || validLocations.length === 0) return;
    const map = mapRef.current;
    if (!map) return;

    if (validLocations.length === 1) {
      const loc = validLocations[0];
      flyTo({ center: [loc.longitude!, loc.latitude!], zoom: 15 });
      return;
    }

    const lngs = validLocations.map((l) => l.longitude!);
    const lats = validLocations.map((l) => l.latitude!);
    const bounds: [number, number, number, number] = [
      Math.min(...lngs),
      Math.min(...lats),
      Math.max(...lngs),
      Math.max(...lats),
    ];
    map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]); // run exactly once when map becomes ready

  /**
   * Fly to the selected location whenever the selection changes.
   * Delayed by 80 ms so any pending resize() finishes before flyTo
   * projects the new coordinates.
   */
  useEffect(() => {
    if (!selectedLocationId || !mapLoaded) return;
    const loc = validLocations.find((l) => l.id === selectedLocationId);
    if (!loc || loc.longitude === null || loc.latitude === null) return;

    const t = setTimeout(() => {
      flyTo({ center: [loc.longitude!, loc.latitude!], zoom: 15 });
    }, 80);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId, mapLoaded]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={springPresets.smooth}
      className="absolute inset-2 overflow-hidden rounded-[20px] border border-border-glass lg:inset-3"
    >
      {/* Map canvas — fills the positioned parent so MapLibre gets real px dimensions */}
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label="Mood match results map"
      />

      {/* Mood color overlay */}
      {moodOverlayColor !== 'transparent' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 transition-all duration-[1500ms] ease-in-out"
          style={{
            backgroundColor: moodOverlayColor,
            mixBlendMode: 'multiply',
          }}
        />
      )}

      {/* Loading state */}
      {!mapLoaded && (
        <div
          aria-live="polite"
          aria-busy="true"
          className="absolute inset-0 z-20 flex items-center justify-center bg-background"
        >
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-border-glass border-t-primary" />
        </div>
      )}

      {/* Spot count badge */}
      {mapLoaded && validLocations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springPresets.snappy, delay: 0.3 }}
          className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-full border border-border-glass bg-surface-glass px-3 py-1.5 text-[11px] font-medium text-text-secondary backdrop-blur-[12px]"
        >
          📍 {validLocations.length} spot
          {validLocations.length !== 1 ? 's' : ''} on map
        </motion.div>
      )}
    </motion.div>
  );
}
