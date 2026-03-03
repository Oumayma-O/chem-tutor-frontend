import { post, get, request } from "./core";

export interface MasteryState {
  mastery_score: number;
  attempts_count: number;
  consecutive_correct: number;
  current_difficulty: string;
  level3_unlocked: boolean;
  category_scores?: {
    conceptual: number;
    procedural: number;
    computational: number;
    representation: number;
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

export interface TopicProgressItem {
  topic_index: number;
  status: "not-started" | "in-progress" | "completed";
}

export async function apiStartAttempt(body: {
  user_id: string;
  chapter_id: string;
  topic_index: number;
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
  chapter_id: string;
  topic_index: number;
  score: number;
  step_log: unknown[];
  level: number;
}): Promise<ProgressionDecision> {
  return post<ProgressionDecision>("/mastery/attempts/complete", body);
}

export async function apiGetMastery(
  userId: string,
  chapterId: string,
  topicIndex: number,
): Promise<MasteryState> {
  return get<MasteryState>(
    `/mastery/users/${userId}/chapters/${chapterId}/topics/${topicIndex}`,
  );
}

export async function apiGetTopicProgress(
  userId: string,
  chapterId: string,
): Promise<TopicProgressItem[]> {
  return get<TopicProgressItem[]>(
    `/mastery/users/${userId}/chapters/${chapterId}/progress`,
  );
}

export async function apiSetTopicStatus(
  userId: string,
  chapterId: string,
  topicIndex: number,
  status: "not-started" | "in-progress" | "completed",
): Promise<TopicProgressItem> {
  return request<TopicProgressItem>(
    "PATCH",
    `/mastery/users/${userId}/chapters/${chapterId}/topics/${topicIndex}/status`,
    { status },
  );
}

export async function apiUnlockLevel3(
  userId: string,
  chapterId: string,
  topicIndex: number,
): Promise<{ level3_unlocked: boolean }> {
  return post<{ level3_unlocked: boolean }>(
    `/mastery/users/${userId}/chapters/${chapterId}/topics/${topicIndex}/unlock-level3`,
    {},
  );
}

export async function apiGetAllProgress(userId: string): Promise<TopicProgressItem[]> {
  return get<TopicProgressItem[]>(`/mastery/users/${userId}/progress`);
}
