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

/** @deprecated use LessonOut */
export type TopicOut = LessonOut;

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
}

/** @deprecated use UnitListItem */
export type ChapterListItem = UnitListItem;

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

/** @deprecated use UnitOut */
export type ChapterOut = UnitOut;

export async function apiGetUnits(): Promise<UnitListItem[]> {
  return get<UnitListItem[]>("/units");
}

export const apiGetChapters = apiGetUnits;

export async function apiGetUnit(id: string): Promise<UnitOut> {
  return get<UnitOut>(`/units/${id}`);
}

export const apiGetChapter = apiGetUnit;
