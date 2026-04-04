/**
 * Shared React Query configuration for static/session-level data.
 *
 * "Static" means the data does not change while the app tab is open:
 * curriculum, unit metadata, lesson reference cards, etc.
 *
 * Single source of truth — imported by every hook and prefetch site
 * so a cache-policy change requires editing exactly one file.
 */

/** Never consider static data stale within a session. */
export const SESSION_CACHE_MS = Number.POSITIVE_INFINITY;

/**
 * Drop-in useQuery options for static data.
 * Spread into any useQuery / prefetchQuery call:
 *
 *   useQuery({ queryKey, queryFn, ...staticQueryOptions })
 */
/**
 * For useQuery — includes refetch guards.
 * Spread into any useQuery call.
 */
export const staticQueryOptions = {
  staleTime: SESSION_CACHE_MS,
  gcTime: SESSION_CACHE_MS,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

/**
 * For prefetchQuery / fetchQuery — staleTime + gcTime only.
 * prefetchQuery accepts FetchQueryOptions which does not include refetch* flags.
 */
export const staticFetchOptions = {
  staleTime: SESSION_CACHE_MS,
  gcTime: SESSION_CACHE_MS,
} as const;

/** Shared React Query error → user-facing string (static data hooks). */
export function queryErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
