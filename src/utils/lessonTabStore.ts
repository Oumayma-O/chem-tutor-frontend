/**
 * Persists which tab (overview / simulation / practice) the student last visited
 * for each lesson, so the sidebar can resume them exactly where they left off.
 */

export type LessonTab = "overview" | "simulation" | "practice";

const PREFIX = "chemtutor_last_tab";

function key(userId: string, unitId: string, lessonIndex: number): string {
  return `${PREFIX}_${userId}_${unitId}_${lessonIndex}`;
}

export function setLastActiveTab(
  userId: string | undefined,
  unitId: string | undefined,
  lessonIndex: number,
  tab: LessonTab,
): void {
  if (!userId || !unitId) return;
  try { localStorage.setItem(key(userId, unitId, lessonIndex), tab); } catch {}
}

export function getLastActiveTab(
  userId: string | undefined,
  unitId: string | undefined,
  lessonIndex: number,
): LessonTab | null {
  if (!userId || !unitId) return null;
  try {
    const v = localStorage.getItem(key(userId, unitId, lessonIndex));
    if (v === "overview" || v === "simulation" || v === "practice") return v;
  } catch {}
  return null;
}
