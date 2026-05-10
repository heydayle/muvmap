import {
  Location,
  CreateLocationPayload,
  UpdateLocationPayload,
  PaginatedLocations,
} from '../models/location';

/**
 * Contract for location data access operations.
 * Implementations live in `infras/` — this interface enforces
 * separation between domain logic and infrastructure.
 *
 * Source: rules/system.md §3.1 (data flow rules)
 */
export interface ILocationRepository {
  /**
   * Fetch a paginated list of locations for the current user.
   *
   * @param page - Page number (0-indexed)
   * @param limit - Items per page (default: 20 per system.md §3.1)
   * @returns Paginated location list
   */
  getLocations(page: number, limit: number): Promise<PaginatedLocations>;

  /**
   * Fetch a single location by ID.
   *
   * @param id - Location UUID
   * @returns The full location entity or null if not found
   */
  getLocationById(id: string): Promise<Location | null>;

  /**
   * Create a new location.
   *
   * @param payload - Location creation data
   * @returns The newly created location
   */
  createLocation(payload: CreateLocationPayload): Promise<Location>;

  /**
   * Update an existing location.
   *
   * @param payload - Partial location update data (must include id)
   * @returns The updated location
   */
  updateLocation(payload: UpdateLocationPayload): Promise<Location>;

  /**
   * Delete a location by ID.
   *
   * @param id - Location UUID to delete
   */
  deleteLocation(id: string): Promise<void>;
}
