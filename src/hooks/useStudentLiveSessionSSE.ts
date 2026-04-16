import { useQueryClient } from "@tanstack/react-query";
import { studentQueryKeys } from "@/lib/studentQueryKeys";
import { normalizeLiveSession } from "@/services/api/classroomSession";
import { useEventSourceConnection } from "@/hooks/useEventSourceConnection";
import { getSseToken } from "@/lib/sseToken";

const API_URL = (import.meta.env.VITE_API_URL as string)?.replace(/\/$/, "") ?? "";

/**
 * Server-Sent Events for `/classrooms/me/live-session/stream` — updates the same React Query
 * cache as polling (`useStudentLiveSessionTimedSync`, `ClassroomLiveBanner`).
 */
export function useStudentLiveSessionSSE(options: {
  enabled: boolean;
  classroomId: string | undefined;
}) {
  const { enabled, classroomId } = options;
  const queryClient = useQueryClient();
  const reconnectKey = classroomId ?? "";

  useEventSourceConnection({
    enabled: Boolean(enabled && classroomId && API_URL),
    reconnectKey,
    getUrl: async () => {
      const token = await getSseToken();
      if (!token) return null;
      return `${API_URL}/classrooms/me/live-session/stream?token=${encodeURIComponent(token)}`;
    },
    onMessage: (data) => {
      try {
        const normalized = normalizeLiveSession(JSON.parse(data));
        if (normalized && classroomId) {
          queryClient.setQueryData(studentQueryKeys.liveSession(classroomId), normalized);
        }
      } catch {
        // malformed payload — ignore
      }
    },
  });
}
