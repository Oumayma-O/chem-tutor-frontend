/**
 * Module-level singleton cache for generated problems.
 *
 * Survives React component unmounts (route changes), so:
 *  - An in-flight LLM call started from LessonOverview continues running even
 *    if the user navigates away before the 1.5 s prefetch fires or completes.
 *  - When the user returns to the Practice page, useProblemNavigation finds
 *    the resolved result instantly instead of re-firing the API.
 *
 * Keyed by "unitId__lessonIndex__level" (all three parts are required for
 * correctness — same lesson at different levels is a different problem set).
 */

import type { GenerateResult } from "@/hooks/useGeneratedProblem";

const GC_TIME_MS = 1000 * 60 * 60; // 1 hour

interface CacheEntry {
  /** The live promise (never aborted — component unmounts are ignored). */
  promise: Promise<GenerateResult>;
  /** Set when the promise resolves successfully. */
  result?: GenerateResult;
  /** Epoch ms of resolution — used for GC. */
  resolvedAt?: number;
}

const store = new Map<string, CacheEntry>();

function key(unitId: string, lessonIndex: number, level: number): string {
  return `${unitId}__${lessonIndex}__${level}`;
}

function isStale(entry: CacheEntry): boolean {
  return (
    entry.resolvedAt !== undefined &&
    Date.now() - entry.resolvedAt > GC_TIME_MS
  );
}

/**
 * Store a promise for a given problem request.
 * No-op if an entry already exists (prevents duplicate in-flight requests).
 */
export function setPrefetchPromise(
  unitId: string,
  lessonIndex: number,
  level: number,
  promise: Promise<GenerateResult>,
): void {
  const k = key(unitId, lessonIndex, level);
  if (store.has(k)) return;

  const entry: CacheEntry = { promise };
  store.set(k, entry);

  promise
    .then((result) => {
      entry.result = result;
      entry.resolvedAt = Date.now();
    })
    .catch(() => {
      // Remove failed entries so a retry can populate the cache again.
      store.delete(k);
    });
}

/**
 * Returns the cached promise if one exists and hasn't gone stale.
 * Callers can `await` this to attach to an in-flight or already-resolved request.
 */
export function getCachedPromise(
  unitId: string,
  lessonIndex: number,
  level: number,
): Promise<GenerateResult> | null {
  const k = key(unitId, lessonIndex, level);
  const entry = store.get(k);
  if (!entry) return null;
  if (isStale(entry)) {
    store.delete(k);
    return null;
  }
  return entry.promise;
}

/**
 * Returns the resolved result synchronously if available (and not stale).
 * Use this for the fast-path check before awaiting the promise.
 */
export function getResolvedResult(
  unitId: string,
  lessonIndex: number,
  level: number,
): GenerateResult | null {
  const k = key(unitId, lessonIndex, level);
  const entry = store.get(k);
  if (!entry?.result) return null;
  if (isStale(entry)) {
    store.delete(k);
    return null;
  }
  return entry.result;
}

/** Explicitly evict a cache entry (e.g. when the user requests a fresh problem). */
export function evictCache(
  unitId: string,
  lessonIndex: number,
  level: number,
): void {
  store.delete(key(unitId, lessonIndex, level));
}
