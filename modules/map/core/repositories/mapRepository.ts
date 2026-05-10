import { MapMarkerData } from '../models/mapMarker';
import { MapBounds } from '../models/mapConfig';
import { MoodCategory } from '@/shared/types';

/**
 * Repository contract for map data access.
 * The map module fetches lean marker payloads scoped to the visible bounds.
 */
export interface IMapRepository {
  /**
   * Fetches map markers within the given geographic bounding box.
   * Returns lean data only — no full descriptions.
   *
   * @param bounds - The visible map area to query
   * @param mood - Optional mood filter (omit for all moods)
   * @returns Array of lean marker data for rendering
   */
  getMarkersInBounds(
    bounds: MapBounds,
    mood?: MoodCategory | 'all',
  ): Promise<MapMarkerData[]>;
}
