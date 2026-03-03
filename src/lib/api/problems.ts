import { get, post } from "./core";

export interface ProblemStep {
  step_number: number;
  type: string;
  label: string;
  instruction: string;
  content: string;
  placeholder?: string;
  correct_answer: string;
  hint?: string;
  equation_parts?: unknown[];
  known_variables?: unknown[];
}

export interface ProblemPagination {
  current_index: number;
  total: number;
  max_problems: number;
  has_prev: boolean;
  has_next: boolean;
  at_limit: boolean;
}

export interface ProblemOutput {
  id: string;
  title: string;
  statement: string;
  topic: string;
  difficulty: string;
  level: number;
  context_tag?: string | null;
  steps: ProblemStep[];
}

/** Wrapper returned by /problems/generate and /problems/navigate */
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

export async function apiGenerateProblemV2(body: {
  chapter_id: string;
  topic_index: number;
  topic_name: string;
  difficulty?: string;
  level?: number;
  interests?: string[];
  grade_level?: string | null;
  user_id?: string;
  focus_areas?: string[];
  problem_style?: string;
  rag_context?: Record<string, string[]>;
  exclude_ids?: string[];
}): Promise<ProblemDeliveryResponse> {
  return post<ProblemDeliveryResponse>("/problems/generate", body);
}

export async function apiGetReferenceExample(
  chapterId: string,
  topicIndex: number,
): Promise<ProblemOutput | null> {
  return get<ProblemOutput>(
    `/problems/worked-example?chapter_id=${encodeURIComponent(chapterId)}&topic_index=${topicIndex}`,
  ).catch(() => null);
}

// ── Reference card (fiche de cours) ───────────────────────────────────────

export interface ReferenceCardStep {
  label: "Equation" | "Knowns" | "Substitute" | "Calculate" | "Answer";
  content: string;
}

export interface ReferenceCardOutput {
  topic: string;
  chapter_id: string;
  topic_index: number;
  steps: ReferenceCardStep[];
  hint: string;
}

/**
 * Fetch the conceptual study card for a topic.
 * Generated once by the LLM and cached in the DB — subsequent calls are instant.
 * Returns null on error so callers can fall back gracefully.
 */
export async function apiGetReferenceCard(
  chapterId: string,
  topicIndex: number,
  topicName: string,
): Promise<ReferenceCardOutput | null> {
  return get<ReferenceCardOutput>(
    `/problems/reference-card?chapter_id=${encodeURIComponent(chapterId)}&topic_index=${topicIndex}&topic_name=${encodeURIComponent(topicName)}`,
  ).catch(() => null);
}

export async function apiNavigateProblem(body: {
  user_id: string;
  chapter_id: string;
  topic_index: number;
  level: number;
  difficulty: string;
  direction: "prev" | "next";
}): Promise<ProblemDeliveryResponse> {
  return post<ProblemDeliveryResponse>("/problems/navigate", body);
}

export async function apiValidateStep(body: {
  student_answer: string;
  correct_answer: string;
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
  chapter_id: string;
  topic_name: string;
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
  chapter_id: string;
  topic_name: string;
  difficulty?: string;
  interests?: string[];
  grade_level?: string | null;
  mastery_score?: number;
  rag_context?: Record<string, string[]>;
}) {
  return post<{
    id: string;
    title: string;
    description: string;
    topic: string;
    difficulty: string;
    steps: unknown[];
  }>("/problems/generate", body);
}

export async function apiGenerateGuide(body: {
  chapter_id: string;
  topic_name: string;
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
