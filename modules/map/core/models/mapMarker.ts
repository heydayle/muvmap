import { MoodCategory } from '@/shared/types';

/**
 * Visual state of an individual map marker.
 * Controls which CSS class / animation is applied.
 */
export type MarkerState = 'default' | 'hovered' | 'selected';

/**
 * Lean marker data model — only the fields the map needs
 * to render a pin and display a location card on select.
 *
 * Does not include full description, created_at, etc.
 * to keep map payloads small.
 */
export interface MapMarkerData {
  /** Location UUID */
  id: string;
  /** [longitude, latitude] */
  lngLat: [number, number];
  /** Display name */
  name: string;
  /** Mood category (controls marker accent color) */
  mood_category: MoodCategory | null;
  /** Tag names for the selected card preview */
  tags: string[];
  /** Current interaction state */
  state: MarkerState;
  /**
   * The creator's personal note — their "think" about this place.
   * Shown as a quote on the SelectedLocationCard.
   * Optional: existing/mock locations may not have this.
   */
  creator_note?: string;
  /**
   * The profile UUID of whoever created this location.
   * Used by SelectedLocationCard to show the Edit button only to the creator.
   */
  user_id?: string;
}

/**
 * Cluster data for when `marker_cluster_enabled` is true.
 * Represents a group of nearby markers collapsed into one element.
 */
export interface MapClusterData {
  /** Cluster ID from MapLibre GeoJSON source */
  clusterId: number;
  /** [longitude, latitude] of the cluster centroid */
  lngLat: [number, number];
  /** Number of individual markers in this cluster */
  count: number;
}
