import { describe, it, expect } from 'vitest';
import {
  springPresets,
  pageTransition,
  listItemVariants,
} from './useAnimationPresets';

describe('useAnimationPresets', () => {
  describe('springPresets', () => {
    it('exports snappy preset with correct spring config', () => {
      expect(springPresets.snappy).toEqual({
        type: 'spring',
        stiffness: 400,
        damping: 30,
      });
    });

    it('exports smooth preset with correct spring config', () => {
      expect(springPresets.smooth).toEqual({
        type: 'spring',
        stiffness: 200,
        damping: 25,
      });
    });

    it('exports bouncy preset with correct spring config', () => {
      expect(springPresets.bouncy).toEqual({
        type: 'spring',
        stiffness: 300,
        damping: 15,
      });
    });

    it('exports gentle preset with correct spring config', () => {
      expect(springPresets.gentle).toEqual({
        type: 'spring',
        stiffness: 120,
        damping: 20,
      });
    });

    it('exports heavy preset with mass property', () => {
      expect(springPresets.heavy).toMatchObject({
        type: 'spring',
        stiffness: 300,
        damping: 35,
        mass: 1.5,
      });
    });
  });

  describe('pageTransition', () => {
    it('has initial state with zero opacity and y offset', () => {
      expect(pageTransition.initial).toEqual({ opacity: 0, y: 20 });
    });

    it('has animate state with full opacity', () => {
      expect(pageTransition.animate).toMatchObject({ opacity: 1, y: 0 });
    });

    it('has exit state with zero opacity', () => {
      expect(pageTransition.exit).toMatchObject({ opacity: 0 });
    });
  });

  describe('listItemVariants', () => {
    it('has hidden state', () => {
      expect(listItemVariants.hidden).toEqual({ opacity: 0, y: 20 });
    });

    it('visible function returns correct transition with delay', () => {
      const result = listItemVariants.visible(2);
      expect(result).toMatchObject({ opacity: 1, y: 0 });
      expect(result.transition.delay).toBeCloseTo(0.1);
    });

    it('visible stagger delay scales with index', () => {
      const first = listItemVariants.visible(0);
      const third = listItemVariants.visible(2);
      expect(first.transition.delay).toBe(0);
      expect(third.transition.delay).toBeCloseTo(0.1);
    });
  });
});
