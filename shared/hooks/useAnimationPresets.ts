/**
 * Framer Motion spring physics presets used across all animations.
 * Source of truth: rules/design.md §7.2
 *
 * @see {@link file://rules/design.md} for full animation specs
 */
export const springPresets = {
  /** Buttons, toggles, quick feedback */
  snappy: { type: 'spring' as const, stiffness: 400, damping: 30 },
  /** Page transitions, card reveals */
  smooth: { type: 'spring' as const, stiffness: 200, damping: 25 },
  /** Success states, celebratory UI */
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 15 },
  /** Background shifts, mood transitions */
  gentle: { type: 'spring' as const, stiffness: 120, damping: 20 },
  /** Modal open/close, drawers */
  heavy: { type: 'spring' as const, stiffness: 300, damping: 35, mass: 1.5 },
};

/**
 * Standard page transition variants for AnimatePresence.
 * Source of truth: rules/design.md §7.4
 */
export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: springPresets.smooth },
  exit: { opacity: 0, y: 10, transition: springPresets.smooth },
};

/**
 * Staggered list item animation variants.
 * Source of truth: rules/design.md §7.4
 */
export const listItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      ...springPresets.snappy,
      delay: i * 0.05,
    },
  }),
};
