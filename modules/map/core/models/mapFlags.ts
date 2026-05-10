/**
 * Feature flag configuration for the Map module.
 * All flags default to the values specified in rules/features/map/flag.md.
 *
 * These are evaluated at runtime from environment/feature-flag system.
 * For now, defaults are hardcoded here — replace with remote flag service later.
 */
export interface MapFeatureFlags {
  /** Story 1 — Render the interactive map (default: true) */
  map_render_enabled: boolean;
  /** Story 3 — Show pulsing user GPS dot (default: false) */
  user_location_enabled: boolean;
  /** Story 4 — Highlight selected marker with glow + pulse (default: true) */
  marker_highlight_selected: boolean;
  /** Story 5 — Spring-physics marker animations (default: true) */
  marker_animation_enabled: boolean;
  /** Story 6 — Collapse nearby markers into clusters (default: false) */
  marker_cluster_enabled: boolean;
  /** Story 7 — Density heatmap overlay (default: false) */
  heatmap_enabled: boolean;
  /** Story 8 — Route directions overlay (default: false) */
  route_direction_enabled: boolean;
  /** Story 9 — 3D terrain/building extrusion mode (default: false) */
  map_3d_enabled: boolean;
  /** Story 10 — Mood-adaptive map color theme (default: true) */
  map_mood_theme_enabled: boolean;
}

/**
 * Default flag values per rules/features/map/flag.md.
 * Override individual flags by spreading this object.
 */
export const DEFAULT_MAP_FLAGS: MapFeatureFlags = {
  map_render_enabled: true,
  user_location_enabled: false,
  marker_highlight_selected: true,
  marker_animation_enabled: true,
  marker_cluster_enabled: false,
  heatmap_enabled: false,
  route_direction_enabled: false,
  map_3d_enabled: false,
  map_mood_theme_enabled: true,
};
