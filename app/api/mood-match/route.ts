import { NextRequest, NextResponse } from 'next/server';
import {
  MoodMatchInput,
  MoodMatchResult,
  MoodMatchedLocation,
  getMoodAlignment,
  EMOJI_MOOD_MAP,
} from '@/modules/mood-matching/core/models/moodMatch';
import { MoodCategory } from '@/shared/types';
import { getSupabaseServer, isSupabaseConfigured } from '@/shared/utils/supabase';

// ─── Feature Flags ─────────────────────────────────────────────────────────
// Source: rules/features/mood-matching/flag.md

/** Master switch: enables the entire mood matching feature */
const MOOD_MATCHING_ENABLED = true;
/** Route AI requests through Dify workflow pipeline */
const DIFY_WORKFLOW_ENABLED = true;
/** Use DeepSeek as the LLM backend */
const DEEPSEEK_LLM_ENABLED = true;
/** Fall back to rule-based matching when AI pipeline fails */
const FALLBACK_RULE_BASED_ENABLED = true;
/** Maximum number of locations sent to LLM as context */
const MAX_LOCATIONS_CONTEXT = 20;
/** Append AI reasoning to each result */
const REASONING_ENABLED = true;
/** Per-user rate limit: max AI calls per window */
const RATE_LIMIT_ENABLED = true;
/** Max requests per user per window */
const RATE_LIMIT_MAX = 10;
/** Rate limit window in milliseconds (1 hour) */
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// ─── In-Memory Rate Limiter ─────────────────────────────────────────────────

/** Simple in-memory rate limit store. Resets on server restart. */
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

/**
 * Checks and enforces per-user rate limits.
 *
 * @param userId - User identifier (IP or user ID)
 * @returns true if the request is allowed, false if rate limited
 */
function checkRateLimit(userId: string): boolean {
  if (!RATE_LIMIT_ENABLED) return true;

  const now = Date.now();
  const record = rateLimitStore.get(userId);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) return false;

  record.count += 1;
  return true;
}

// ─── Mood Detection ─────────────────────────────────────────────────────────

/** Keyword-to-mood heuristic for rule-based detection */
const MOOD_KEYWORDS: Record<MoodCategory, string[]> = {
  calm: ['calm', 'peaceful', 'quiet', 'relax', 'serene', 'tranquil', 'chill out', 'gentle'],
  sad: ['sad', 'lonely', 'blue', 'melancholy', 'down', 'depressed', 'gloomy', 'unhappy'],
  happy: ['happy', 'joy', 'great', 'wonderful', 'cheerful', 'amazing', 'fantastic', 'fun'],
  romantic: ['romantic', 'love', 'date', 'couple', 'intimate', 'cozy', 'sweet', 'affection'],
  energetic: ['energetic', 'active', 'workout', 'run', 'exercise', 'pumped', 'motivated'],
  chill: ['chill', 'vibe', 'mellow', 'laid back', 'lazy', 'lounge', 'easygoing', 'casual'],
  excited: ['excited', 'thrill', 'adventure', 'party', 'celebrate', 'hype', 'pumped up'],
};

/**
 * Detects mood from text using keyword heuristics.
 *
 * @param text - User's mood description
 * @returns Best matching mood category
 */
function detectMoodFromText(text: string): MoodCategory {
  const lower = text.toLowerCase();
  const scores: Record<MoodCategory, number> = {
    calm: 0, sad: 0, happy: 0, romantic: 0, energetic: 0, chill: 0, excited: 0,
  };

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[mood as MoodCategory] += 1;
    }
  }

  const best = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  return (best[1] > 0 ? best[0] : 'chill') as MoodCategory;
}

/**
 * Detects mood from emoji selections using the EMOJI_MOOD_MAP.
 *
 * @param emoji - Array of selected emoji strings
 * @returns Most frequent mood category among selected emoji
 */
function detectMoodFromEmoji(emoji: string[]): MoodCategory {
  const tally: Partial<Record<MoodCategory, number>> = {};
  for (const e of emoji) {
    const mood = EMOJI_MOOD_MAP[e];
    if (mood) tally[mood] = (tally[mood] ?? 0) + 1;
  }
  const entries = Object.entries(tally) as [MoodCategory, number][];
  if (entries.length === 0) return 'chill';
  return entries.sort(([, a], [, b]) => b - a)[0][0];
}

