import { MoodCategory } from '@/shared/types';
import maplibregl from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MapMarkerData, MarkerState } from '../../core/models/mapMarker';

/** Mood → electric blue variant for selected, muted for default */
const MOOD_COLORS: Record<string, string> = {
  calm: '#38BDF8',
  happy: '#FACC15',
  romantic: '#FB7185',
  energetic: '#22C55E',
  chill: '#A78BFA',
  excited: '#FB923C',
  sad: '#64748B',
};

const DEFAULT_COLOR = '#64748B';
const SELECTED_COLOR = '#007BFF';

/** Inject float keyframe once — idempotent via the style element id */
function ensureFloatKeyframes(): void {
  if (document.getElementById('muvmap-marker-float')) return;
  const style = document.createElement('style');
  style.id = 'muvmap-marker-float';
  style.textContent = `
    @keyframes markerFloat {
      0%   { transform: translateY(0px); }
      50%  { transform: translateY(-6px); }
      100% { transform: translateY(0px); }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Creates a custom SVG marker DOM element.
 *
 * @param mood - Mood category for color selection
 * @param state - Current marker interaction state
 * @param animated - Whether to add spring-physics entrance animation
 * @param uid - Unique identifier to avoid SVG gradient ID collisions in the DOM
 * @returns Styled HTMLDivElement for use as MapLibre marker element
 */
function createMarkerElement(
  mood: MoodCategory | null,
  state: MarkerState,
  animated: boolean,
  uid: string,
): HTMLDivElement {
  const color =
    state === 'selected' ? SELECTED_COLOR : (mood ? MOOD_COLORS[mood] : DEFAULT_COLOR);

  // Each marker needs a unique gradient ID — sharing IDs causes only the last
  // definition to be used, which collapses all pins to a single location.
  const gradientId = `mg-${uid}`;

  /**
   * IMPORTANT: MapLibre GL applies `transform: translate(Xpx, Ypx)` directly
   * to the element passed as `options.element`. We must NEVER set `el.style.transform`
   * ourselves — doing so overwrites MapLibre's translate and snaps the pin to (0,0).
   *
   * Solution: `el` is a transparent shell that MapLibre owns entirely.
   *           `inner` is a child div that receives all visual styles and hover effects.
   */
  const el = document.createElement('div');
  el.style.width = '24px';
  el.style.height = '32px';
  el.style.cursor = 'pointer';
  // No transform, filter, or transition on el — MapLibre owns those

  // Inner div: safe to animate freely without touching MapLibre's positioning
  const inner = document.createElement('div');
  inner.style.width = '24px';
  inner.style.height = '32px';
  inner.style.filter = `drop-shadow(0 2px 6px ${color}88)`;
  inner.style.transformOrigin = '50% 100%'; // scale from pin tip anchor point

  if (state === 'selected') {
    ensureFloatKeyframes();
    inner.style.animation = 'markerFloat 2s ease-in-out infinite';
  } else {
    // Non-selected markers keep the spring hover transition
    inner.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease';
  }

  inner.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="24" height="32">
      <defs>
        <radialGradient id="${gradientId}" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.7"/>
        </radialGradient>
      </defs>
      <path d="M16 0C7.16 0 0 7.16 0 16c0 11.2 14.4 25.2 15 25.88a1.33 1.33 0 0 0 2 0C17.6 41.2 32 27.2 32 16 32 7.16 24.84 0 16 0z"
            fill="url(#${gradientId})" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="6" fill="white" opacity="0.95"/>
      <circle cx="16" cy="16" r="3" fill="${color}"/>
      ${state === 'selected' ? `
        <circle cx="16" cy="16" r="10" fill="none" stroke="${color}" stroke-width="2" opacity="0.5">
          <animate attributeName="r" values="10;16;10" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      ` : ''}
    </svg>
  `;

  // Hover on inner — pause float, apply scale, then resume on leave
  inner.addEventListener('mouseenter', () => {
    inner.style.animationPlayState = 'paused';
    inner.style.transform = 'scale(1.2)';
    inner.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease';
    inner.style.filter = `drop-shadow(0 4px 12px ${color}aa)`;
  });
  inner.addEventListener('mouseleave', () => {
    inner.style.transform = '';
    inner.style.transition = '';
    inner.style.animationPlayState = 'running';
    inner.style.filter = `drop-shadow(0 2px 6px ${color}88)`;
  });

  el.appendChild(inner);
  return el;
}


