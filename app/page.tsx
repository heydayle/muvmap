import HomePage from '@/modules/home/ui/pages';

/**
 * Next.js App Router entry point for `/` (home route).
 *
 * Per CLAUDE.md §1: App router files are ONLY for routing — no business logic.
 * All UI lives in `modules/home/ui/pages/`.
 *
 * @returns The home page component
 */
export default function RootPage() {
  return <HomePage />;
}
