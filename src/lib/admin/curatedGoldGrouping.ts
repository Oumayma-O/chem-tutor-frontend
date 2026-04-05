import type { CurriculumResponse } from "@/lib/api/units";
import type { CuratedProblem } from "@/services/api/admin";

export type DifficultyBucket = "easy" | "medium" | "hard" | "other";

const DIFF_ORDER: Record<DifficultyBucket, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  other: 3,
};

export function normalizeDifficulty(d: string): DifficultyBucket {
  const x = d.toLowerCase().trim();
  if (x === "easy" || x === "medium" || x === "hard") return x;
  return "other";
}

function difficultySortKey(ex: CuratedProblem): number {
  return DIFF_ORDER[normalizeDifficulty(ex.difficulty)];
}

export interface EnrichedCuratedProblem extends CuratedProblem {
  course_name: string;
  chapter_name: string;
  difficulty_level: DifficultyBucket;
}

function buildUnitMeta(
  curriculum: CurriculumResponse | undefined,
): Map<string, { courseName: string; chapterName: string }> {
  const m = new Map<string, { courseName: string; chapterName: string }>();
  if (!curriculum) return m;
  for (const ph of curriculum.phases) {
    for (const u of ph.units) {
      const courseName = (u.course_name?.trim() || ph.phase_name || "Curriculum").trim();
      m.set(u.id, { courseName, chapterName: u.title });
    }
  }
  return m;
}

/**
 * Merge API `course_name` / `chapter_name` with curriculum lookup by `unit_id` when missing.
 */
export function enrichCuratedExamples(
  rows: CuratedProblem[],
  curriculum: CurriculumResponse | undefined,
): EnrichedCuratedProblem[] {
  const meta = buildUnitMeta(curriculum);
  return rows.map((ex) => {
    const fallback = meta.get(ex.unit_id);
    const course_name = (ex.course_name?.trim() || fallback?.courseName || "Uncategorized").trim();
    const chapter_name = (ex.chapter_name?.trim() || fallback?.chapterName || ex.unit_id).trim();
    const difficulty_level = normalizeDifficulty(ex.difficulty);
    return { ...ex, course_name, chapter_name, difficulty_level };
  });
}

export interface ChapterGroup {
  key: string;
  chapterName: string;
  items: EnrichedCuratedProblem[];
}

export interface CourseGroup {
  key: string;
  courseName: string;
  chapters: ChapterGroup[];
}

export function groupByCourseChapter(items: EnrichedCuratedProblem[]): CourseGroup[] {
  const byCourse = new Map<string, Map<string, EnrichedCuratedProblem[]>>();
  for (const ex of items) {
    const cn = ex.course_name;
    const ch = ex.chapter_name;
    if (!byCourse.has(cn)) byCourse.set(cn, new Map());
    const cm = byCourse.get(cn)!;
    if (!cm.has(ch)) cm.set(ch, []);
    cm.get(ch)!.push(ex);
  }
  const courses: CourseGroup[] = [];
  for (const [courseName, chMap] of byCourse) {
    const chapters: ChapterGroup[] = [];
    for (const [chapterName, list] of chMap) {
      const sorted = [...list].sort((a, b) => {
        const da = difficultySortKey(a);
        const db = difficultySortKey(b);
        if (da !== db) return da - db;
        const ta = (a.title || "").toLowerCase();
        const tb = (b.title || "").toLowerCase();
        return ta.localeCompare(tb);
      });
      chapters.push({
        key: `ch:${encodeURIComponent(courseName)}::${encodeURIComponent(chapterName)}`,
        chapterName,
        items: sorted,
      });
    }
    chapters.sort((a, b) => a.chapterName.localeCompare(b.chapterName));
    courses.push({
      key: `co:${encodeURIComponent(courseName)}`,
      courseName,
      chapters,
    });
  }
  courses.sort((a, b) => a.courseName.localeCompare(b.courseName));
  return courses;
}

export interface CuratedFilterOptions {
  search: string;
  /** Empty = all courses */
  courseKeys: string[];
  level: DifficultyBucket | "all";
}

export function filterCuratedExamples(
  items: EnrichedCuratedProblem[],
  opts: CuratedFilterOptions,
): EnrichedCuratedProblem[] {
  const q = opts.search.trim().toLowerCase();
  return items.filter((ex) => {
    if (opts.courseKeys.length > 0 && !opts.courseKeys.includes(ex.course_name)) return false;
    if (opts.level !== "all") {
      const dl = normalizeDifficulty(ex.difficulty);
      if (dl !== opts.level) return false;
    }
    if (q) {
      const title = (ex.title || "").toLowerCase();
      const stmt = (ex.statement || "").toLowerCase();
      if (!title.includes(q) && !stmt.includes(q)) return false;
    }
    return true;
  });
}

export function uniqueCourseNames(items: EnrichedCuratedProblem[]): string[] {
  const s = new Set<string>();
  for (const ex of items) s.add(ex.course_name);
  return [...s].sort((a, b) => a.localeCompare(b));
}