/**
 * Options for the useMapMarkers hook.
 */
export interface UseMapMarkersOptions {
  /** MapLibre map instance ref */
  mapRef: React.RefObject<maplibregl.Map | null>;
  /** Whether the map has fully loaded */
  mapLoaded: boolean;
  /** Marker data to render */
  markers: MapMarkerData[];
  /** Whether marker animations are enabled (Story 5) */
  animationsEnabled: boolean;
  /** Called when a marker is clicked */
  onMarkerClick: (marker: MapMarkerData) => void;
}

/**
 * useMapMarkers injects and manages DOM marker instances on the MapLibre map.
 * - Adds new markers when data changes
 * - Removes stale markers when they leave the viewport data
 * - Updates selected marker's visual state
 *
 * @param options - Hook configuration
 * @returns selectedMarkerId and setSelectedMarkerId
 */
export function useMapMarkers({
  mapRef,
  mapLoaded,
  markers,
  animationsEnabled,
  onMarkerClick,
}: UseMapMarkersOptions): {
  selectedMarkerId: string | null;
  setSelectedMarkerId: (id: string | null) => void;
} {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const markerInstancesRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  /** Tracks the current visual state of each marker by ID (not via DOM) */
  const markerStateRef = useRef<Map<string, MarkerState>>(new Map());

  const handleMarkerClick = useCallback(
    (marker: MapMarkerData) => {
      setSelectedMarkerId(marker.id);
      onMarkerClick(marker);
    },
    [onMarkerClick],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const incomingIds = new Set(markers.map((m) => m.id));
    const existingIds = new Set(markerInstancesRef.current.keys());

    // Remove stale markers
    for (const id of existingIds) {
      if (!incomingIds.has(id)) {
        markerInstancesRef.current.get(id)?.remove();
        markerInstancesRef.current.delete(id);
        markerStateRef.current.delete(id);
      }
    }

    // Add/update markers
    for (const markerData of markers) {
      // Prefer the caller-supplied state (supports external controlled selection,
      // e.g. MoodMapPanel drives state from its own selectedLocationId prop).
      // Fall back to internal selectedMarkerId for MapPage's self-managed flow.
      const state: MarkerState =
        markerData.state === 'selected' || markerData.id === selectedMarkerId
          ? 'selected'
          : 'default';
      const existing = markerInstancesRef.current.get(markerData.id);

      if (existing) {
        // Check state first — if state changed, we discard and re-create
        const currentState = markerStateRef.current.get(markerData.id);
        if (currentState !== state) {
          existing.remove();
          markerInstancesRef.current.delete(markerData.id);
          markerStateRef.current.delete(markerData.id);
          // Fall through to creation below
        } else {
          // State unchanged — just update position if it moved.
          // Only update on kept markers: calling setLngLat on a 0×0 canvas
          // caches a wrong pixel offset. By this point resize() has already run.
          existing.setLngLat(markerData.lngLat);
          continue;
        }
      }

      const el = createMarkerElement(markerData.mood_category, state, false, markerData.id);
      el.dataset.state = state;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handleMarkerClick(markerData);
      });

      const instance = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(markerData.lngLat)
        .addTo(map);

      markerInstancesRef.current.set(markerData.id, instance);
      markerStateRef.current.set(markerData.id, state);
    }
  }, [mapRef, mapLoaded, markers, animationsEnabled, selectedMarkerId, handleMarkerClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markerInstancesRef.current.forEach((marker) => marker.remove());
      markerInstancesRef.current.clear();
      markerStateRef.current.clear();
    };
  }, []);

  return { selectedMarkerId, setSelectedMarkerId };
}
