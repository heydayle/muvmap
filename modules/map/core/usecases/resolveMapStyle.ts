import { MoodCategory } from '@/shared/types';
import { MoodMapStyle, OPENFREEMAP_STYLES } from '../models/mapConfig';

/**
 * Mood → CSS color overlay value.
 * Applied as a semi-transparent `mix-blend-mode: multiply` layer
 * on top of the map canvas for mood-adaptive theming.
 * No tile provider switching required — keeps it free and fast.
 */
const MOOD_OVERLAY_COLORS: Record<MoodMapStyle, string> = {
  default: 'transparent',
  calm: 'rgba(56, 189, 248, 0.12)',       // Sky blue
  happy: 'rgba(250, 204, 21, 0.10)',      // Yellow
  romantic: 'rgba(251, 113, 133, 0.12)', // Pink
  energetic: 'rgba(34, 197, 94, 0.10)',  // Green
  chill: 'rgba(167, 139, 250, 0.12)',    // Lavender
  excited: 'rgba(251, 146, 60, 0.12)',   // Orange
  sad: 'rgba(100, 116, 139, 0.15)',      // Slate grey
};

/**
 * Result of resolving a map style.
 */
export interface ResolvedMapStyle {
  /** MapLibre style URL */
  styleUrl: string;
  /** CSS color for the mood overlay div (rgba or 'transparent') */
  moodOverlayColor: string;
}

/**
 * Resolves the MapLibre style URL and mood overlay color based on:
 * - The current user mood (if map_mood_theme_enabled)
 * - The active map provider (currently only openfreemap)
 *
 * @param mood - Current detected mood (or null for default)
 * @param moodThemeEnabled - Whether mood theming is active
 * @returns Resolved style URL and overlay color
 */
export function resolveMapStyle(
  mood: MoodCategory | null,
  moodThemeEnabled: boolean,
): ResolvedMapStyle {
  const styleUrl = OPENFREEMAP_STYLES.dark;

  const moodStyle: MoodMapStyle =
    moodThemeEnabled && mood !== null ? mood : 'default';

  return {
    styleUrl,
    moodOverlayColor: MOOD_OVERLAY_COLORS[moodStyle] ?? 'transparent',
  };
}
