import { useCallback, useEffect, useRef } from "react";
import { apiGetMastery, apiSaveStep, apiUnlockLevel3, apiSetTopicStatus } from "@/lib/api";
import type { SolutionStep, StudentAnswer } from "@/types/chemistry";
import {
  buildStepLog,
  isStepAnswerAttempted,
  scoresFromMasterySnapshot,
  type MasteryApiSnapshot,
} from "@/lib/masteryTransforms";

interface Params {
  userId?: string;
  unitId: string;
  lessonIndex: number;
  lessonCompleted: boolean;
  currentAttemptId: string | null;
  currentLevel: number;
  currentProblemId?: string;
  interactiveSteps: SolutionStep[];
  answers: Record<string, StudentAnswer>;
  structuredStepComplete: Record<string, boolean>;
  setHasCompletedLevel2: React.Dispatch<React.SetStateAction<boolean>>;
  setBackendCategoryScores: React.Dispatch<
    React.SetStateAction<{ conceptual: number; procedural: number; computational: number; representation: number } | null>
  >;
  setMasteryScore: React.Dispatch<React.SetStateAction<number>>;
  /** Fired when mastery snapshot includes optional backend `level_2_completions`. */
  onMasteryLevel2Completions?: (count: number) => void;
}

export function useTutorMasterySync({
  userId,
  unitId,
  lessonIndex,
  lessonCompleted,
  currentAttemptId,
  currentLevel,
  currentProblemId,
  interactiveSteps,
  answers,
  structuredStepComplete,
  setHasCompletedLevel2,
  setBackendCategoryScores,
  setMasteryScore,
  onMasteryLevel2Completions,
}: Params) {
  const lastSavedStepLogKeyRef = useRef<string>("");

  const applyMasterySnapshot = useCallback(
    (state: MasteryApiSnapshot) => {
      const { backendCategoryScores, masteryPercent, level3Unlocked, level2Completions } =
        scoresFromMasterySnapshot(state);
      setHasCompletedLevel2((prev) => prev || level3Unlocked);
      setBackendCategoryScores(backendCategoryScores);
      setMasteryScore(masteryPercent);
      if (level2Completions != null) onMasteryLevel2Completions?.(level2Completions);
    },
    [setHasCompletedLevel2, setBackendCategoryScores, setMasteryScore, onMasteryLevel2Completions],
  );

  useEffect(() => {
    if (!userId) return;
    apiGetMastery(userId, unitId, lessonIndex)
      .then((state) => applyMasterySnapshot(state))
      .catch(() => {});
  }, [userId, unitId, lessonIndex, applyMasterySnapshot]);

  useEffect(() => {
    if (lessonCompleted) setHasCompletedLevel2((prev) => prev || true);
  }, [lessonCompleted, setHasCompletedLevel2]);

  useEffect(() => {
    lastSavedStepLogKeyRef.current = "";
  }, [currentAttemptId, currentProblemId]);

  useEffect(() => {
    if (!userId || !currentAttemptId || currentLevel === 1 || interactiveSteps.length === 0) return;

    const attempted = buildStepLog(interactiveSteps, answers, structuredStepComplete).filter(
      (_, idx) => isStepAnswerAttempted(answers, structuredStepComplete, interactiveSteps[idx].id),
    );

    if (attempted.length === 0) return;
    const payloadKey = JSON.stringify(attempted);
    if (payloadKey === lastSavedStepLogKeyRef.current) return;
    lastSavedStepLogKeyRef.current = payloadKey;

    apiSaveStep({ attempt_id: currentAttemptId, step_log: attempted })
      .then((res) => applyMasterySnapshot(res.mastery ?? {}))
      .catch(() => {});
  }, [
    userId,
    currentAttemptId,
    currentLevel,
    interactiveSteps,
    answers,
    structuredStepComplete,
    applyMasterySnapshot,
  ]);

  const persistLevel3Unlock = useCallback(async () => {
    if (!userId) return;
    try {
      await apiUnlockLevel3(userId, unitId, lessonIndex);
      await apiSetTopicStatus(userId, unitId, lessonIndex, "in-progress");
    } catch {
      /* non-critical */
    }
  }, [userId, unitId, lessonIndex]);

  return { persistLevel3Unlock, applyMasterySnapshot };
}

