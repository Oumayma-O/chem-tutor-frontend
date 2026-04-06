import { useMemo } from "react";
import type { UnitListItem } from "@/lib/api/units";

/**
 * Formats curriculum labels for exit-ticket history, session cards, etc.
 * `(unitId, lessonIndex?)` → `Chapter — Ln: Lesson title` or chapter name / raw id.
 */
export function useUnitLessonTitle(units: UnitListItem[]) {
  return useMemo(() => {
    const map = new Map(units.map((u) => [u.id, u]));
    return (unitId: string, lessonIndex?: number) => {
      const unit = map.get(unitId);
      const chapterName = unit?.title ?? unitId;
      if (lessonIndex != null && unit?.lesson_titles?.[lessonIndex]) {
        return `${chapterName} — L${lessonIndex + 1}: ${unit.lesson_titles[lessonIndex]}`;
      }
      return chapterName;
    };
  }, [units]);
}
