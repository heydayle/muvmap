import type { Metadata } from 'next';
import MapPage from '@/modules/map/ui/pages';
import { MapMarkerData } from '@/modules/map/core/models/mapMarker';
import { MoodCategory } from '@/shared/types';
import { APP_NAME } from '@/shared/constants/app';

export async function generateMetadata({ searchParams }: MapRouteProps): Promise<Metadata> {
  const params = await searchParams;

  if (params.id && params.name) {
    const tagsStr = params.tags ? ` (${params.tags.split(',').map(t => `#${t}`).join(' ')})` : '';
    const moodStr = params.mood ? ` - A ${params.mood} vibe` : '';
    const title = `${params.name} — ${APP_NAME}`;
    const description = `Check out ${params.name} on ${APP_NAME}!${moodStr}${tagsStr}. Discover locations matching your vibe.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        siteName: APP_NAME,
      },
      twitter: {
        card: 'summary',
        title,
        description,
      },
    };
  }

  return {
    title: `Map — ${APP_NAME}`,
    description:
      'Explore your saved locations on an interactive map. Filter by mood and find spots nearby.',
  };
}

/**
 * Props for the map route — Next.js passes searchParams automatically.
 *
 * Deep-link params (set by Discovery page on card click):
 *   ?id=...&lat=...&lng=...&name=...&mood=...&tags=...
 *
 * Mood-search params (set by Mood page on submit):
 *   ?q=I+want+something+cozy&type=text
 *   ?emoji=😌,🧘&type=emoji
 */
interface MapRouteProps {
  searchParams: Promise<{
    // Deep-link single location
    id?: string;
    lat?: string;
    lng?: string;
    name?: string;
    mood?: string;
    tags?: string;
    // Mood search query
    q?: string;
    emoji?: string;
    type?: string;
  }>;
}

/**
 * Map route — Next.js App Router entry point.
 * Reads optional deep-link params or mood-search params from the URL.
 *
 * @param props - Route props with optional searchParams
 * @returns MapPage component
 */
export default async function MapRoute({ searchParams }: MapRouteProps) {
  const params = await searchParams;

  /** Parse deep-link single location */
  let initialSelectedMarker: MapMarkerData | null = null;
  const lat = params.lat ? parseFloat(params.lat) : NaN;
  const lng = params.lng ? parseFloat(params.lng) : NaN;

  if (params.id && params.name && !isNaN(lat) && !isNaN(lng)) {
    initialSelectedMarker = {
      id: params.id,
      lngLat: [lng, lat],
      name: params.name,
      mood_category: (params.mood as MoodCategory) || null,
      tags: params.tags ? params.tags.split(',').filter(Boolean) : [],
      state: 'selected',
      is_public: true,
    };
  }

  /**
   * Parse mood-search query forwarded from the /mood page.
   * When present, MapPage will call the mood-match API and show results as markers.
   */
  const moodQuery: { text?: string; emoji?: string[]; inputType: 'text' | 'emoji' } | null =
    params.type === 'text' && params.q
      ? { inputType: 'text', text: params.q }
      : params.type === 'emoji' && params.emoji
        ? { inputType: 'emoji', emoji: params.emoji.split(',').filter(Boolean) }
        : null;

  return (
    <MapPage
      flags={{
        map_render_enabled: true,
        user_location_enabled: true,
        marker_highlight_selected: true,
        marker_animation_enabled: true,
        marker_cluster_enabled: false,
        heatmap_enabled: true,
        route_direction_enabled: false,
        map_3d_enabled: true,
        map_mood_theme_enabled: true,
      }}
      activeMood={null}
      initialSelectedMarker={initialSelectedMarker}
      moodQuery={moodQuery}
    />
  );
}
