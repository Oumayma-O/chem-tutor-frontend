import { useQuery } from "@tanstack/react-query";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { getLiveClassStatus } from "@/services/api/presence";
import {
  teacherQueryNoRetry,
  refetchIntervalUnlessError,
  TEACHER_LIVE_PRESENCE_STALE_MS,
  TEACHER_LIVE_PRESENCE_POLL_MS,
} from "@/lib/teacherQueryOptions";

/**
 * Canonical hook for live class presence (`GET /teacher/classes/{id}/live`).
 * SSE (`useTeacherLiveSSE`) writes the same React Query cache key; polling runs here only so
 * intervals are not duplicated across `LiveSessionPanel` / monitoring / dashboard.
 */
export function useTeacherLivePresence(options: {
  classId: string | null | undefined;
  /** Defaults to `Boolean(classId)`. */
  enabled?: boolean;
}) {
  const { classId, enabled: enabledOverride } = options;
  const hasId = Boolean(classId);
  const enabled = enabledOverride ?? hasId;

  return useQuery({
    queryKey: teacherQueryKeys.live(classId ?? "__none__"),
    queryFn: () => getLiveClassStatus(classId!),
    enabled: enabled && hasId,
    staleTime: TEACHER_LIVE_PRESENCE_STALE_MS,
    refetchInterval: refetchIntervalUnlessError(TEACHER_LIVE_PRESENCE_POLL_MS),
    ...teacherQueryNoRetry,
  });
}
