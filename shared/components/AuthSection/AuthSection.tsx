'use client';

import { useState } from 'react';
import UserButton from '@/shared/components/UserButton/UserButton';
import AuthModal from '@/shared/components/AuthModal/AuthModal';

/**
 * AuthSection — self-contained auth nav pill + modal.
 *
 * Renders a fixed top-right UserButton and mounts the AuthModal
 * with shared open state. Drop this into the root layout; it
 * works on every page without any prop-drilling.
 */
export default function AuthSection() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Fixed position nav pill */}
      <div className="fixed right-4 top-4 z-[100] max-w-[calc(100vw-2rem)]">
        <UserButton onSignInClick={() => setModalOpen(true)} />
      </div>

      {/* Modal — rendered at root level to avoid stacking context issues */}
      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