// ─── Rule-Based Engine ──────────────────────────────────────────────────────

/** Mood-to-tag heuristic mapping for rule-based matching */
const MOOD_TAG_AFFINITY: Record<MoodCategory, string[]> = {
  calm: ['quiet', 'nature', 'park', 'garden', 'lake', 'peaceful', 'cafe', 'cozy'],
  sad: ['warm', 'comfort food', 'cozy', 'cafe', 'indoor', 'quiet', 'bookstore'],
  happy: ['fun', 'outdoor', 'social', 'market', 'food', 'community', 'lively'],
  romantic: ['rooftop', 'fine dining', 'sunset', 'scenic', 'intimate', 'candlelit'],
  energetic: ['gym', 'sports', 'outdoor', 'trail', 'active', 'climbing', 'beach'],
  chill: ['bar', 'lounge', 'music', 'rooftop', 'outdoor', 'vibe', 'hangout'],
  excited: ['nightlife', 'event', 'party', 'entertainment', 'adventure', 'festival'],
};

/** Stub location type used by the rule-based fallback */
interface StubLocation {
  id: string;
  name: string;
  description: string | null;
  mood_category: MoodCategory | null;
  tags: { name: string }[];
  latitude: number | null;
  longitude: number | null;
}

/**
 * Scores a location against the target mood using tag affinity.
 *
 * @param location - Location to score
 * @param mood - Target mood
 * @returns Relevance score from 0–1
 */
function scoreLocationForMood(location: StubLocation, mood: MoodCategory): number {
  const affinityTags = MOOD_TAG_AFFINITY[mood];
  const locationTags = location.tags.map((t) => t.name.toLowerCase());
  const directMoodMatch = location.mood_category === mood ? 0.3 : 0;

  const tagScore = locationTags.reduce((acc, tag) => {
    const match = affinityTags.some((at) => tag.includes(at) || at.includes(tag));
    return acc + (match ? 0.1 : 0);
  }, 0);

  return Math.min(1, directMoodMatch + tagScore);
}

/**
 * Rule-based fallback engine — ranks locations by mood affinity without AI.
 * Source: flag.md Story 4.
 *
 * @param locations - Available locations from DB
 * @param detectedMood - The target mood
 * @returns Ranked array of mood-matched locations
 */
