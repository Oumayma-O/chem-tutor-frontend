/**
 * Centralized React Query keys for the teacher dashboard so invalidation and SSE
 * cache writes stay aligned.
 */
export const teacherQueryKeys = {
  all: ["teacher"] as const,

  /** Prefix for invalidateQueries — all cached class lists for every user session. */
  classesRoot: () => ["teacher", "classes"] as const,

  /** Per-logged-in-user class list (GET /teacher/classes). Prevents cache bleed on shared browser. */
  classes: (userId: string) => ["teacher", "classes", userId] as const,

  roster: (classId: string, unitId?: string, lessonIndex?: number | "all") =>
    ["teacher", "roster", classId, unitId ?? "all", lessonIndex ?? "all"] as const,

  /** Live presence rows (GET /teacher/classes/{id}/live). */
  live: (classId: string) => ["teacher", "live", classId] as const,

  /** Class analytics POST (chapter-scoped). */
  classAnalytics: (classId: string, chapterId: string | null) =>
    ["teacher", "analytics", classId, chapterId] as const,
  studentAnalytics: (
    classId: string,
    studentId: string,
    unitId: string | undefined,
    lessonIndex: number | undefined,
  ) =>
    ["teacher", "student-analytics", classId, studentId, unitId ?? "all", lessonIndex ?? "all"] as const,

  exitTickets: {
    /** Prefix for invalidateQueries — matches all exit-ticket queries for a class. */
    byClass: (classId: string) => ["teacher", "exit-tickets", classId] as const,

    list: (
      classId: string,
      page: number,
      limit: number,
      unitId: string,
      lessonId: string,
      /** `"all"` | window days e.g. `"7"` — must match GET query `days`. */
      days: string,
    ) => ["teacher", "exit-tickets", classId, page, limit, unitId, lessonId, days] as const,

    studentPanel: (classId: string) => ["teacher", "exit-tickets", classId, "student-panel"] as const,

    misconceptions: (classId: string, ticketId: string) =>
      ["teacher", "misconceptions", classId, ticketId] as const,

    aggregate: (classId: string) => ["teacher", "misconceptions-aggregate", classId] as const,
  },

  sessions: (classId: string, limit: number) => ["teacher", "sessions", classId, limit] as const,

  practiceAnalytics: (classId: string, sessionId: string) =>
    ["teacher", "practice-analytics", classId, sessionId] as const,
};
