/**
 * Module-level singleton cache + prefetch queue for generated problems.
 *
 * Cache guarantees:
 *  - Survives React component unmounts (route changes) — an in-flight LLM call
 *    started from LessonOverview keeps running even if the user navigates away.
 *  - When the user returns to Practice, useProblemNavigation finds the resolved
 *    result instantly instead of re-firing the API.
 *  - Backend asyncio.shield() persists the problem to the DB playlist even on
 *    client disconnect, so the result is never lost across hard refreshes.
 *
 * Queue guarantees (enqueuePrefetch):
 *  - At most MAX_CONCURRENT background requests run simultaneously.
 *  - Additional requests wait in a FIFO queue and fire as slots open.
 *  - Duplicate keys (same lesson already cached or queued) are silently dropped.
 *
 * Keyed by "unitId__lessonIndex__level".
 */

import type { GenerateResult } from "@/hooks/useGeneratedProblem";

const GC_TIME_MS = 1000 * 60 * 60; // 1 hour
const MAX_CONCURRENT = 2;

interface CacheEntry {
  /** The live promise (never aborted — component unmounts are ignored). */
  promise: Promise<GenerateResult>;
  /** Set when the promise resolves successfully. */
  result?: GenerateResult;
  /** Epoch ms of resolution — used for GC. */
  resolvedAt?: number;
}

interface QueueItem {
  unitId: string;
  lessonIndex: number;
  level: number;
  makeRequest: () => Promise<GenerateResult>;
}

const store = new Map<string, CacheEntry>();
let activePrefetches = 0;
const prefetchQueue: QueueItem[] = [];

function cacheKey(unitId: string, lessonIndex: number, level: number): string {
  return `${unitId}__${lessonIndex}__${level}`;
}

// Keep the old name as an alias so internal callers don't need changing.
function key(unitId: string, lessonIndex: number, level: number): string {
  return cacheKey(unitId, lessonIndex, level);
}

function isStale(entry: CacheEntry): boolean {
  return (
    entry.resolvedAt !== undefined &&
    Date.now() - entry.resolvedAt > GC_TIME_MS
  );
}

/** Start a queued item immediately (caller must have incremented activePrefetches). */
function startItem({ unitId, lessonIndex, level, makeRequest }: QueueItem): void {
  const k = cacheKey(unitId, lessonIndex, level);
  const promise = makeRequest();
  const entry: CacheEntry = { promise };
  store.set(k, entry);

  promise
    .then((result) => {
      entry.result = result;
      entry.resolvedAt = Date.now();
    })
    .catch(() => {
      // Remove failed entries so a retry can re-populate the cache.
      store.delete(k);
    })
    .finally(() => {
      activePrefetches--;
      drainQueue();
    });
}

/** Fire queued items until MAX_CONCURRENT is reached or the queue is empty. */
function drainQueue(): void {
  while (activePrefetches < MAX_CONCURRENT && prefetchQueue.length > 0) {
    const item = prefetchQueue.shift()!;
    if (store.has(cacheKey(item.unitId, item.lessonIndex, item.level))) {
      // Already cached (e.g. direct setPrefetchPromise was called while it waited)
      continue;
    }
    activePrefetches++;
    startItem(item);
  }
}

/**
 * Enqueue a background prefetch request.
 *
 * - If fewer than MAX_CONCURRENT prefetches are active → starts immediately.
 * - Otherwise → added to the FIFO queue and fires when a slot opens.
 * - No-op if the key is already in-flight, cached, or already queued.
 *
 * The `makeRequest` factory is only called when the item actually dequeues,
 * so no HTTP request is made for items waiting in the queue.
 */
export function enqueuePrefetch(
  unitId: string,
  lessonIndex: number,
  level: number,
  makeRequest: () => Promise<GenerateResult>,
): void {
  const k = cacheKey(unitId, lessonIndex, level);
  if (store.has(k)) return; // already in-flight or resolved

  // Deduplicate the queue
  if (prefetchQueue.some((qi) => cacheKey(qi.unitId, qi.lessonIndex, qi.level) === k)) return;

  const item: QueueItem = { unitId, lessonIndex, level, makeRequest };
  if (activePrefetches < MAX_CONCURRENT) {
    activePrefetches++;
    startItem(item);
  } else {
    prefetchQueue.push(item);
  }
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
