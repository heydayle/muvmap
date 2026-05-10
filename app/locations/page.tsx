'use client';

import LocationListPage from '@/modules/location/ui/pages';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

/**
 * Next.js App Router entry point for `/locations`.
 *
 * Per CLAUDE.md §1: App router files are ONLY for routing, layout, and URL
 * param extraction. All logic lives in `modules/location/ui/pages/`.
 *
 * @returns The locations page, wrapped in a QueryClientProvider.
 */
export default function LocationsPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <LocationListPage />
    </QueryClientProvider>
  );
}
