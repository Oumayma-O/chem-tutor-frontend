import { type UnitListItem } from "@/lib/api";
import { type CourseLevel } from "@/data/units";

/** Derive display values from unit based on Standard vs AP. */
export function getUnitDisplay(unit: UnitListItem, courseLevel: CourseLevel) {
  const isAp = courseLevel === "ap";
  const hasSplit = unit.standard_lessons != null && unit.ap_extension_lessons != null;

  let lessonCount: number;
  let skillCount: number;
  let lessonTitles: string[];
  let badgeLabel: string;

  if (hasSplit) {
    if (isAp) {
      lessonCount =
        (unit.standard_lessons?.length ?? 0) + (unit.ap_extension_lessons?.length ?? 0);
      skillCount =
        (unit.standard_skills_count ?? unit.skill_count) + (unit.ap_extra_skills_count ?? 0);
      lessonTitles = [
        ...(unit.standard_lesson_titles ?? unit.lesson_titles ?? []),
        ...(unit.ap_extension_lesson_titles ??
          (unit.ap_extension_lessons ?? []).map((s) => s.replace(/-/g, " "))),
      ];
      badgeLabel = "AP Extension";
    } else {
      lessonCount = unit.standard_lessons?.length ?? unit.lesson_count;
      skillCount = unit.standard_skills_count ?? unit.skill_count;
      lessonTitles = unit.standard_lesson_titles ?? unit.lesson_titles ?? [];
      badgeLabel = "Standard Chem";
    }
  } else {
    lessonCount = unit.lesson_count;
    skillCount = unit.skill_count;
    lessonTitles = unit.lesson_titles ?? [];
    badgeLabel = unit.course_name ?? (unit.is_ap_mastery ? "AP Mastery" : "Standard Chem");
  }

  return { lessonCount, skillCount, lessonTitles, badgeLabel };
}
