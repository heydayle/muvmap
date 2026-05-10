import { describe, it, expect, vi, beforeEach } from 'vitest';
import { matchMood } from './matchMood';
import { IMoodMatchRepository } from '../repositories/moodMatchRepository';
import { MoodMatchResult } from '../models/moodMatch';

const MOCK_RESULT: MoodMatchResult = {
  detectedMood: 'chill',
  locations: [],
  fromCache: false,
  fromFallback: false,
  generatedAt: new Date().toISOString(),
};

/** Creates a mock repository */
function makeMockRepo(): IMoodMatchRepository {
  return {
    matchMood: vi.fn().mockResolvedValue(MOCK_RESULT),
  };
}

describe('matchMood usecase', () => {
  let repo: IMoodMatchRepository;

  beforeEach(() => {
    repo = makeMockRepo();
  });

  it('passes through valid text input', async () => {
    await matchMood(repo, { inputType: 'text', text: 'I feel calm and peaceful' });
    expect(repo.matchMood).toHaveBeenCalledWith(
      expect.objectContaining({ inputType: 'text', text: 'I feel calm and peaceful' }),
    );
  });

  it('trims whitespace from text', async () => {
    await matchMood(repo, { inputType: 'text', text: '   cozy vibes   ' });
    expect(repo.matchMood).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'cozy vibes' }),
    );
  });

  it('truncates text exceeding 500 chars', async () => {
    const longText = 'a'.repeat(600);
    await matchMood(repo, { inputType: 'text', text: longText });
    const called = (repo.matchMood as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(called.text.length).toBe(500);
  });

  it('throws when text input is too short', async () => {
    await expect(
      matchMood(repo, { inputType: 'text', text: 'h' }),
    ).rejects.toThrow(/empty/i);
  });

  it('throws when emoji input is empty', async () => {
    await expect(
      matchMood(repo, { inputType: 'emoji', emoji: [] }),
    ).rejects.toThrow(/empty/i);
  });

  it('deduplicates emoji', async () => {
    await matchMood(repo, { inputType: 'emoji', emoji: ['😌', '😌', '😄'] });
    const called = (repo.matchMood as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(called.emoji).toEqual(['😌', '😄']);
  });

  it('adds requestedAt timestamp', async () => {
    await matchMood(repo, { inputType: 'emoji', emoji: ['😄'] });
    const called = (repo.matchMood as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(called.requestedAt).toBeDefined();
    expect(typeof called.requestedAt).toBe('string');
  });

  it('returns the repository result unchanged', async () => {
    const result = await matchMood(repo, { inputType: 'emoji', emoji: ['😄'] });
    expect(result).toEqual(MOCK_RESULT);
  });
});
