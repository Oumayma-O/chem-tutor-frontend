/**
 * Teacher class analytics — matches FastAPI POST /analytics/classes.
 * (Insights live in `ai_insights` on the response; there is no /analytics/class-insights route.)
 */
import { get, post } from "./core";

export interface ClassAnalyticsRequest {
  class_id: string;
  unit_id: string;
  lesson_index?: number | null;
  include_ai_insights?: boolean;
}

export interface LessonBreakdownRow {
  lesson_index: number;
  avg_mastery: number;
  student_count: number;
  completion_rate: number;
}

export interface StudentMasterySummary {
  student_id: string;
  mastery_score: number;
  attempts_count: number;
  error_counts: Record<string, number>;
  top_misconceptions: string[];
  is_at_risk: boolean;
  l1_score?: number;
  l2_score?: number;
  l3_score?: number;
}

export interface ClassAnalyticsResponse {
  class_id: string;
  unit_id: string;
  student_count: number;
  avg_mastery: number;
  at_risk_count: number;
  avg_l1_score?: number;
  avg_l2_score?: number;
  avg_l3_score?: number;
  at_risk_l2_count?: number;
  at_risk_l3_count?: number;
  error_frequency: Record<string, number>;
  top_misconceptions: string[];
  /** Backend may serialize as `topic_breakdown` in some versions — prefer this name first when reading. */
  lesson_breakdown?: LessonBreakdownRow[];
  topic_breakdown?: LessonBreakdownRow[];
  students: StudentMasterySummary[];
  ai_insights: string[];
}

export async function apiPostClassAnalytics(
  body: ClassAnalyticsRequest,
): Promise<ClassAnalyticsResponse> {
  return post<ClassAnalyticsResponse>("/analytics/classes", body);
}

// ── Standards mastery types ──────────────────────────────────────────────────

export interface StudentStandardScore {
  student_id: string;
  mastery_score: number;
}

export interface StandardMasteryItem {
  standard_code: string;
  standard_title: string | null;
  standard_description: string | null;
  framework: string;
  class_avg: number;
  at_risk_count: number;
  student_scores: StudentStandardScore[];
}

export interface ClassStandardsMasteryResponse {
  class_id: string;
  standards: StandardMasteryItem[];
}

export interface StudentStandardMasteryItem {
  standard_code: string;
  standard_title: string | null;
  framework: string;
  mastery_score: number;
  lesson_count: number;
  is_mastered: boolean;
}

export interface StudentStandardsMasteryResponse {
  student_id: string;
  standards: StudentStandardMasteryItem[];
}

// ── Standards mastery query keys ─────────────────────────────────────────────

export const classStandardsQueryKey = (classId: string) =>
  ["analytics", "class-standards", classId] as const;

export const studentStandardsQueryKey = (studentId: string, classId?: string | null) =>
  ["analytics", "student-standards", studentId, classId ?? "all"] as const;

// ── Standards mastery API calls ───────────────────────────────────────────────

export async function apiGetClassStandardsMastery(
  classId: string,
): Promise<ClassStandardsMasteryResponse> {
  return get<ClassStandardsMasteryResponse>(`/analytics/classes/${classId}/standards`);
}

export async function apiGetStudentStandardsMastery(
  studentId: string,
  classId?: string | null,
): Promise<StudentStandardsMasteryResponse> {
  const qs = classId ? `?class_id=${encodeURIComponent(classId)}` : "";
  return get<StudentStandardsMasteryResponse>(`/analytics/students/${studentId}/standards${qs}`);
}
