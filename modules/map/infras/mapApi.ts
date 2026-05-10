import { IMapRepository } from '../core/repositories/mapRepository';
import { MapMarkerData } from '../core/models/mapMarker';
import { MapBounds } from '../core/models/mapConfig';
import { MoodCategory } from '@/shared/types';

/**
 * Fetch-based implementation of IMapRepository.
 * Routes all requests through Next.js API routes per system.md §1.2.
 *
 * @implements {IMapRepository}
 */
export class MapApiRepository implements IMapRepository {
  /** Base URL for map API endpoints */
  private readonly baseUrl = '/api/map';

  /**
   * Fetches lean marker data for the given geographic bounds.
   * Scoped to visible viewport to minimize payload size.
   *
   * @param bounds - Visible map area [sw, ne]
   * @param mood - Optional mood filter
   * @returns Array of map marker data
   */
  async getMarkersInBounds(
    bounds: MapBounds,
    mood?: MoodCategory | 'all',
  ): Promise<MapMarkerData[]> {
    const boundsParam = [
      bounds.sw[0],
      bounds.sw[1],
      bounds.ne[0],
      bounds.ne[1],
    ].join(',');

    const query = new URLSearchParams({ bounds: boundsParam });

    if (mood && mood !== 'all') {
      query.set('mood', mood);
    }

    const res = await fetch(`${this.baseUrl}/markers?${query.toString()}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch map markers: ${res.statusText}`);
    }

    return res.json();
  }
}

/**
 * Singleton instance of the Map API repository.
 * Used by all Map hooks and usecases.
 */
export const mapRepository = new MapApiRepository();
