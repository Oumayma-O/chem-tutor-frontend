/** React Query keys for student classroom / live session (shared by poll + SSE). */
export const studentQueryKeys = {
  liveSession: (classroomId: string) => ["student", "live-session", classroomId] as const,
};
