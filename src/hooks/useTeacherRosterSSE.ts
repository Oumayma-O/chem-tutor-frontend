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
}) {
  const { classId, enabled } = options;
  const queryClient = useQueryClient();

  useEventSourceConnection({
    enabled: Boolean(enabled && classId && classId !== "all" && API_URL),
    reconnectKey: classId,
    getUrl: () => {
      const token = getStoredToken();
      if (!token) return null;
      return `${API_URL}/teacher/classes/${classId}/roster/stream?token=${encodeURIComponent(token)}`;
    },
    onMessage: (data) => {
      try {
        const roster = JSON.parse(data);
        if (Array.isArray(roster)) {
          queryClient.setQueryData(teacherQueryKeys.roster(classId), roster);
        }
      } catch {
        // malformed payload — ignore, polling fallback will catch up
      }
    },
  });
}
