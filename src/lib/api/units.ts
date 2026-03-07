import { get } from "./core";

export interface LessonOut {
  id: number;
  unit_id: string;
  title: string;
  description: string;
  lesson_index: number;
  key_equations: string[];
  standards: { code: string; framework: string; description: string }[];
  is_active: boolean;
  /** Tool keys for this lesson, e.g. ['periodic_table', 'calculator']. From backend required_tools. */
  required_tools?: string[];
}

export interface UnitListItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient?: string | null;
  grade_id?: number | null;
  course_id?: number | null;
  course_name?: string | null;
  sort_order: number;
  is_active: boolean;
  is_coming_soon: boolean;
  lesson_count: number;
  lesson_titles: string[];
  skill_count: number;
  standard_lessons?: string[];
  ap_extension_lessons?: string[];
  standard_skills_count?: number;
  ap_extra_skills_count?: number;
  is_ap_mastery?: boolean;
  ap_prerequisite?: string | null;
  standard_lesson_titles?: string[];
  ap_extension_lesson_titles?: string[];
}

export interface UnitOut {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient?: string | null;
  grade_id?: number | null;
  course_id?: number | null;
  course_name?: string | null;
  sort_order: number;
  is_active: boolean;
  is_coming_soon: boolean;
  lessons: LessonOut[];
}

// ── Curriculum (phase-grouped) types ────────────────────────

export interface CurriculumUnit {
  id: string;
  title: string;
  description: string;
  icon: string | null;
  gradient: string | null;
  grade_id: number | null;
  course_id: number | null;
  course_name: string | null;
  sort_order: number;
  is_active: boolean;
  is_coming_soon: boolean;
  lesson_count: number;
  skill_count: number;
  lesson_titles: string[];
  effective_phase_id: number | null;
  effective_order: number;
  is_hidden: boolean;
  has_override: boolean;
}

export interface PhaseCurriculumGroup {
  phase_id: number | null;
  phase_name: string;
  phase_description: string | null;
  phase_color: string | null;
  phase_course_id: number | null;
  sort_order: number;
  units: CurriculumUnit[];
}

export interface CurriculumResponse {
  classroom_id: string | null;
  is_customised: boolean;
  phases: PhaseCurriculumGroup[];
}

// ── API calls ───────────────────────────────────────────────

export async function apiGetUnits(): Promise<UnitListItem[]> {
  return get<UnitListItem[]>("/units");
}

export async function apiGetUnit(id: string): Promise<UnitOut> {
  return get<UnitOut>(`/units/${id}`);
}

export async function apiGetCurriculum(
  courseId?: number,
): Promise<CurriculumResponse> {
  const qs = courseId != null ? `?course_id=${courseId}` : "";
  return get<CurriculumResponse>(`/phases/curriculum${qs}`);
}
