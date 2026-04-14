/**
 * Fallback when the API does not send `max_answer_reveals_per_lesson` (dev or older backend).
 * Prefer server values from problem delivery and `/classrooms/me/live-session`.
 * Set `VITE_TUTOR_MAX_ANSWER_REVEALS_PER_LESSON` in `.env` (see `.env.example`).
 */
const DEFAULT_FALLBACK_MAX_ANSWER_REVEALS_PER_LESSON = 6;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

let cachedFallback: number | null = null;

/** Used only when live session + problem payloads omit the cap. */
export function getFallbackMaxAnswerRevealsPerLesson(): number {
  if (cachedFallback !== null) return cachedFallback;
  cachedFallback = parsePositiveInt(
    import.meta.env.VITE_TUTOR_MAX_ANSWER_REVEALS_PER_LESSON,
    DEFAULT_FALLBACK_MAX_ANSWER_REVEALS_PER_LESSON,
  );
  return cachedFallback;
}

const DEFAULT_FALLBACK_MIN_LEVEL1_FOR_LEVEL2 = 2;
let cachedFallbackMinL1: number | null = null;

/** When live session + problem payloads omit `min_level1_examples_for_level2`. */
export function getFallbackMinLevel1ExamplesForLevel2(): number {
  if (cachedFallbackMinL1 !== null) return cachedFallbackMinL1;
  cachedFallbackMinL1 = parsePositiveInt(
    import.meta.env.VITE_TUTOR_MIN_LEVEL1_EXAMPLES_FOR_LEVEL2,
    DEFAULT_FALLBACK_MIN_LEVEL1_FOR_LEVEL2,
  );
  return cachedFallbackMinL1;
}
