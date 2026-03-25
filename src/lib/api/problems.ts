import { get, post } from "./core";

export interface LabeledValue {
  variable: string;
  value: string;
  unit: string;
}

export interface ProblemStep {
  id: string;
  step_number: number;
  type: "given" | "interactive" | "drag_drop" | "variable_id" | "comparison";
  label: string;
  instruction: string;
  /** Show-your-work trace (≤20 words). Displayed in Level 1 and on wrong answers in L2/L3. */
  explanation?: string | null;
  /** Pre-filled content shown in given/worked steps. */
  content?: string | null;
  /** Input placeholder text for interactive steps. */
  placeholder?: string | null;
  correct_answer?: string | null;
  equation_parts?: string[] | null;
  labeled_values?: LabeledValue[] | null;
  comparison_parts?: string[] | null;
  hint?: string | null;
}

export interface ProblemPagination {
  current_index: number;
  total: number;
  max_problems: number;
  has_prev: boolean;
  has_next: boolean;
  at_limit: boolean;
}

/** Problem from backend. steps length is 3–6 depending on unit strategy and difficulty. */
export interface ProblemOutput {
  id: string;
  title: string;
  statement: string;
  lesson: string;
  difficulty: string;
  level: number;
  context_tag?: string | null;
  /** Cognitive blueprint: solver | recipe | architect | detective | lawyer */
  blueprint?: string | null;
  steps: ProblemStep[];
}

/**
 * Wrapper returned by /problems/generate and /problems/navigate.
 * For "prev" to work, the backend playlist must persist the ordered list of problems
 * (or at least current_index + previous problem IDs) per user/unit/lesson/level so that
 * navigate(direction: "prev") can return the correct previous problem, including after a new session.
 */
export interface ProblemDeliveryResponse {
  problem: ProblemOutput;
  current_index: number;
  total: number;
  max_problems: number;
  has_prev: boolean;
  has_next: boolean;
  at_limit: boolean;
}

export interface ValidationOutput {
  is_correct: boolean;
  feedback?: string;
  student_value?: string;
  correct_value?: string;
  unit_correct?: boolean;
  validation_method?: string;
}

export interface HintOutput {
  hint: string;
  hint_level: number;
}

export interface LessonContext {
  equations?: string[];
  objectives?: string[];
  key_rules?: string[];
  misconceptions?: string[];
}

export async function apiGenerateProblemV2(body: {
  unit_id: string;
  lesson_index: number;
  lesson_name: string;
  difficulty?: string;
  level?: number;
  interests?: string[];
  grade_level?: string | null;
  user_id?: string;
  focus_areas?: string[];
  problem_style?: string;
  lesson_context?: LessonContext;
  exclude_ids?: string[];
  /** Skip playlist resume and force a fresh LLM generation. Use for explicit "Try Another Problem" only. */
  force_regenerate?: boolean;
}): Promise<ProblemDeliveryResponse> {
  const { lesson_name, ...rest } = body;
  return post<ProblemDeliveryResponse>("/problems/generate", {
    ...rest,
    lesson_name,
    topic_name: lesson_name,
  });
}

// ── Reference card (fiche de cours) ───────────────────────────────────────

/** React Query cache — reference card is static per lesson (not mastery-dependent).
 *  Treat as fresh for the whole tab session and do not GC while the app is open. */
export const REF_CARD_STALE_MS = Number.POSITIVE_INFINITY;
export const REF_CARD_GC_MS = Number.POSITIVE_INFINITY;

/** Stable React Query key for the reference card.
 *  Must match exactly between prefetchQuery (UnitLandingPage) and useQuery (ChemistryTutor). */
export function refCardQueryKey(unitId: string, lessonIndex: number) {
  return ["reference-card", unitId, lessonIndex] as const;
}

export type ReferenceCardStepLabel =
  // quantitative (4 steps)
  | "Knowns" | "Equation" | "Substitute" | "Answer"
  // conceptual (3 steps)
  | "Governing Principle" | "Concept Application" | "Final Justification"
  // analytical (3 steps)
  | "Data Observation" | "Feature Correlation" | "Scientific Inference";

export interface ReferenceCardStep {
  label: ReferenceCardStepLabel;
  content: string;
}

export interface ReferenceCardOutput {
  lesson: string;
  unit_id: string;
  lesson_index: number;
  steps: ReferenceCardStep[];
  hint: string;
}

