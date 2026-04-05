/**
 * Teacher class analytics — matches FastAPI POST /analytics/classes.
 * (Insights live in `ai_insights` on the response; there is no /analytics/class-insights route.)
 */
import { post } from "./core";

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
}

export interface ClassAnalyticsResponse {
  class_id: string;
  unit_id: string;
  student_count: number;
  avg_mastery: number;
  at_risk_count: number;
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
