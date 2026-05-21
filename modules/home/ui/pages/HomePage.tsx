'use client';

import MoodInputPanel from '@/modules/mood-matching/ui/components/MoodInputPanel';
import { APP_NAME } from '@/shared/constants/app';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { MoodMatchInput } from '@/modules/mood-matching/core/models/moodMatch';

/**
 * HomePage is the landing page component for the MoodMap app.
 *
 * Per CLAUDE.md §1: This component lives in `modules/` and is exported
 * to `app/page.tsx`. All UI logic belongs here, not in the Next.js entry.
 *
 * The mood input panel lives here so users can jump straight to /map results
 * from the landing page.
 *
 * @returns The hero landing page component
 */
export default function HomePage() {
  const router = useRouter();

  /**
   * Handles mood submission — navigates to /map with the query params.
   * Mirrors the same logic used in MoodMatchPage.
   *
   * @param input - User's mood input (text or emoji)
   */
  const handleSubmit = useCallback(
    (input: MoodMatchInput) => {
      const params = new URLSearchParams();
      if (input.inputType === 'text' && input.text) {
        params.set('q', input.text);
        params.set('type', 'text');
      } else if (input.inputType === 'emoji' && input.emoji?.length) {
        params.set('emoji', input.emoji.join(','));
        params.set('type', 'emoji');
      }
      router.push(`/map?${params.toString()}`);
    },
    [router],
  );

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
        <div className="relative z-[1] flex w-full max-w-[520px] flex-col items-center gap-6">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={70}
            height={70}
            className="animate-bounce animate-once animate-duration-1000"
          />
          <h1 className="bg-gradient-to-br from-white to-primary-light bg-clip-text text-transparent">
            {APP_NAME}
          </h1>

          <p className="max-w-[520px] text-[clamp(16px,2vw,20px)] leading-relaxed text-text-secondary">
            AI-powered location discovery based on your current mood. Drop a
            vibe, get a place.
          </p>

          {/* Mood input — submits directly to /map */}
          <div
            className="w-full overflow-hidden rounded-[24px] border border-white/10 p-5"
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05) inset',
            }}
          >
            <MoodInputPanel onSubmit={handleSubmit} />
          </div>
        </div>
      </section>
    </main>
  );
}
