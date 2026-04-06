/**
 * Centralized React Query keys for the teacher dashboard so invalidation and SSE
 * cache writes stay aligned.
 */
export const teacherQueryKeys = {
  all: ["teacher"] as const,

  classes: () => ["teacher", "classes"] as const,

  roster: (classId: string) => ["teacher", "roster", classId] as const,

  /** Live presence rows (GET /teacher/classes/{id}/live). */
  live: (classId: string) => ["teacher", "live", classId] as const,

  /** Class analytics POST (chapter-scoped). */
  classAnalytics: (classId: string, chapterId: string | null) =>
    ["teacher", "analytics", classId, chapterId] as const,

  exitTickets: {
    /** Prefix for invalidateQueries — matches all exit-ticket queries for a class. */
    byClass: (classId: string) => ["teacher", "exit-tickets", classId] as const,

    list: (classId: string, page: number, limit: number, unitId: string, lessonId: string) =>
      ["teacher", "exit-tickets", classId, page, limit, unitId, lessonId] as const,

    studentPanel: (classId: string) => ["teacher", "exit-tickets", classId, "student-panel"] as const,

    misconceptions: (classId: string, ticketId: string) =>
      ["teacher", "misconceptions", classId, ticketId] as const,

    aggregate: (classId: string) => ["teacher", "misconceptions-aggregate", classId] as const,
  },

  sessions: (classId: string, limit: number) => ["teacher", "sessions", classId, limit] as const,

  practiceAnalytics: (classId: string, sessionId: string) =>
    ["teacher", "practice-analytics", classId, sessionId] as const,
};
