// units.ts — CourseLevel type + helpers
// Data comes from the backend API via useUnits / useUnit hooks.

export type CourseLevel = "standard" | "ap";

export const COURSE_LEVELS: { value: CourseLevel; label: string }[] = [
  { value: "standard", label: "Standard Chemistry" },
  { value: "ap", label: "AP Chemistry" },
];

export function getCourseLevel(courseName?: string | null): CourseLevel {
  const n = (courseName || "").toLowerCase();
  if (n.includes("ap") || n.includes("advanced")) return "ap";
  return "standard";
}
