import { post, get, request } from "./core";

export interface MasteryState {
  mastery_score: number;
  attempts_count: number;
  consecutive_correct: number;
  current_difficulty: string;
  level3_unlocked: boolean;
  /**
   * Optional server count of completed Level 2 problems for this lesson.
   * When present, the tutor merges this with local session storage for L2→L3 gating.
   */
  level_2_completions?: number;
  category_scores?: {
    conceptual: number;
    procedural: number;
    computational: number;
  };
  error_counts?: Record<string, number>;
  recent_scores?: number[];
}

export interface ProgressionDecision {
  mastery?: MasteryState;
  attempt_score?: number;
  should_advance: boolean;
  level3_just_unlocked: boolean;
  recommended_next_difficulty: string;
  feedback_message: string;
}

export interface SaveStepResponse {
  mastery: MasteryState;
  attempt_score: number;
  attempted_steps: number;
}

export interface LessonProgressItem {
  lesson_index: number;
  status: "not-started" | "in-progress" | "completed";
}

/** @deprecated use LessonProgressItem */
export type TopicProgressItem = LessonProgressItem;

export async function apiStartAttempt(body: {
  user_id: string;
  unit_id: string;
  lesson_index: number;
  problem_id: string;
  difficulty: string;
  level: number;
  class_id?: string | null;
}): Promise<{ attempt_id: string }> {
  return post<{ attempt_id: string }>("/mastery/attempts/start", body);
}

export async function apiCompleteAttempt(body: {
  attempt_id: string;
  user_id: string;
  unit_id: string;
  lesson_index: number;
  score: number;
  step_log: unknown[];
  level: number;
}): Promise<ProgressionDecision> {
  return post<ProgressionDecision>("/mastery/attempts/complete", body);
}

export async function apiSaveStep(body: {
  attempt_id: string;
  step_log: unknown[];
  /** When true, backend must persist the step log but skip mastery updates for this save (answer was revealed). */
  was_revealed?: boolean;
}): Promise<SaveStepResponse> {
  return post<SaveStepResponse>("/mastery/attempts/save-step", body);
}

export async function apiGetMastery(
  userId: string,
  unitId: string,
  lessonIndex: number,
): Promise<MasteryState> {
  return get<MasteryState>(
    `/mastery/users/${userId}/units/${unitId}/lessons/${lessonIndex}`,
  );
}

export async function apiGetTopicProgress(
  userId: string,
  unitId: string,
): Promise<LessonProgressItem[]> {
  return get<LessonProgressItem[]>(
    `/mastery/users/${userId}/units/${unitId}/progress`,
  );
}

export async function apiSetTopicStatus(
  userId: string,
  unitId: string,
  lessonIndex: number,
  status: "not-started" | "in-progress" | "completed",
): Promise<LessonProgressItem> {
  return request<LessonProgressItem>(
    "PATCH",
    `/mastery/users/${userId}/units/${unitId}/lessons/${lessonIndex}/status`,
    { status },
  );
}

export async function apiUnlockLevel3(
  userId: string,
  unitId: string,
  lessonIndex: number,
): Promise<{ level3_unlocked: boolean }> {
  return post<{ level3_unlocked: boolean }>(
    `/mastery/users/${userId}/units/${unitId}/lessons/${lessonIndex}/unlock-level3`,
    {},
  );
}

export async function apiGetAllProgress(userId: string): Promise<LessonProgressItem[]> {
  return get<LessonProgressItem[]>(`/mastery/users/${userId}/progress`);
}
