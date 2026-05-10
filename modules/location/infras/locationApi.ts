import {
  Location,
  LocationTag,
  CreateLocationPayload,
  UpdateLocationPayload,
  PaginatedLocations,
} from '../core/models/location';
import { ILocationRepository } from '../core/repositories/locationRepository';

/**
 * Default page size for location list queries.
 * Source: rules/system.md §3.1 — "Limit results (default: 20)"
 */
const DEFAULT_LIMIT = 20;

/**
 * Supabase-backed implementation of the location repository.
 * All data flows through Next.js API routes per system.md §1.2.
 *
 * @implements {ILocationRepository}
 */
export class LocationApiRepository implements ILocationRepository {
  /** Base URL for location API endpoints */
  private readonly baseUrl = '/api/locations';

  /**
   * Fetches a paginated list of locations for the current user.
   * Only selects required fields per system.md §3.1.
   *
   * @param page - Page number (0-indexed)
   * @param limit - Items per page
   * @returns Paginated location list
   */
  async getLocations(
    page = 0,
    limit = DEFAULT_LIMIT,
  ): Promise<PaginatedLocations> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    const res = await fetch(`${this.baseUrl}?${params.toString()}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch locations: ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Fetches a single location by ID.
   *
   * @param id - Location UUID
   * @returns The full location entity or null
   */
  async getLocationById(id: string): Promise<Location | null> {
    const res = await fetch(`${this.baseUrl}/${id}`);

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch location: ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Creates a new location.
   *
   * @param payload - Create location data
   * @returns The newly created location
   */
  async createLocation(payload: CreateLocationPayload): Promise<Location> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Failed to create location: ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Updates an existing location.
   *
   * @param payload - Partial update data with id
   * @returns The updated location
   */
  async updateLocation(payload: UpdateLocationPayload): Promise<Location> {
    const { id, ...data } = payload;
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`Failed to update location: ${res.statusText}`);
    }

    return res.json();
  }

  /**
   * Deletes a location by ID.
   *
   * @param id - Location UUID
   */
  async deleteLocation(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error(`Failed to delete location: ${res.statusText}`);
    }
  }
}

/**
 * Singleton instance of the location API repository.
 * Used by all hooks and usecases to access location data.
 */
export const locationRepository = new LocationApiRepository();
