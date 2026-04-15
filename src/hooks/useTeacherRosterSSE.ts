import { useQueryClient } from "@tanstack/react-query";
import { getStoredToken } from "@/lib/api/core";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { useEventSourceConnection } from "@/hooks/useEventSourceConnection";

const API_URL = (import.meta.env.VITE_API_URL as string)?.replace(/\/$/, "") ?? "";

/**
 * SSE stream for real-time roster mastery updates.
 * Backend pushes updated roster data whenever a student's mastery changes.
 * Updates the same React Query cache key as the polling roster query,
 * so all components (Class tab, Students tab, stat cards) update instantly.
 */
export function useTeacherRosterSSE(options: {
  classId: string;
  enabled: boolean;
  unitId?: string;
  lessonIndex?: number;
}) {
  const { classId, enabled, unitId, lessonIndex } = options;
  const queryClient = useQueryClient();

  const filterUnit = unitId && unitId !== "all" ? unitId : undefined;
  const filterLesson = typeof lessonIndex === "number" ? lessonIndex : undefined;

  useEventSourceConnection({
    enabled: Boolean(enabled && classId && classId !== "all" && API_URL),
    reconnectKey: `${classId}:${filterUnit ?? ""}:${filterLesson ?? ""}`,
    getUrl: () => {
      const token = getStoredToken();
      if (!token) return null;
      const params = new URLSearchParams({ token: token });
      if (filterUnit) params.set("unit_id", filterUnit);
      if (filterLesson !== undefined) params.set("lesson_index", String(filterLesson));
      return `${API_URL}/teacher/classes/${classId}/roster/stream?${params.toString()}`;
    },
    onMessage: (data) => {
      try {
        const roster = JSON.parse(data);
        if (Array.isArray(roster)) {
          queryClient.setQueryData(teacherQueryKeys.roster(classId, filterUnit, filterLesson), roster);
        }
      } catch {
        // malformed payload — ignore, polling fallback will catch up
      }
    },
  });
}
