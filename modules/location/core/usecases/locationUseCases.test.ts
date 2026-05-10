import { describe, it, expect } from 'vitest';
import {
  validateCoordinates,
  normalizeTags,
} from './locationUseCases';

describe('validateCoordinates', () => {
  it('returns true when both are undefined', () => {
    expect(validateCoordinates(undefined, undefined)).toBe(true);
  });

  it('returns true for valid coordinates', () => {
    expect(validateCoordinates(13.7563, 100.5018)).toBe(true);
    expect(validateCoordinates(-90, -180)).toBe(true);
    expect(validateCoordinates(90, 180)).toBe(true);
    expect(validateCoordinates(0, 0)).toBe(true);
  });

  it('returns false for latitude out of range', () => {
    expect(validateCoordinates(91, 100)).toBe(false);
    expect(validateCoordinates(-91, 100)).toBe(false);
  });

  it('returns false for longitude out of range', () => {
    expect(validateCoordinates(13, 181)).toBe(false);
    expect(validateCoordinates(13, -181)).toBe(false);
  });

  it('returns true when only lat is provided and valid', () => {
    expect(validateCoordinates(45, undefined)).toBe(true);
  });

  it('returns true when only lng is provided and valid', () => {
    expect(validateCoordinates(undefined, 100)).toBe(true);
  });
});

describe('normalizeTags', () => {
  it('trims and lowercases tags', () => {
    expect(normalizeTags(['  Cozy ', 'SUNSET'])).toEqual(['cozy', 'sunset']);
  });

  it('removes duplicates', () => {
    expect(normalizeTags(['cozy', 'Cozy', 'COZY'])).toEqual(['cozy']);
  });

  it('removes empty strings after trimming', () => {
    expect(normalizeTags(['  ', '', 'valid'])).toEqual(['valid']);
  });

  it('returns empty array for empty input', () => {
    expect(normalizeTags([])).toEqual([]);
  });

  it('preserves order of first occurrence', () => {
    expect(normalizeTags(['b', 'a', 'B', 'c'])).toEqual(['b', 'a', 'c']);
  });
});
