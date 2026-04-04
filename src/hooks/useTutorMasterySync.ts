import { useCallback, useEffect, useRef } from "react";
import { apiGetMastery, apiSaveStep, apiUnlockLevel3, apiSetTopicStatus } from "@/lib/api";
import type { SolutionStep, StudentAnswer } from "@/types/chemistry";
import {
  applyMasterySnapshotToLessonUi,
  interactiveStepsFromProblem,
  stepLogForIncrementalSave,
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
  /** Full ordered steps (including `is_given`); must align with `buildStepLog` indices. */
  problemSteps: SolutionStep[];
  answers: Record<string, StudentAnswer>;
  structuredStepComplete: Record<string, boolean>;
  setHasCompletedLevel2: React.Dispatch<React.SetStateAction<boolean>>;
  setBackendCategoryScores: React.Dispatch<
    React.SetStateAction<{ conceptual: number; procedural: number; computational: number } | null>
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
  problemSteps,
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
      applyMasterySnapshotToLessonUi(state, {
        setBackendCategoryScores,
        setMasteryScore,
        setHasCompletedLevel2,
        onMasteryLevel2Completions,
      });
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
    const interactive = interactiveStepsFromProblem(problemSteps);
    if (!userId || !currentAttemptId || currentLevel === 1 || interactive.length === 0) return;

    const attempted = stepLogForIncrementalSave(problemSteps, answers, structuredStepComplete);

    if (attempted.length === 0) return;
    const payloadKey = JSON.stringify(attempted);
    if (payloadKey === lastSavedStepLogKeyRef.current) return;
    lastSavedStepLogKeyRef.current = payloadKey;

    if (import.meta.env.DEV) {
      console.debug("[useTutorMasterySync] apiSaveStep payload", {
        currentProblemId,
        step_log: attempted,
      });
    }

    apiSaveStep({ attempt_id: currentAttemptId, step_log: attempted })
      .then((res) => applyMasterySnapshot(res.mastery ?? {}))
      .catch(() => {});
  }, [
    userId,
    currentAttemptId,
    currentLevel,
    currentProblemId,
    problemSteps,
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
