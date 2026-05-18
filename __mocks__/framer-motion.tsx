/**
 * Global framer-motion mock for Vitest.
 *
 * Replaces all motion.* elements with plain HTML equivalents so tests don't
 * emit "React does not recognize whileHover/whileTap/layoutId" warnings.
 * Vitest picks this up automatically via the __mocks__ convention.
 */
import React from 'react';

type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

/** Strip framer-motion-specific props before forwarding to the DOM element */
function stripMotionProps({
  whileHover,
  whileTap,
  whileFocus,
  whileDrag,
  whileInView,
  initial,
  animate,
  exit,
  transition,
  variants,
  layoutId,
  layout,
  drag,
  dragConstraints,
  dragElastic,
  dragMomentum,
  onDragStart,
  onDragEnd,
  onAnimationStart,
  onAnimationComplete,
  ...rest
}: AnyProps) {
  return rest;
}

const makeEl =
  <T extends keyof React.JSX.IntrinsicElements>(tag: T) =>
  ({ children, ...props }: AnyProps) =>
    React.createElement(tag, stripMotionProps(props) as object, children);

export const motion = {
  div: makeEl('div'),
  span: makeEl('span'),
  button: makeEl('button'),
  p: makeEl('p'),
  ul: makeEl('ul'),
  li: makeEl('li'),
  section: makeEl('section'),
  article: makeEl('article'),
  header: makeEl('header'),
  footer: makeEl('footer'),
  main: makeEl('main'),
  nav: makeEl('nav'),
  aside: makeEl('aside'),
  h1: makeEl('h1'),
  h2: makeEl('h2'),
  h3: makeEl('h3'),
  img: makeEl('img'),
  a: makeEl('a'),
  form: makeEl('form'),
  input: makeEl('input'),
  label: makeEl('label'),
};

export const AnimatePresence = ({ children }: { children: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);

export const useAnimation = () => ({ start: () => {}, stop: () => {}, set: () => {} });
export const useMotionValue = (initial: unknown) => ({ get: () => initial, set: () => {} });
export const useTransform = () => ({ get: () => 0 });
export const useSpring = (value: unknown) => value;
export const useInView = () => [null, false] as const;

// Re-export everything else from the real package so non-UI imports work
export * from 'framer-motion';
