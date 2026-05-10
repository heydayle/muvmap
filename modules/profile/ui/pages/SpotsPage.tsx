'use client';

import { useUser } from '@/shared/hooks/useUser';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/shared/utils/supabase/client';
import { MapMarkerData } from '@/modules/map/core/models/mapMarker';

const parseTags = (raw: string | null | undefined): string[] =>
  raw ? raw.split(',').map((t) => t.trim()).filter(Boolean) : [];

const MOOD_HEX: Record<string, string> = {
  calm: '#60A5FA', happy: '#FACC15', romantic: '#F472B6',
  energetic: '#FB923C', chill: '#34D399', excited: '#A78BFA', sad: '#94A3B8',
};

/**
 * SpotsPage — shows locations added by the current user.
 *
 * Guest users see a soft prompt card to sign in (no redirect, no wall).
 * Authenticated users see a grid of their contributed spots.
 */
export default function SpotsPage() {
  const { user, loading, isAuthenticated } = useUser();
  const [spots, setSpots] = useState<MapMarkerData[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    setFetching(true);
    const supabase = createClient();
    supabase
      .from('locations')
      .select('id, name, latitude, longitude, mood_category, tags, creator_note, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const markers: MapMarkerData[] = (data ?? []).map((row) => ({
          id: row.id,
          lngLat: [row.longitude, row.latitude] as [number, number],
          name: row.name,
          mood_category: row.mood_category ?? null,
          tags: parseTags(row.tags),
          state: 'default' as const,
          ...(row.creator_note ? { creator_note: row.creator_note } : {}),
        }));
        setSpots(markers);
        setFetching(false);
      });
  }, [isAuthenticated, user]);

  return (
    <main className="min-h-screen px-4 py-20 md:px-8">
      <div className="mx-auto max-w-[860px]">
        {/* Back */}
        <Link
          href="/map"
          className="mb-8 inline-flex items-center gap-2 text-[13px] text-white/40 transition-colors hover:text-white/70"
        >
          ← Back to map
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-white">My Spots</h1>
        <p className="mb-10 text-[15px] text-white/50">
          Places you&apos;ve shared with the community.
        </p>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-[20px] bg-white/5" />
            ))}
          </div>
        )}

        {/* Guest prompt */}
        {!loading && !isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-5 rounded-[24px] border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm"
          >
            <span className="text-5xl">📍</span>
            <div>
              <p className="mb-2 text-xl font-semibold text-white">Your spots live here</p>
              <p className="text-[14px] leading-relaxed text-white/50">
                Sign in to see and manage the locations you&apos;ve added to the map.
                <br />
                You can still add spots as a guest — they&apos;ll just be anonymous.
              </p>
            </div>
            <Link
              href="/"
              id="spots-signin-cta"
              className="rounded-full bg-white px-7 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              ✦ Sign in
            </Link>
          </motion.div>
        )}

        {/* Authenticated — fetching */}
        {!loading && isAuthenticated && fetching && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-[20px] bg-white/5" />
            ))}
          </div>
        )}

        {/* Authenticated — empty */}
        {!loading && isAuthenticated && !fetching && spots.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 rounded-[24px] border border-white/10 bg-white/5 p-12 text-center"
          >
            <span className="text-4xl">🗺️</span>
            <p className="text-lg font-semibold text-white">No spots yet</p>
            <p className="text-[13px] text-white/50">
              Click anywhere on the map to add your first location.
            </p>
            <Link
              href="/map"
              className="rounded-full border border-white/15 px-6 py-2 text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white"
            >
              Go to map →
            </Link>
          </motion.div>
        )}

        {/* Spots grid */}
        {!loading && isAuthenticated && !fetching && spots.length > 0 && (
          <AnimatePresence>
            <div className="grid gap-4 sm:grid-cols-2">
              {spots.map((spot, i) => {
                const accent = spot.mood_category ? (MOOD_HEX[spot.mood_category] ?? '#fff') : '#fff';
                return (
                  <motion.div
                    key={spot.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="overflow-hidden rounded-[20px] border border-white/10 bg-black/40 backdrop-blur-sm"
                  >
                    {/* Accent bar */}
                    <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}cc, ${accent}22)` }} />

                    <div className="p-5">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest" style={{ color: accent }}>
                        {spot.mood_category ?? 'spot'}
                      </p>
                      <h3 className="mb-2 text-base font-semibold text-white">{spot.name}</h3>

                      {spot.tags.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1">
                          {spot.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full px-2 py-0.5 text-[11px]"
                              style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}33` }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <Link
                        href={`/map?lat=${spot.lngLat[1]}&lng=${spot.lngLat[0]}&id=${spot.id}`}
                        className="text-[12px] text-white/40 transition-colors hover:text-white/70"
                      >
                        View on map →
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </main>
  );
}
