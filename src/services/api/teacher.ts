/**
 * Teacher dashboard API — FastAPI /teacher/* routes.
 */
import { get, post, patch } from "@/lib/api/core";

export interface CategorySnapshot {
  conceptual: number;
  procedural: number;
  computational: number;
}

export interface ClassSummaryStats {
  classroom_id: string;
  avg_mastery: number;
  total_students: number;
  at_risk_count: number;
  category_breakdown: CategorySnapshot;
}

export interface TeacherClass {
  id: string;
  name: string;
  code: string;
  unit_id: string | null;
  student_count: number;
  is_active: boolean;
  calculator_enabled: boolean;
  created_at: string;
  stats: ClassSummaryStats;
  /** Snapshot of `classrooms.live_session` for the Exit Tickets tab. */
  timed_mode_active?: boolean;
  timed_practice_minutes?: number | null;
  timed_started_at?: string | null;
  active_exit_ticket_id?: string | null;
  session_phase?: string | null;
  exit_ticket_time_limit_minutes?: number | null;
  exit_ticket_window_started_at?: string | null;
}

export interface MasterySnapshot {
  overall_mastery: number;
  category_scores: CategorySnapshot;
  lessons_with_data: number;
}

export interface RosterStudent {
  student_id: string;
  name: string;
  email: string | null;
  joined_at: string;
  mastery: MasterySnapshot;
  at_risk: boolean;
}

export interface ExitTicketQuestion {
  id: string;
  prompt: string;
  question_type: string;
  options: string[];
  /** Index-aligned with `options` for MCQ distractors. */
  option_misconception_tags?: (string | null)[] | null;
  correct_answer: string | null;
  points: number;
  /** Physical unit for numeric answers (e.g. "g", "mol/L", "kJ/mol"). */
  unit?: string | null;
}

export interface ExitTicketConfig {
  id: string;
  class_id: string;
  teacher_id: string;
  unit_id: string;
  lesson_index: number;
  /** Curriculum lesson slug (e.g. "L-kinetics-zero-order"). */
  lesson_id?: string | null;
  difficulty: string;
  time_limit_minutes: number;
  is_active: boolean;
  questions: ExitTicketQuestion[];
  /** Null = draft (generated but not yet published to students). */
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Misconception analytics ──────────────────────────────────

export interface MisconceptionHit {
  tag: string;
  count: number;
}

export interface QuestionMisconceptionSummary {
  question_id: string;
  prompt: string;
  hits: MisconceptionHit[];
}

export interface MisconceptionAnalytics {
  class_id: string;
  ticket_id: string;
  questions: QuestionMisconceptionSummary[];
}

export interface ExitTicketResponseItem {
  id: string;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  answers: Record<string, unknown>[];
  /** Score as 0-100 percentage (e.g. 75.0 means 75%). */
  score: number | null;
  submitted_at: string;
}

export interface ExitTicketAnalytics {
  class_id: string;
  total_sessions: number;
  total_submissions: number;
  /** Average score as 0-100 percentage. */
  average_score: number | null;
  last_activity_at: string | null;
}

export interface ExitTicketsForClass {
  analytics: ExitTicketAnalytics;
  items: { ticket: ExitTicketConfig; responses: ExitTicketResponseItem[] }[];
  page: number;
  total_pages: number;
}

export async function getTeacherClasses(): Promise<TeacherClass[]> {
  return get<TeacherClass[]>("/teacher/classes");
}

export interface StudentAttemptOut {
  id: string;
  unit_id: string;
  lesson_index: number;
  level: number;
  score: number | null;
  is_complete: boolean;
  started_at: string;
}

export interface StudentAnalyticsOut {
  student_id: string;
  overall_mastery: number;
  category_scores: { conceptual: number; procedural: number; computational: number };
  recent_attempts: StudentAttemptOut[];
  lessons_with_data: number;
}

export async function getStudentAnalytics(
  classroomId: string,
  studentId: string,
  unitId?: string,
): Promise<StudentAnalyticsOut> {
  const qs = unitId && unitId !== "all" ? `?unit_id=${encodeURIComponent(unitId)}` : "";
  return get<StudentAnalyticsOut>(`/teacher/classes/${classroomId}/students/${studentId}/analytics${qs}`);
}

export async function patchTeacherClass(
  classroomId: string,
  body: { calculator_enabled?: boolean },
): Promise<void> {
  await patch(`/teacher/classes/${classroomId}`, body);
}

export async function createClass(body: { name: string; unit_id?: string | null }): Promise<{
  id: string;
  name: string;
  teacher_id: string;
  unit_id: string | null;
  code: string;
  is_active: boolean;
  student_count: number;
  created_at: string;
}> {
  return post("/teacher/classes", body);
}

export async function getClassRoster(classroomId: string): Promise<RosterStudent[]> {
  return get<RosterStudent[]>(`/teacher/classes/${classroomId}/roster`);
}

export async function generateExitTicket(body: {
  classroom_id: string;
  unit_id?: string | null;
  lesson_index?: number;
  lesson_id?: string | null;
  difficulty?: string;
  question_count?: number;
  time_limit_minutes?: number;
}): Promise<{ ticket: ExitTicketConfig }> {
  return post("/teacher/exit-tickets/generate", {
    classroom_id: body.classroom_id,
    unit_id: body.unit_id ?? null,
    lesson_index: body.lesson_index ?? 0,
    lesson_id: body.lesson_id ?? null,
    difficulty: body.difficulty ?? "medium",
    question_count: body.question_count ?? 4,
    time_limit_minutes: body.time_limit_minutes ?? 10,
  });
}

export async function getMisconceptionAnalytics(
  classId: string,
  ticketId?: string,
): Promise<MisconceptionAnalytics> {
  const qs = ticketId ? `?ticket_id=${encodeURIComponent(ticketId)}` : "";
  return get<MisconceptionAnalytics>(`/teacher/exit-tickets/${classId}/misconceptions${qs}`);
}

export async function getExitTicketResults(
  classId: string,
  page = 1,
  limit = 10,
  filters?: { unit_id?: string; lesson_id?: string },
): Promise<ExitTicketsForClass> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters?.unit_id) params.set("unit_id", filters.unit_id);
  if (filters?.lesson_id) params.set("lesson_id", filters.lesson_id);
  return get<ExitTicketsForClass>(`/teacher/exit-tickets/${classId}?${params.toString()}`);
}

