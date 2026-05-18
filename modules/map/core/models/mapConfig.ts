import { MapProvider, MoodCategory } from '@/shared/types';

/**
 * Supported map providers.
 * Currently only OpenFreeMap (via MapLibre GL) — free, no API key.
 * Extensible for future Mapbox/Google Maps support.
 */
export type { MapProvider };

/**
 * Map style variant — base dark or mood-adaptive.
 */
export type MoodMapStyle = 'default' | MoodCategory;

/**
 * Camera state representing the current map view.
 */
export interface MapCamera {
  /** Map center as [longitude, latitude] */
  center: [number, number];
  /** Zoom level (0–22) */
  zoom: number;
  /** Camera pitch in degrees — 0 = flat (2D), 60 = angled (3D) */
  pitch?: number;
  /** Camera bearing (rotation) in degrees */
  bearing?: number;
  /** Map style — OpenFreeMap style URL */
  style?: string;
}

/**
 * Geographic bounding box for spatial queries.
 */
export interface MapBounds {
  /** South-west corner [longitude, latitude] */
  sw: [number, number];
  /** North-east corner [longitude, latitude] */
  ne: [number, number];
}

/**
 * Full map configuration combining provider, style, camera, and flags.
 * Created once on MapPage mount and passed down via context/props.
 */
export interface MapConfig {
  /** Tile/style provider */
  provider: MapProvider;
  /** Resolved MapLibre style URL */
  styleUrl: string;
  /** Initial camera position */
  camera: MapCamera;
}

/**
 * Default map center — Vietnam (center of country).
 * [longitude, latitude] format as required by MapLibre.
 */
export const DEFAULT_MAP_CENTER: [number, number] = [106.7000, 10.7795];

/**
 * Default zoom level — country-level view (shows all of Vietnam).
 */
export const DEFAULT_MAP_ZOOM = 12;

/**
 * OpenFreeMap style URLs.
 * @see https://openfreemap.org/quick_start/
 */
export const OPENFREEMAP_STYLES = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  positron: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;
