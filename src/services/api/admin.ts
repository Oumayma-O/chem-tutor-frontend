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
  district: string | null;
  school: string | null;
  total_students: number;
  total_classes: number;
  is_online: boolean;
  is_active: boolean;
  created_at: string;
  classes: AdminTeacherClassRow[];
}

export interface SchoolAdminAccount {
  user_id: string;
  name: string;
  email: string;
  district: string | null;
  school: string | null;
  is_active: boolean;
  created_at: string;
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

// ── Teacher CRUD (admin/superadmin) ──────────────────────────────────────────

export async function createTeacher(data: {
  email: string;
  password: string;
  full_name: string;
  district?: string;
  school?: string;
}): Promise<unknown> {
  return post<unknown>("/admin/create-teacher", data);
}

export async function deleteTeacher(teacherId: string): Promise<void> {
  await del(`/admin/teachers/${teacherId}`);
}

export async function patchTeacher(
  teacherId: string,
  data: { name?: string; is_active?: boolean; district?: string; school?: string },
): Promise<void> {
  await patch<unknown>(`/admin/teachers/${teacherId}`, data);
}

// ── School-admin CRUD (superadmin) ───────────────────────────────────────────

export async function getSchoolAdmins(): Promise<SchoolAdminAccount[]> {
  return get<SchoolAdminAccount[]>("/superadmin/school-admins");
}

export async function createSchoolAdmin(data: {
  email: string;
  password: string;
  full_name: string;
  district: string;
  school: string;
}): Promise<unknown> {
  return post<unknown>("/superadmin/create-school-admin", data);
}

export async function deleteSchoolAdmin(adminId: string): Promise<void> {
  await del(`/superadmin/school-admins/${adminId}`);
}

export async function patchSchoolAdmin(
  adminId: string,
  data: { name?: string; district?: string; school?: string; is_active?: boolean },
): Promise<void> {
  await patch<unknown>(`/superadmin/school-admins/${adminId}`, data);
}

// ── Stats ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  total_teachers: number;
  total_classes: number;
  total_students: number;
}

export interface SuperadminStats {
  total_admins: number;
  total_teachers: number;
  total_classes: number;
  total_students: number;
  total_districts: number;
  total_schools: number;
}

/** School-scoped stats (admin role only). */
export async function getSchoolAdminStats(): Promise<AdminStats> {
  return get<AdminStats>("/admin/stats");
}

/** Platform-wide stats (superadmin only). */
export async function getSuperadminStats(): Promise<SuperadminStats> {
  return get<SuperadminStats>("/superadmin/stats");
}

// ── Engagement analytics ─────────────────────────────────────────────────────

export interface DailyMetric {
  date: string;
  logins: number;
  minutes: number;
}

export interface TeacherEngagementRow {
  teacher_id: string;
  teacher_name: string;
  email: string;
  school: string | null;
  district: string | null;
  total_logins: number;
  total_minutes: number;
  daily: DailyMetric[];
}

export interface ClassQuestionsMetric {
  classroom_id: string;
  class_name: string;
  teacher_id: string;
  teacher_name: string;
  question_count: number;
}

export interface EngagementAnalytics {
  scope: string;
  target: string;
  timeframe: string;
  since: string;
  teachers: TeacherEngagementRow[];
  questions_by_class: ClassQuestionsMetric[];
  total_logins: number;
  total_minutes: number;
  total_questions_assigned: number;
}

export async function getEngagementAnalytics(params: {
  scope: "teacher" | "school" | "district";
  target: string;
  timeframe: "last_7_days" | "last_30_days" | "last_90_days";
  isSuperAdmin: boolean;
}): Promise<EngagementAnalytics> {
  const { isSuperAdmin, ...rest } = params;
  const sp = new URLSearchParams({
    scope: rest.scope,
    target: rest.target,
    timeframe: rest.timeframe,
  });
  const base = isSuperAdmin ? "/superadmin" : "/admin";
  return get<EngagementAnalytics>(`${base}/analytics/engagement?${sp.toString()}`);
}

// ── Aggregate analytics (Combined tab) ────────────────────────────────────────

export interface AggregateGroupRow {
  name: string;
  group_id: string | null;  // classroom UUID at class level; null for district/school
  student_count: number;
  class_count: number;
  avg_mastery: number;      // 0.0–1.0
  at_risk_count: number;
  avg_l1_score?: number;
  avg_l2_score?: number;
  avg_l3_score?: number;
  at_risk_l2_count?: number;
  at_risk_l3_count?: number;
  problems_solved: number;
  hours_active: number;
}

export interface UnitMasteryRow {
  unit_id: string;
  unit_title: string | null;
  avg_mastery: number;      // 0.0–1.0
  student_count: number;
}

export interface AggregateAnalyticsResponse {
  grouping: "district" | "school" | "class";
  groups: AggregateGroupRow[];
  total_students: number;
  total_classes: number;
  total_problems_solved: number;
  total_hours_active: number;
  overall_avg_mastery: number;   // 0.0–1.0
  overall_at_risk_count: number;
  overall_avg_l1_score?: number;
  overall_avg_l2_score?: number;
  overall_avg_l3_score?: number;
  overall_at_risk_l2_count?: number;
  overall_at_risk_l3_count?: number;
  weakest_units: UnitMasteryRow[];
  /** Present on current API; may be missing from cached/stale responses. */
  mastery_distribution?: Record<string, number>;  // "0-50","50-70","70-85","85-100"
}

export async function getAggregateAnalytics(params: {
  district?: string;
  school?: string;
}): Promise<AggregateAnalyticsResponse> {
  const sp = new URLSearchParams();
  if (params.district) sp.set("district", params.district);
  if (params.school) sp.set("school", params.school);
  const q = sp.toString();
  return get<AggregateAnalyticsResponse>(
    `/admin/analytics/aggregate${q ? `?${q}` : ""}`,
  );
}
