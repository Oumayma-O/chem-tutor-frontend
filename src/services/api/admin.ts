/**
 * Admin dashboard API — FastAPI /admin/* routes.
 */
import { del, get, patch, post } from "@/lib/api/core";
import type { CurriculumResponse } from "@/lib/api/units";

export interface GenerationLogEntry {
  id: string;
  problem_id: string;
  unit_id: string;
  lesson_index: number;
  level: number;
  difficulty: string;
  provider: string;
  model_name: string;
  prompt_version: string;
  execution_time_s: number;
  created_at: string;
}

export interface SystemStats {
  total_users: number;
  students: number;
  teachers: number;
  admins: number;
  total_generation_logs: number;
  generations_last_24h: number;
  /** Total classrooms in the system (matches teacher-owned classes aggregate). */
  total_classrooms?: number;
}

export interface AdminTeacherClassRow {
  id: string;
  name: string;
  class_code: string;
}

export interface AdminTeacherAccount {
  user_id: string;
  display_name: string;
  email: string;
  grade_level: string | null;
  created_at: string;
  classes: AdminTeacherClassRow[];
}

export interface CuratedProblem {
  id: number;
  unit_id: string;
  lesson_index: number;
  difficulty: string;
  level: number;
  strategy: string | null;
  variant_index: number;
  is_active: boolean;
  promoted: boolean;
  created_at: string;
  /** From few_shot_examples.example_json */
  title?: string | null;
  statement?: string | null;
  steps?: Record<string, unknown>[];
  /** From units.course (when backend joins unit). */
  course_name?: string | null;
  /** Unit title — chapter bucket in admin UI. */
  chapter_name?: string | null;
}

export interface UnitCreatePayload {
  id: string;
  title: string;
  description?: string;
  icon?: string | null;
  gradient?: string | null;
  grade_id?: number | null;
  course_id?: number | null;
  sort_order?: number;
  is_coming_soon?: boolean;
  lessons: Array<{
    title: string;
    description?: string;
    lesson_index: number;
    objectives?: string[];
    key_equations?: string[];
    key_rules?: string[];
    misconceptions?: string[];
    standard_codes?: string[];
    is_active?: boolean;
    required_tools?: string[];
  }>;
}

export async function getAdminChapters(courseId?: number | null): Promise<CurriculumResponse> {
  const q = courseId != null ? `?course_id=${courseId}` : "";
  return get<CurriculumResponse>(`/admin/chapters${q}`);
}

export async function getSystemLogs(params?: {
  limit?: number;
  offset?: number;
  unit_id?: string | null;
}): Promise<GenerationLogEntry[]> {
  const sp = new URLSearchParams();
  if (params?.limit != null) sp.set("limit", String(params.limit));
  if (params?.offset != null) sp.set("offset", String(params.offset));
  if (params?.unit_id) sp.set("unit_id", params.unit_id);
  const q = sp.toString();
  return get<GenerationLogEntry[]>(`/admin/logs/generation${q ? `?${q}` : ""}`);
}

export async function getAdminStats(): Promise<SystemStats> {
  return get<SystemStats>("/admin/stats");
}

export async function getAdminTeachers(): Promise<AdminTeacherAccount[]> {
  return get<AdminTeacherAccount[]>("/admin/teachers");
}

export async function getCuratedProblems(limit = 50, offset = 0): Promise<CuratedProblem[]> {
  return get<CuratedProblem[]>(`/admin/curated-problems?limit=${limit}&offset=${offset}`);
}

export async function createChapterUnit(payload: UnitCreatePayload) {
  return post<unknown>("/admin/chapters", payload);
}

export async function updateChapter(
  unitId: string,
  data: { title?: string; description?: string; is_active?: boolean },
): Promise<unknown> {
  return patch<unknown>(`/admin/units/${unitId}`, data);
}

export async function deleteChapter(unitId: string): Promise<void> {
  await del(`/admin/units/${unitId}`);
}
