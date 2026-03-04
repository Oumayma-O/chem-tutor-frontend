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
  /** v0.1: Standard-only lesson slugs. */
  standard_lessons?: string[];
  /** v0.1: AP extension lesson slugs. */
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

export async function apiGetUnits(): Promise<UnitListItem[]> {
  return get<UnitListItem[]>("/units");
}

export async function apiGetUnit(id: string): Promise<UnitOut> {
  return get<UnitOut>(`/units/${id}`);
}
