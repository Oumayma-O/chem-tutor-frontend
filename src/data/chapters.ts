/** Course level enum used by the frontend filter UI. */
export type CourseLevel = "intro" | "high-school" | "ap";

export const COURSE_LEVELS: { value: CourseLevel; label: string }[] = [
  { value: "intro", label: "Intro Chemistry" },
  { value: "high-school", label: "High School Chemistry" },
  { value: "ap", label: "AP Chemistry" },
];

/** Map a backend course_name string to a CourseLevel for the filter UI. */
export function getCourseLevel(courseName?: string | null): CourseLevel {
  const n = (courseName || "").toLowerCase();
  if (n.includes("ap") || n.includes("advanced")) return "ap";
  if (n.includes("high school") || n.includes("honors")) return "high-school";
  return "intro";
}
