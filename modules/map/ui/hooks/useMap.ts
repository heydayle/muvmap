import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { MapCamera, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '../../core/models/mapConfig';

/**
 * Options for initializing the MapLibre GL map instance.
 */
export interface UseMapOptions {
  /** Resolved MapLibre style URL */
  styleUrl: string;
  /** Initial camera position */
  initialCamera?: Partial<MapCamera>;
  /** Called when the map finishes loading */
  onLoad?: (map: maplibregl.Map) => void;
}

/**
 * Return value of the useMap hook.
 */
export interface UseMapReturn {
  /** Stable ref to attach to the map container div */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Stable ref to the MapLibre map instance (null before mount) */
  mapRef: React.RefObject<maplibregl.Map | null>;
  /**
   * Smoothly fly to a new camera position.
   * @param camera - Target camera values
   * @param durationMs - Animation duration in ms (default: 1500)
   */
  flyTo: (camera: Partial<MapCamera>, durationMs?: number) => void;
  /**
   * Switches the map style URL at runtime.
   * Used by mood-adaptive theming (Story 10).
   * @param styleUrl - New MapLibre style URL
   */
  setStyle: (styleUrl: string) => void;
}

/**
 * useMap manages the full MapLibre GL lifecycle:
 * - Initializes the map on mount with the given style and camera
 * - Exposes flyTo and setStyle controls
 * - Cleans up (removes) the map on unmount
 *
 * @param options - Map initialization options
 * @returns containerRef, mapRef, flyTo, setStyle
 */
export function useMap({ styleUrl, initialCamera, onLoad }: UseMapOptions): UseMapReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  /** Initialize the map on mount — runs exactly once */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: [number, number] = initialCamera?.center ?? DEFAULT_MAP_CENTER;
    const zoom = initialCamera?.zoom ?? DEFAULT_MAP_ZOOM;
    const pitch = initialCamera?.pitch ?? 0;
    const bearing = initialCamera?.bearing ?? 0;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center,
      zoom,
      pitch,
      bearing,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      'bottom-right',
    );

    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left',
    );

    map.on('load', () => {
      onLoad?.(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional: map must initialize exactly once on mount
  }, []);

  /**
   * Smoothly animates the camera to the given position.
   */
  const flyTo = useCallback((camera: Partial<MapCamera>, durationMs = 1500) => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      ...(camera.center && { center: camera.center }),
      ...(camera.zoom !== undefined && { zoom: camera.zoom }),
      ...(camera.pitch !== undefined && { pitch: camera.pitch }),
      ...(camera.bearing !== undefined && { bearing: camera.bearing }),
      duration: durationMs,
      essential: true,
    });
  }, []);

  /**
   * Switches the map tile/style at runtime.
   */
  const setStyle = useCallback((newStyleUrl: string) => {
    mapRef.current?.setStyle(newStyleUrl);
  }, []);

  return { containerRef, mapRef, flyTo, setStyle };
}