/**
 * Fetch the conceptual study card for a lesson.
 * Caching and deduplication are handled by React Query — this is a pure fetcher.
 * Returns null on any error so callers never need to handle rejections.
 */
export async function apiGetReferenceCard(
  unitId: string,
  lessonIndex: number,
  lessonName: string,
): Promise<ReferenceCardOutput | null> {
  const params = new URLSearchParams({
    unit_id: unitId,
    lesson_index: String(lessonIndex),
    lesson_name: lessonName,
    topic_name: lessonName,
  });
  try {
    return await get<ReferenceCardOutput>(`/problems/reference-card?${params.toString()}`);
  } catch {
    return null;
  }
}

/**
 * Get prev/next problem in the playlist. Backend must persist the ordered playlist
 * (problems seen so far for this user/unit/lesson/level) so that "prev" returns the
 * correct problem and works across sessions.
 */
export async function apiNavigateProblem(body: {
  user_id: string;
  unit_id: string;
  lesson_index: number;
  level: number;
  difficulty: string;
  direction: "prev" | "next";
}): Promise<ProblemDeliveryResponse> {
  return post<ProblemDeliveryResponse>("/problems/navigate", body);
}

export async function apiValidateStep(body: {
  student_answer: string;
  correct_answer: string;
  step_id: string;
  step_number: number;
  step_label: string;
  step_type?: string;
  problem_context?: string;
}): Promise<ValidationOutput> {
  return post<ValidationOutput>("/problems/validate-step", body);
}

export async function apiGetHint(body: {
  step_id: string;
  step_label: string;
  step_instruction: string;
  student_input?: string;
  correct_answer: string;
  attempt_count?: number;
  problem_context?: string | null;
  interests?: string[];
  grade_level?: string | null;
  rag_context?: Record<string, string[]>;
  error_category?: string;
  misconception_tag?: string;
  validation_feedback?: string;
  /** So hints stay scoped to this step (no repeating full theory from step 1). */
  step_number?: number;
  total_steps?: number;
  step_type?: string;
  prior_steps_summary?: string;
}): Promise<HintOutput> {
  return post<HintOutput>("/problems/hint", body);
}

export async function apiClassifyErrors(body: {
  steps: unknown[];
  problem_context: string;
  all_steps: unknown[];
}) {
  return post<{ errors: unknown[]; insight: string; safety_flag?: boolean }>(
    "/problems/classify-thinking",
    body,
  );
}

export async function apiGenerateExitTicket(body: {
  unit_id: string;
  lesson_name: string;
  difficulty?: string;
  format?: string;
  question_count?: number;
}) {
  return post<{ questions: unknown[] }>("/problems/exit-ticket", body);
}

// ── Legacy aliases (kept for backwards compatibility) ─────────────────────

export async function apiValidateAnswer(body: {
  student_answer: string;
  correct_answer: string;
  step_label?: string;
  problem_context?: string;
}) {
  return post<{ is_correct: boolean }>("/problems/validate-step", body);
}

export async function apiGenerateHint(body: {
  step_label: string;
  step_instruction: string;
  student_input?: string;
  correct_answer: string;
  attempt_count?: number;
  interests?: string[];
  grade_level?: string | null;
  problem_context?: string | null;
  rag_context?: Record<string, string[]>;
}) {
  return post<{ hint: string; hint_level: number }>("/problems/hint", body);
}

export async function apiGenerateProblem(body: {
  unit_id: string;
  lesson_name: string;
  difficulty?: string;
  interests?: string[];
  grade_level?: string | null;
  mastery_score?: number;
  lesson_context?: LessonContext;
}) {
  return post<{
    id: string;
    title: string;
    description: string;
    lesson: string;
    difficulty: string;
    steps: unknown[];
  }>("/problems/generate", body);
}

export async function apiGenerateGuide(body: {
  unit_id: string;
  lesson_name: string;
  guide_step_index: number;
  interests?: string[];
  grade_level?: string | null;
  mastery_score?: number;
  rag_context?: Record<string, string[]>;
}) {
  return post<{ title: string; description: string }>("/problems/guide", body);
}

export async function apiGenerateClassInsights(body: {
  misconception_data?: unknown[];
  error_frequencies?: Record<string, unknown>;
  class_mastery?: number;
  student_count?: number;
}) {
  return post<{ insights: string[] }>("/analytics/class-insights", body);
}
