import { Level, Problem, StudentAnswer } from "@/types/chemistry";
import { ThinkingStep, ClassifiedError } from "@/types/cognitive";
import { ProblemPagination } from "@/lib/api";
import { LESSON_STATE_STORAGE_KEY } from "@/lib/storageKeys";

export interface StoredLevelCacheEntry {
  problem: Problem;
  answers: Record<string, StudentAnswer>;
  hints: Record<string, string>;
  structuredStepComplete: Record<string, boolean>;
  pagination: ProblemPagination | null;
  difficulty: "easy" | "medium" | "hard";
  thinkingSteps?: ThinkingStep[];
  classifiedErrors?: ClassifiedError[];
}

export interface StoredPerProblemState {
  answers: Record<string, StudentAnswer>;
  hints: Record<string, string>;
  structuredStepComplete: Record<string, boolean>;
}

export interface TutorSessionSnapshot {
  currentLevel?: Level;
  levelCache?: Partial<Record<Level, StoredLevelCacheEntry>>;
  perProblemCache?: Record<string, StoredPerProblemState>;
  completedProblemIds?: string[];
  masteryScore?: number;
  hasCompletedLevel2?: boolean;
  /** Completed problem counts per level (session + reload via localStorage). */
  levelSolved?: Partial<Record<Level, number>>;
  /** Unique Level 1 worked-example problem IDs the student has viewed (exposure gate for Level 2). */
  viewedLevel1Ids?: string[];
  /** Policy value persisted with the snapshot so restore matches server/classroom setting. */
  minLevel1ExamplesForLevel2?: number;
  /** True once enough unique L1 examples were viewed, or restored from a session already on Level 2+. */
  level1ExposureSatisfied?: boolean;
  /** Full ordered Level 1 problems array — persisted so Prev/Next works after page reload without hitting the backend. */
  level1Problems?: Problem[];
}

export function getTutorSessionStorageKey(
  userId: string | undefined,
  unitId: string,
  lessonIndex: number,
): string | null {
  if (!userId || unitId == null) return null;
  return `${LESSON_STATE_STORAGE_KEY}_${userId}_${unitId}_${lessonIndex}`;
}

export function readTutorSessionSnapshot(key: string): TutorSessionSnapshot | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as TutorSessionSnapshot;
  } catch {
    return null;
  }
}

export function writeTutorSessionSnapshot(key: string, snapshot: TutorSessionSnapshot): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function updateTutorSessionLevelOnly(key: string, currentLevel: Level): boolean {
  const existing = readTutorSessionSnapshot(key);
  if (!existing) return false;
  return writeTutorSessionSnapshot(key, { ...existing, currentLevel });
}

