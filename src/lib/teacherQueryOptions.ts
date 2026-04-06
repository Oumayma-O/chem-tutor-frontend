import type { Query } from "@tanstack/react-query";

/** Shared with teacher dashboard queries that should not retry on 404/403. */
export const teacherQueryNoRetry = { retry: false as const };

/** Live presence (`GET .../live`) — shared by `useTeacherLivePresence`, SSE cache writes, and polling. */
export const TEACHER_LIVE_PRESENCE_STALE_MS = 5_000;
export const TEACHER_LIVE_PRESENCE_POLL_MS = 10_000;

/**
 * Poll every `intervalMs` while `isActive` is true; never poll when the query is in error state
 * (avoids hammering the API after a persistent failure).
 */
export function refetchIntervalWhileActive(intervalMs: number, isActive: boolean) {
  return (query: Query) => {
    if (query.state.status === "error") return false;
    return isActive ? intervalMs : false;
  };
}

/** Poll on an interval unless the query is in a hard error state (avoids hammering after 404/500). */
export function refetchIntervalUnlessError(intervalMs: number) {
  return (query: Query) => (query.state.status === "error" ? false : intervalMs);
}
