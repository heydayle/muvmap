'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { createClient } from '@/shared/utils/supabase/client';
import { APP_NAME } from '@/shared/constants/app';

type ModalState = 'idle' | 'loading' | 'sent' | 'error';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * AuthModal — floating glassmorphic sign-in panel.
 *
 * Supports:
 *  - Email magic link (passwordless)
 *  - Google OAuth
 *
 * Never blocks the user — closing the modal returns them to guest mode.
 */
export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<ModalState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : '/auth/callback';

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState('loading');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setErrorMsg(error.message);
      setState('error');
    } else {
      setState('sent');
    }
  }

  async function handleGoogle() {
    setState('loading');
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }

  function handleClose() {
    setState('idle');
    setEmail('');
    setErrorMsg('');
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="auth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Sign in to ${APP_NAME}`}
            className="fixed left-1/2 top-1/2 z-[201] w-full max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-white/10 bg-black/75 p-8 shadow-2xl backdrop-blur-2xl"
          >
            {/* Close */}
            <button
              onClick={handleClose}
              aria-label="Close sign-in dialog"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
            >
              ✕
            </button>

            {state === 'sent' ? (
              /* ── Success state ─────────────────────────────────────── */
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <span className="text-5xl">✉️</span>
                <h2 className="text-xl font-bold text-white">Check your email!</h2>
                <p className="text-sm leading-relaxed text-white/60">
                  We sent a magic link to <strong className="text-white/90">{email}</strong>.
                  Click it to sign in — no password needed.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-2 rounded-full bg-white/10 px-6 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/20"
                >
                  Got it
                </button>
              </div>
            ) : (
              /* ── Form state ────────────────────────────────────────── */
              <>
                {/* Header */}
                <div className="mb-7 text-center">
                  <p className="mb-1 text-2xl">✦</p>
                  <h2 className="mb-1 text-xl font-bold text-white">Sign in to {APP_NAME}</h2>
                  <p className="text-[13px] text-white/50">Drop vibes. Own your spots.</p>
                </div>

                {/* Magic link form */}
                <form onSubmit={handleMagicLink} className="mb-4 flex flex-col gap-3">
                  <div
                    className="flex items-center gap-2 rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 transition-colors focus-within:border-white/30"
                  >
                    <span className="text-base text-white/40">✉</span>
                    <input
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      autoComplete="email"
                      className="w-full bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                    />
                  </div>

                  {state === 'error' && (
                    <p className="text-[12px] text-red-400">{errorMsg}</p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={state === 'loading' || !email.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-white py-3 text-sm font-semibold text-black transition-opacity disabled:opacity-50"
                  >
                    {state === 'loading' ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                        Sending…
                      </>
                    ) : (
                      'Continue with Email ✦'
                    )}
                  </motion.button>
                </form>

                {/* Divider */}
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="text-[11px] text-white/30">or</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                {/* Google OAuth */}
                <motion.button
                  type="button"
                  onClick={handleGoogle}
                  disabled={state === 'loading'}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex w-full items-center justify-center gap-2.5 rounded-[14px] border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  {/* Google icon (inline SVG) */}
                  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3.1-2.4 5.7-4.9 7.5v6.2h7.9c4.6-4.3 7.3-10.6 7.3-17.7z"/>
                    <path fill="#34A853" d="M24 47c6.5 0 11.9-2.1 15.8-5.8l-7.9-6.2c-2.1 1.4-4.8 2.3-7.9 2.3-6.1 0-11.3-4.1-13.1-9.7H3v6.4C6.9 42.6 14.9 47 24 47z"/>
                    <path fill="#FBBC05" d="M10.9 27.6c-.5-1.4-.7-2.9-.7-4.6s.3-3.2.7-4.6V12H3C1.1 15.6 0 19.7 0 24s1.1 8.4 3 12l7.9-8.4z"/>
                    <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.7-6.7C35.9 2.5 30.4 0 24 0 14.9 0 6.9 5.4 3 13l7.9 6.4C12.7 13.6 17.9 9.5 24 9.5z"/>
                  </svg>
                  Continue with Google
                </motion.button>

                {/* Guest note */}
                <p className="mt-5 text-center text-[12px] text-white/30">
                  Just exploring?{' '}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="underline underline-offset-2 hover:text-white/60"
                  >
                    Continue as guest 👋
                  </button>
                </p>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
