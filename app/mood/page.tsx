import type { Metadata } from 'next';
import MoodMatchPage from '@/modules/mood-matching/ui/pages';
import { APP_NAME } from '@/shared/constants/app';

/**
 * SEO metadata for the Mood Matching page.
 */
export const metadata: Metadata = {
  title: `Match My Mood — ${APP_NAME}`,
  description:
    'Tell us how you\'re feeling and our AI will find the perfect spot that matches your vibe. Powered by Dify + DeepSeek.',
};

/**
 * Mood Match route — Next.js App Router entry point.
 *
 * Passes `searchParams` from the Server Component so `MoodMatchPage` can
 * read initial query state (e.g. `?q=cozy&type=text`) without needing
 * `useSearchParams()` + a Suspense boundary.
 *
 * @param props.searchParams - URL search params from the incoming request
 * @returns MoodMatchPage component
 */
export default async function MoodPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <MoodMatchPage initialSearchParams={params} />;
}