/** Publish generated exit ticket + optional timed practice to the class (students poll live-session). */
export async function publishClassroomLiveSession(
  classroomId: string,
  body: {
    exit_ticket_id: string;
    timed_practice_enabled: boolean;
    timed_practice_minutes: number | null;
    unit_id: string;
    lesson_index: number;
  },
): Promise<void> {
  await post(`/teacher/classrooms/${classroomId}/live-session/publish`, body);
}

export async function stopClassroomLiveSession(classroomId: string): Promise<void> {
  await post(`/teacher/classrooms/${classroomId}/live-session/stop`, {});
}

/**
 * Student-authenticated fetch of ticket + questions (ChemTutor backend: GET /student/exit-tickets/{id}).
 * Live-session may also embed `exit_ticket` to avoid this call.
 */
export async function getExitTicketForStudent(ticketId: string): Promise<ExitTicketConfig> {
  return get<ExitTicketConfig>(`/student/exit-tickets/${ticketId}`);
}

export async function submitExitTicketAttempt(
  ticketId: string,
  body: { answers: Record<string, string> },
): Promise<void> {
  await post(`/student/exit-tickets/${ticketId}/submit`, body);
}

// ── Classroom sessions (persisted history) ───────────────────

export interface ClassroomSessionOut {
  id: string;
  classroom_id: string;
  session_type: "timed_practice" | "exit_ticket" | "timed_practice_with_exit";
  exit_ticket_id: string | null;
  unit_id: string;
  lesson_index: number;
  timed_practice_minutes: number | null;
  started_at: string;
  ended_at: string | null;
}

export async function getClassroomSessions(
  classId: string,
  limit = 20,
  offset = 0,
): Promise<ClassroomSessionOut[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return get<ClassroomSessionOut[]>(`/teacher/classes/${classId}/sessions?${params.toString()}`);
}

// ── Aggregate misconception analytics ────────────────────────

export interface AggregateMisconceptionItem {
  tag: string;
  count: number;
  pct: number;
}

export interface AggregateMisconceptionAnalytics {
  class_id: string;
  total_wrong: number;
  items: AggregateMisconceptionItem[];
}

export async function getAggregateMisconceptions(
  classId: string,
): Promise<AggregateMisconceptionAnalytics> {
  return get<AggregateMisconceptionAnalytics>(
    `/teacher/exit-tickets/${classId}/misconceptions/aggregate`,
  );
}

// ── Timed practice analytics ─────────────────────────────────

export interface LevelStats {
  count: number;
  avg_score: number;
}

export interface StudentTimedPracticeRow {
  student_id: string;
  student_name: string | null;
  levels: Record<number, LevelStats>;
  total_count: number;
}

export interface TimedPracticeAnalytics {
  session_id: string;
  unit_id: string;
  lesson_index: number;
  rows: StudentTimedPracticeRow[];
}

export async function getTimedPracticeAnalytics(
  classId: string,
  sessionId: string,
): Promise<TimedPracticeAnalytics> {
  return get<TimedPracticeAnalytics>(
    `/teacher/classes/${classId}/sessions/${sessionId}/practice-analytics`,
  );
}
