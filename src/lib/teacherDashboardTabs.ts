/** Tab `value`s on `TeacherDashboardPage` — synced with `?tab=` in the URL. */
export const TEACHER_DASHBOARD_TABS = [
  "class",
  "analytics",
  "students",
  "standards",
  "exit-tickets",
  "settings",
] as const;

export type TeacherDashboardTab = (typeof TEACHER_DASHBOARD_TABS)[number];

export function parseTeacherDashboardTab(raw: string | null): TeacherDashboardTab {
  if (raw && (TEACHER_DASHBOARD_TABS as readonly string[]).includes(raw)) {
    return raw as TeacherDashboardTab;
  }
  return "class";
}

/** Query param for deep-linking a selected student on the teacher dashboard (`?student=<id>`). */
export const TEACHER_STUDENT_QUERY_PARAM = "student";
