'use client';

import Link from 'next/link';
import { APP_NAME } from '@/shared/constants/app';

/**
 * HomePage is the landing page component for the MoodMap app.
 *
 * Per CLAUDE.md §1: This component lives in `modules/` and is exported
 * to `app/page.tsx`. All UI logic belongs here, not in the Next.js entry.
 *
 * @returns The hero landing page component
 */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 md:px-6 lg:px-8">
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center gap-6 text-center">
        {/* Aurora gradient background */}
        <div
          className="pointer-events-none absolute inset-0 z-0 animate-aurora-shift"
          style={{
            background: [
              'radial-gradient(ellipse at 20% 50%, rgba(56, 189, 248, 0.12) 0%, transparent 50%)',
              'radial-gradient(ellipse at 80% 20%, rgba(0, 123, 255, 0.1) 0%, transparent 50%)',
              'radial-gradient(ellipse at 50% 80%, rgba(167, 139, 250, 0.08) 0%, transparent 40%)',
            ].join(', '),
          }}
        />

        {/* Hero content */}
        <div className="relative z-[1] flex flex-col items-center gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-mood-energetic/20 bg-mood-energetic/10 px-3.5 py-1.5 text-xs font-medium text-mood-energetic">
            🚀 Phase 0 — Bootstrap Complete
          </span>

          <h1 className="bg-gradient-to-br from-white to-primary-light bg-clip-text text-transparent">
            {APP_NAME}
          </h1>

          <p className="max-w-[520px] text-[clamp(16px,2vw,20px)] leading-relaxed text-text-secondary">
            AI-powered location discovery based on your current mood. Drop a
            vibe, get a place.
          </p>

          {/**
           * Links to /mood so the user can input their mood and get matched
           * locations shown on the map.
           */}
          <Link
            href="/mood"
            className="rounded-lg bg-gradient-to-br from-primary to-primary-light px-8 py-4 text-base font-medium text-white transition-all duration-150 hover:-translate-y-px hover:shadow-glow active:scale-[0.97]"
            id="home-match-my-mood"
          >
            Match My Mood
          </Link>
        </div>
      </section>
    </main>
  );
}
