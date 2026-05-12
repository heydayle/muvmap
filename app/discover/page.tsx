import type { Metadata } from 'next';
import DiscoveryPage from '@/modules/discovery/ui/pages';
import { APP_NAME } from '@/shared/constants/app';

/**
 * SEO metadata for the Discovery page.
 */
export const metadata: Metadata = {
  title: `Discover — ${APP_NAME}`,
  description:
    'Explore public spots shared by the community. Filter by mood, find what matches your vibe.',
};

/**
 * Discover route — Next.js App Router entry point.
 * Delegates all rendering to the DiscoveryPage module component.
 * No business logic lives here.
 *
 * Gated by: beta_features_enabled → discovery_enabled
 *
 * @returns DiscoveryPage component
 */
export default function DiscoverPage() {
  return <DiscoveryPage />;
}