function ruleBasedMatch(
  locations: StubLocation[],
  detectedMood: MoodCategory,
): MoodMatchedLocation[] {
  return locations
    .map((loc) => {
      const score = scoreLocationForMood(loc, detectedMood);
      return {
        id: loc.id,
        name: loc.name,
        description: loc.description,
        mood_category: loc.mood_category,
        tags: loc.tags.map((t) => t.name),
        latitude: loc.latitude,
        longitude: loc.longitude,
        relevanceScore: score,
        moodAlignment: getMoodAlignment(score),
        reasoning: REASONING_ENABLED
          ? `This spot matches your ${detectedMood} mood based on its vibe and tags.`
          : null,
      };
    })
    .filter((loc) => loc.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
}

// ─── Dify Workflow Client ───────────────────────────────────────────────────

interface DifyWorkflowResponse {
  data?: {
    outputs?: {
      detected_mood?: string;
      locations?: {
        id: string;
        relevance_score: number;
        reasoning: string;
      }[];
    };
    status?: string;
    error?: string;
  };
}

/**
 * Calls the Dify workflow API for AI-powered mood matching.
 * Source: flag.md Story 2.
 *
 * @param input - Normalized mood input
 * @param locationContext - Pre-filtered locations to send as context
 * @returns Dify workflow response
 */
async function callDifyWorkflow(
  input: MoodMatchInput,
  locationContext: StubLocation[],
): Promise<DifyWorkflowResponse> {
  const difyUrl = process.env.DIFY_WORKFLOW_URL ?? 'https://api.dify.ai/v1/workflows/run';
  const difyKey = process.env.DIFY_API_KEY ?? '';

  const payload = {
    inputs: {
      mood_text: input.text ?? '',
      mood_emoji: (input.emoji ?? []).join(' '),
      input_type: input.inputType,
      location_context: JSON.stringify(
        locationContext.slice(0, MAX_LOCATIONS_CONTEXT).map((l) => ({
          id: l.id,
          name: l.name,
          tags: l.tags.map((t) => t.name),
          mood_category: l.mood_category,
        })),
      ),
      reasoning_enabled: String(REASONING_ENABLED),
      deepseek_enabled: String(DEEPSEEK_LLM_ENABLED),
    },
    response_mode: 'blocking',
    user: 'moodmap-system',
  };

  const res = await fetch(difyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${difyKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Dify request failed: ${res.statusText}`);
  }

  return res.json() as Promise<DifyWorkflowResponse>;
}

// ─── Location Source ────────────────────────────────────────────────────────

/**
 * Fetches locations from Supabase when configured, otherwise returns mock data.
 * Tags are normalised to { name: string }[] to match StubLocation interface.
 */
async function getLocations(): Promise<StubLocation[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseServer();
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, latitude, longitude, mood_category, tags')
        .limit(200);

      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        description: null,
        mood_category: (row.mood_category as MoodCategory) ?? null,
        // DB stores tags as comma-joined string → split to { name: string }[]
        tags: typeof row.tags === 'string'
          ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean).map((t: string) => ({ name: t }))
          : [],
        latitude: row.latitude,
        longitude: row.longitude,
      }));
    } catch (err) {
      console.warn('[mood-match] Supabase fetch failed, using mock locations:', err);
    }
  }

  return getMockLocations();
}

/** Generates a realistic set of mock locations for development/demo */
function getMockLocations(): StubLocation[] {
  return [
    {
      id: 'loc-1', name: 'The Secret Garden Café', description: 'A peaceful hideaway with blooming plants and gentle jazz.',
      mood_category: 'calm', tags: [{ name: 'cafe' }, { name: 'quiet' }, { name: 'garden' }, { name: 'cozy' }],
      latitude: 10.7769, longitude: 106.7009,
    },
    {
      id: 'loc-2', name: 'Skyline Rooftop Bar', description: 'City panoramas, craft cocktails, and sunset vibes.',
      mood_category: 'chill', tags: [{ name: 'rooftop' }, { name: 'bar' }, { name: 'sunset' }, { name: 'scenic' }],
      latitude: 10.7760, longitude: 106.7010,
    },
    {
      id: 'loc-3', name: 'Bloom Bistro', description: 'Romantic candlelit dinners with French-inspired cuisine.',
      mood_category: 'romantic', tags: [{ name: 'fine dining' }, { name: 'romantic' }, { name: 'candlelit' }, { name: 'intimate' }],
      latitude: 10.7780, longitude: 106.6990,
    },
    {
      id: 'loc-4', name: 'Pulse Fitness Park', description: 'Outdoor gym and running tracks for high-energy workouts.',
      mood_category: 'energetic', tags: [{ name: 'gym' }, { name: 'outdoor' }, { name: 'sports' }, { name: 'active' }],
      latitude: 10.7750, longitude: 106.7020,
    },
    {
      id: 'loc-5', name: 'Echo Night Club', description: "The city's hottest club with world-class DJs every weekend.",
      mood_category: 'excited', tags: [{ name: 'nightlife' }, { name: 'party' }, { name: 'music' }, { name: 'entertainment' }],
      latitude: 10.7790, longitude: 106.7000,
    },
    {
      id: 'loc-6', name: 'Morning Dew Lakeside', description: 'Serene lake views, perfect for meditation and reflection.',
      mood_category: 'calm', tags: [{ name: 'lake' }, { name: 'nature' }, { name: 'peaceful' }, { name: 'outdoor' }],
      latitude: 10.7740, longitude: 106.6980,
    },
    {
      id: 'loc-7', name: 'The Comfort Kitchen', description: 'Warm, homestyle cooking that wraps you in a hug.',
      mood_category: 'sad', tags: [{ name: 'comfort food' }, { name: 'warm' }, { name: 'cozy' }, { name: 'indoor' }],
      latitude: 10.7770, longitude: 106.7030,
    },
    {
      id: 'loc-8', name: 'Festival Grounds', description: 'Live events, food stalls, and a community atmosphere.',
      mood_category: 'happy', tags: [{ name: 'festival' }, { name: 'community' }, { name: 'social' }, { name: 'outdoor' }],
      latitude: 10.7800, longitude: 106.6970,
    },
    {
      id: 'loc-9', name: 'Velvet Lounge', description: 'Low-key jazz lounge with mellow beats and good wine.',
      mood_category: 'chill', tags: [{ name: 'lounge' }, { name: 'jazz' }, { name: 'music' }, { name: 'vibe' }],
      latitude: 10.7755, longitude: 106.7015,
    },
    {
      id: 'loc-10', name: 'Sunrise Trail', description: 'A challenging trail for those who want to feel alive.',
      mood_category: 'energetic', tags: [{ name: 'trail' }, { name: 'hiking' }, { name: 'outdoor' }, { name: 'active' }],
      latitude: 10.7745, longitude: 106.6995,
    },
    {
      id: 'loc-11', name: 'Paper & Ink Bookstore', description: 'A cozy bookstore café for quiet afternoons and good reads.',
      mood_category: 'calm', tags: [{ name: 'bookstore' }, { name: 'quiet' }, { name: 'indoor' }, { name: 'cozy' }],
      latitude: 10.7765, longitude: 106.7005,
    },
    {
      id: 'loc-12', name: 'Golden Hour Beach', description: 'Magical sunsets and beach bonfires for good times.',
      mood_category: 'happy', tags: [{ name: 'beach' }, { name: 'outdoor' }, { name: 'social' }, { name: 'fun' }],
      latitude: 10.7800, longitude: 106.7040,
    },
  ];
}

// ─── Route Handler ──────────────────────────────────────────────────────────

/**
 * POST /api/mood-match
 *
 * Accepts mood input and returns ranked location recommendations.
 * Pipeline: Dify → DeepSeek → Rule-based fallback (if AI fails).
 * Respects all feature flags from flag.md.
 *
 * @param req - Next.js request with MoodMatchInput JSON body
 * @returns MoodMatchResult or error response
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!MOOD_MATCHING_ENABLED) {
    return NextResponse.json({ error: 'Mood matching is currently disabled.' }, { status: 503 });
  }

  // Rate limiting — use IP as user identifier
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      { status: 429 },
    );
  }

  let input: MoodMatchInput;
  try {
    input = (await req.json()) as MoodMatchInput;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Detect mood from input
  const detectedMood: MoodCategory =
    input.inputType === 'emoji' && input.emoji?.length
      ? detectMoodFromEmoji(input.emoji)
      : detectMoodFromText(input.text ?? '');

  const locations = await getLocations();
  const generatedAt = new Date().toISOString();

  // ── Try AI pipeline first ─────────────────────────────────────────────────
  if (DIFY_WORKFLOW_ENABLED) {
    try {
      const difyRes = await callDifyWorkflow(input, locations);
      const outputs = difyRes?.data?.outputs;

      if (outputs?.locations?.length) {
        const aiMood = (outputs.detected_mood as MoodCategory) ?? detectedMood;
        const matched: MoodMatchedLocation[] = outputs.locations
          .map((aiLoc) => {
            const source = locations.find((l) => l.id === aiLoc.id);
            if (!source) return null;
            const score = Math.min(1, Math.max(0, aiLoc.relevance_score));
            return {
              id: source.id,
              name: source.name,
              description: source.description,
              mood_category: source.mood_category,
              tags: source.tags.map((t) => t.name),
              latitude: source.latitude,
              longitude: source.longitude,
              relevanceScore: score,
              moodAlignment: getMoodAlignment(score),
              reasoning: REASONING_ENABLED ? aiLoc.reasoning : null,
            } satisfies MoodMatchedLocation;
          })
          .filter((l): l is MoodMatchedLocation => l !== null);

        const result: MoodMatchResult = {
          detectedMood: aiMood,
          locations: matched,
          fromCache: false,
          fromFallback: false,
          generatedAt,
        };
        return NextResponse.json(result);
      }
    } catch (err) {
      console.warn('[mood-match] Dify pipeline failed, falling back:', err);
    }
  }

  // ── Rule-based fallback ───────────────────────────────────────────────────
  if (!FALLBACK_RULE_BASED_ENABLED) {
    return NextResponse.json(
      { error: 'AI service is unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  const fallbackLocations = ruleBasedMatch(locations, detectedMood);
  const result: MoodMatchResult = {
    detectedMood,
    locations: fallbackLocations,
    fromCache: false,
    fromFallback: true,
    generatedAt,
  };
  return NextResponse.json(result);
}
