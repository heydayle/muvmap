import { MapMarkerData } from '../models/mapMarker';

/**
 * A single cell in the heatmap grid — represents an aggregated location density.
 */
export interface HeatmapCell {
  /** Grid cell center [longitude, latitude] */
  lngLat: [number, number];
  /** Intensity value (0–1), normalized across all cells */
  intensity: number;
}

/**
 * Grid resolution for heatmap aggregation (degrees per cell).
 * ~1km cells at Bangkok's latitude.
 */
const GRID_RESOLUTION = 0.01;

/**
 * Aggregates a flat list of markers into a density heatmap grid.
 * Groups markers into lat/lng grid cells and normalizes intensity.
 *
 * @param markers - Visible map markers
 * @returns Array of heatmap cells with normalized intensity values
 */
export function computeHeatmap(markers: MapMarkerData[]): HeatmapCell[] {
  if (markers.length === 0) return [];

  const cellMap = new Map<string, { count: number; lng: number; lat: number }>();

  for (const marker of markers) {
    const [lng, lat] = marker.lngLat;
    const cellLng = Math.round(lng / GRID_RESOLUTION) * GRID_RESOLUTION;
    const cellLat = Math.round(lat / GRID_RESOLUTION) * GRID_RESOLUTION;
    const key = `${cellLng.toFixed(4)},${cellLat.toFixed(4)}`;

    const existing = cellMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      cellMap.set(key, { count: 1, lng: cellLng, lat: cellLat });
    }
  }

  const cells = Array.from(cellMap.values());
  const maxCount = Math.max(...cells.map((c) => c.count));

  return cells.map((cell) => ({
    lngLat: [cell.lng, cell.lat] as [number, number],
    intensity: maxCount > 0 ? cell.count / maxCount : 0,
  }));
}
