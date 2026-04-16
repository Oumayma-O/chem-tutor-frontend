import { useQueryClient } from "@tanstack/react-query";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import type { ExitTicketsForClass, TimedPracticeAnalytics } from "@/services/api/teacher";
import type { LiveStudentEntry } from "@/services/api/presence";
import { useEventSourceConnection } from "@/hooks/useEventSourceConnection";
import { getSseToken } from "@/lib/sseToken";

const API_URL = (import.meta.env.VITE_API_URL as string)?.replace(/\/$/, "") ?? "";

function exitTicketsStreamUrl(
  classId: string,
  page: number,
  limit: number,
  unitId: string,
  lessonId: string,
  days: string,
  token: string,
): string {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    token,
  });
  if (unitId) params.set("unit_id", unitId);
  if (lessonId) params.set("lesson_id", lessonId);
  if (days && days !== "all") params.set("days", days);
  return `${API_URL}/teacher/exit-tickets/${classId}/stream?${params.toString()}`;
}

/**
 * SSE: live student presence — updates cache for {@link teacherQueryKeys.live}.
 * Prefer a single subscription per class from {@link TeacherDashboardPage}.
 */
export function useTeacherLiveSSE(options: { classId: string | undefined; enabled: boolean }) {
  const { classId, enabled } = options;
  const queryClient = useQueryClient();
  const reconnectKey = classId ?? "";

  useEventSourceConnection({
    enabled: Boolean(enabled && classId && API_URL),
    reconnectKey,
    getUrl: async () => {
      const token = await getSseToken();
      if (!token || !classId) return null;
      return `${API_URL}/teacher/classes/${classId}/live/stream?token=${encodeURIComponent(token)}`;
    },
    onMessage: (data) => {
      try {
        const rows = JSON.parse(data) as LiveStudentEntry[];
        if (Array.isArray(rows) && classId) {
          queryClient.setQueryData(teacherQueryKeys.live(classId), rows);
        }
      } catch {
        // ignore malformed payloads
      }
    },
  });
}

/**
 * SSE: exit ticket list + responses — must match {@link teacherQueryKeys.exitTickets.list}.
 */
export function useTeacherExitTicketsSSE(options: {
  classId: string | undefined;
  page: number;
  limit: number;
  unitId: string;
  lessonId: string;
  /** `"all"` or day window e.g. `"30"` — must match {@link teacherQueryKeys.exitTickets.list}. */
  days: string;
  enabled: boolean;
}) {
  const { classId, page, limit, unitId, lessonId, days, enabled } = options;
  const queryClient = useQueryClient();
  const reconnectKey = `${classId ?? ""}-${page}-${limit}-${unitId}-${lessonId}-${days}`;

  useEventSourceConnection({
    enabled: Boolean(enabled && classId && API_URL),
    reconnectKey,
    getUrl: async () => {
      const token = await getSseToken();
      if (!token || !classId) return null;
      return exitTicketsStreamUrl(classId, page, limit, unitId, lessonId, days, token);
    },
    onMessage: (data) => {
      try {
        const parsed = JSON.parse(data) as ExitTicketsForClass;
        if (parsed && typeof parsed === "object" && classId) {
          queryClient.setQueryData(
            teacherQueryKeys.exitTickets.list(classId, page, limit, unitId, lessonId, days),
            parsed,
          );
        }
      } catch {
        // ignore
      }
    },
  });
}

/**
 * SSE: timed practice analytics — {@link teacherQueryKeys.practiceAnalytics}.
 */
export function useTeacherPracticeAnalyticsSSE(options: {
  classId: string | undefined;
  sessionId: string | undefined;
  enabled: boolean;
}) {
  const { classId, sessionId, enabled } = options;
  const queryClient = useQueryClient();
  const reconnectKey = `${classId ?? ""}-${sessionId ?? ""}`;

  useEventSourceConnection({
    enabled: Boolean(enabled && classId && sessionId && API_URL),
    reconnectKey,
    getUrl: async () => {
      const token = await getSseToken();
      if (!token || !classId || !sessionId) return null;
      return `${API_URL}/teacher/classes/${classId}/sessions/${sessionId}/practice-analytics/stream?token=${encodeURIComponent(token)}`;
    },
    onMessage: (data) => {
      try {
        const parsed = JSON.parse(data) as TimedPracticeAnalytics;
        if (parsed && typeof parsed === "object" && parsed.session_id && classId && sessionId) {
          queryClient.setQueryData(
            teacherQueryKeys.practiceAnalytics(classId, sessionId),
            parsed,
          );
        }
      } catch {
        // ignore
      }
    },
  });
}
