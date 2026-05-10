import {
  CreateLocationPayload,
  UpdateLocationPayload,
  Location,
} from '../models/location';
import { ILocationRepository } from '../repositories/locationRepository';

/**
 * Validates geo coordinates for range compliance.
 * Source: rules/features/location/flags.md Story 6
 * - Latitude: -90 to 90
 * - Longitude: -180 to 180
 *
 * @param lat - Latitude value
 * @param lng - Longitude value
 * @returns Whether the coordinates are valid
 */
export function validateCoordinates(
  lat: number | undefined,
  lng: number | undefined,
): boolean {
  if (lat === undefined && lng === undefined) return true;
  if (lat !== undefined && (lat < -90 || lat > 90)) return false;
  if (lng !== undefined && (lng < -180 || lng > 180)) return false;
  return true;
}

/**
 * Normalizes tag strings: trims whitespace, converts to lowercase,
 * and removes duplicates.
 * Source: rules/features/location/flags.md Story 5
 *
 * @param tags - Raw tag strings
 * @returns Normalized unique tag array
 */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags
    .map((t) => t.trim().toLowerCase())
    .filter((t) => {
      if (!t || seen.has(t)) return false;
      seen.add(t);
      return true;
    });
}

/**
 * Creates a new location after validating and normalizing input.
 *
 * @param repository - Location data access repository
 * @param payload - Raw creation payload
 * @returns The created location
 * @throws Error if validation fails
 */
export async function createLocationUseCase(
  repository: ILocationRepository,
  payload: CreateLocationPayload,
): Promise<Location> {
  if (!payload.name.trim()) {
    throw new Error('Location name is required');
  }

  if (!validateCoordinates(payload.latitude, payload.longitude)) {
    throw new Error('Invalid coordinates: lat must be -90..90, lng must be -180..180');
  }

  const normalizedPayload: CreateLocationPayload = {
    ...payload,
    name: payload.name.trim(),
    description: payload.description?.trim(),
    tags: payload.tags ? normalizeTags(payload.tags) : undefined,
  };

  return repository.createLocation(normalizedPayload);
}

/**
 * Updates an existing location after validating and normalizing input.
 *
 * @param repository - Location data access repository
 * @param payload - Partial update payload with id
 * @returns The updated location
 * @throws Error if validation fails
 */
export async function updateLocationUseCase(
  repository: ILocationRepository,
  payload: UpdateLocationPayload,
): Promise<Location> {
  if (payload.name !== undefined && !payload.name.trim()) {
    throw new Error('Location name cannot be empty');
  }

  if (!validateCoordinates(payload.latitude, payload.longitude)) {
    throw new Error('Invalid coordinates');
  }

  const normalizedPayload: UpdateLocationPayload = {
    ...payload,
    name: payload.name?.trim(),
    description: payload.description?.trim(),
    tags: payload.tags ? normalizeTags(payload.tags) : undefined,
  };

  return repository.updateLocation(normalizedPayload);
}
