import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { apiCompleteAttempt, apiGetMastery, apiSetTopicStatus } from "@/lib/api";
import type { ProgressionResult, SolutionStep, StudentAnswer } from "@/types/chemistry";
import {
  applyMasterySnapshotToLessonUi,
  interactiveStepsFromProblem,
  stepLogForAttemptComplete,
} from "@/lib/masteryTransforms";
import { isLevel2To3Advance } from "@/lib/progressionUtils";

interface Params {
  userId?: string;
  unitId: string;
  lessonIndex: number;
  currentAttemptId: string | null;
  setCurrentAttemptId: (id: string | null) => void;
  recommendedDifficulty: "easy" | "medium" | "hard" | null;
  setRecommendedDifficulty: (d: "easy" | "medium" | "hard" | null) => void;
  onTopicComplete?: () => void;
  setHasCompletedLevel2: React.Dispatch<React.SetStateAction<boolean>>;
  setBackendCategoryScores: React.Dispatch<
    React.SetStateAction<{ conceptual: number; procedural: number; computational: number } | null>
  >;
  setMasteryScore: React.Dispatch<React.SetStateAction<number>>;
  onMasteryLevel2Completions?: (count: number) => void;
  persistLevel3Unlock: () => Promise<void>;
  checkProgression: () => ProgressionResult;
  completeProblemAttempt: (problemId: string, hintsUsed: number, level: number, firstAttemptCorrect: boolean) => void;
  interactiveStepIds: string[];
  steps: {
    hints: Record<string, string>;
    answers: Record<string, StudentAnswer>;
    /** Full ordered steps (including given); interactive steps are derived in-hook. */
    problemSteps: SolutionStep[];
    structuredStepComplete: Record<string, boolean>;
    isStepRevealed?: (stepId: string) => boolean;
  };
  nav: {
    currentProblem: { id: string } | null;
    currentLevel: number;
    currentDifficulty: "easy" | "medium" | "hard";
    completedProblemIds: string[];
    setCompletedProblemIds: (ids: string[]) => void;
    saveCurrentStateToCache: () => void;
    setLevelSolved: React.Dispatch<React.SetStateAction<Record<1 | 2 | 3, number>>>;
    resetProblemState: () => void;
    levelCacheRef: React.MutableRefObject<Partial<Record<1 | 2 | 3, unknown>>>;
    setCurrentLevel: (level: 1 | 2 | 3) => void;
    loadNewProblem: (diff: "easy" | "medium" | "hard", exclude: string[], level: number) => Promise<unknown>;
    hydrateOrGenerateForLevel: (
      level: 1 | 2 | 3,
      diff: "easy" | "medium" | "hard",
      exclude: string[],
    ) => Promise<unknown>;
    /** True when the student has viewed enough unique Level 1 examples (required before Level 2). */
    canAccessLevel2: boolean;
  };
}

export function useTutorProgression({
  userId,
  unitId,
  lessonIndex,
  currentAttemptId,
  setCurrentAttemptId,
  recommendedDifficulty,
  setRecommendedDifficulty,
  onTopicComplete,
  setHasCompletedLevel2,
  setBackendCategoryScores,
  setMasteryScore,
  onMasteryLevel2Completions,
  persistLevel3Unlock,
  checkProgression,
  completeProblemAttempt,
  interactiveStepIds,
  steps,
  nav,
}: Params) {
  const [showProgressionModal, setShowProgressionModal] = useState(false);
  const [progressionResult, setProgressionResult] = useState<ProgressionResult | null>(null);
  const completeAttemptPromiseRef = useRef<Promise<unknown> | null>(null);

  const prepareNextProblemTransition = useCallback((nextExcludeIds: string[]) => {
    nav.saveCurrentStateToCache();
    nav.setLevelSolved((prev) => ({ ...prev, [nav.currentLevel as 1 | 2 | 3]: prev[nav.currentLevel as 1 | 2 | 3] + 1 }));
    nav.setCompletedProblemIds(nextExcludeIds);
    nav.resetProblemState();
    setShowProgressionModal(false);
  }, [nav]);

  /** Record the current attempt on the backend (non-blocking). Reusable by
   *  both the progression-modal path and the direct "Practice More" path. */
  const completeCurrentAttempt = useCallback(() => {
    if (!nav.currentProblem) return;

    const allFirstAttempt = interactiveStepIds.every(
      (id) => steps.answers[id]?.first_attempt_correct === true,
    );
    completeProblemAttempt(
      nav.currentProblem.id,
      Object.keys(steps.hints).length,
      nav.currentLevel,
      allFirstAttempt,
    );

    const interactiveForAttempt = interactiveStepsFromProblem(steps.problemSteps);
    // Level 1 (worked examples) has no interactive steps but still needs an attempt
    // completion recorded so the L1 mastery band (0→20%) can be filled.
    const isLevel1 = nav.currentLevel === 1;
    if (userId && currentAttemptId && (interactiveForAttempt.length > 0 || isLevel1)) {
      const step_log = isLevel1
        ? []
        : stepLogForAttemptComplete(
            steps.problemSteps,
            steps.answers,
            steps.structuredStepComplete,
            [],
            {
              hintedStepIds: new Set(Object.keys(steps.hints)),
              revealedStepIds: new Set(
                steps.problemSteps
                  .map((s) => s.id)
                  .filter((sid) => (steps.isStepRevealed?.(sid) ?? false)),
              ),
            },
          );
      const correctCount = step_log.filter((e) => e.is_correct).length;
      // L1 worked examples are always scored 1.0 (student viewed the example)
      const score = isLevel1 ? 1.0 : step_log.length > 0 ? correctCount / step_log.length : 0;
      const completePromise = apiCompleteAttempt({
        attempt_id: currentAttemptId,
        user_id: userId,
        unit_id: unitId,
        lesson_index: lessonIndex,
        score,
        step_log,
        level: nav.currentLevel,
      });
      completeAttemptPromiseRef.current = completePromise;
      completePromise
        .then((decision) => {
          if (decision.mastery) {
            applyMasterySnapshotToLessonUi(decision.mastery, {
              setBackendCategoryScores,
              setMasteryScore,
              setHasCompletedLevel2,
              onMasteryLevel2Completions,
            });
          }
          if (decision.recommended_next_difficulty) {
            setRecommendedDifficulty(decision.recommended_next_difficulty as "easy" | "medium" | "hard");
          }
          setCurrentAttemptId(null);
        })
        .catch(() => setCurrentAttemptId(null));
    } else {
      setCurrentAttemptId(null);
    }
  }, [
    nav,
    interactiveStepIds,
    steps,
    completeProblemAttempt,
    userId,
    currentAttemptId,
    unitId,
    lessonIndex,
    setBackendCategoryScores,
    setMasteryScore,
    setRecommendedDifficulty,
    setCurrentAttemptId,
    setHasCompletedLevel2,
    onMasteryLevel2Completions,
  ]);

  const handleCheckProgression = useCallback(() => {
    if (!nav.currentProblem) return;
    const result = checkProgression();
    setProgressionResult(result);
    setShowProgressionModal(true);

    if (isLevel2To3Advance(result, nav.currentLevel)) {
      setHasCompletedLevel2(true);
    }

    completeCurrentAttempt();
  }, [nav, checkProgression, setHasCompletedLevel2, completeCurrentAttempt]);

  const continueWithResult = useCallback(async (result: ProgressionResult) => {
    if (!nav.currentProblem) return;
    if (completeAttemptPromiseRef.current) {
      try { await completeAttemptPromiseRef.current; } catch { /* non-blocking */ }
      completeAttemptPromiseRef.current = null;
    }

    const nextExcludeIds = [...nav.completedProblemIds, nav.currentProblem.id];

    if (nav.currentLevel === 1 && !nav.canAccessLevel2) {
      toast.info("View at least 2 worked examples in Level 1 to unlock Level 2 Practice.");
      setShowProgressionModal(false);
      return;
    }

    prepareNextProblemTransition(nextExcludeIds);
    const advancingToLevel3 = isLevel2To3Advance(result, nav.currentLevel);
    if (!advancingToLevel3) delete nav.levelCacheRef.current[nav.currentLevel as 1 | 2 | 3];

    const backendDiff = recommendedDifficulty;
    setRecommendedDifficulty(null);

    if (isLevel2To3Advance(result, nav.currentLevel)) {
      setHasCompletedLevel2(true);
      persistLevel3Unlock();
      nav.setCurrentLevel(3);
      await nav.hydrateOrGenerateForLevel(3, backendDiff ?? "medium", nextExcludeIds);
      toast.success("Level 3 unlocked! Here's your first challenge…");
      if (userId) {
        apiGetMastery(userId, unitId, lessonIndex)
          .then((state) => {
            applyMasterySnapshotToLessonUi(state, {
              setBackendCategoryScores,
              setMasteryScore,
              onMasteryLevel2Completions,
            });
          })
          .catch(() => {});
      }
      return;
    }

    if (nav.currentLevel === 3) {
      onTopicComplete?.();
      if (userId) apiSetTopicStatus(userId, unitId, lessonIndex, "completed").catch(() => {});
      await nav.loadNewProblem(backendDiff ?? "medium", nextExcludeIds, 3);
      toast.success("Next challenge loaded!");
      return;
    }

    nav.setCurrentLevel(2);
    await nav.hydrateOrGenerateForLevel(2, backendDiff ?? "medium", nextExcludeIds);
    toast.info("New faded example loaded!");
  }, [
    nav,
    prepareNextProblemTransition,
    recommendedDifficulty,
    setRecommendedDifficulty,
    setHasCompletedLevel2,
    persistLevel3Unlock,
    userId,
    unitId,
    lessonIndex,
    setBackendCategoryScores,
    setMasteryScore,
    onMasteryLevel2Completions,
    onTopicComplete,
  ]);

  const handleContinueAfterProgression = useCallback(async () => {
    if (!progressionResult) return;
    await continueWithResult(progressionResult);
  }, [progressionResult, continueWithResult]);

  const handleAutoProgression = useCallback(async () => {
    if (!nav.currentProblem) return;
    const result = checkProgression();
    if (isLevel2To3Advance(result, nav.currentLevel)) {
      setHasCompletedLevel2(true);
    }
    completeCurrentAttempt();
    await continueWithResult(result);
  }, [nav, checkProgression, setHasCompletedLevel2, completeCurrentAttempt, continueWithResult]);

  const handleStayAtLevel = useCallback(async () => {
    if (!nav.currentProblem) return;
    const nextExcludeIds = [...nav.completedProblemIds, nav.currentProblem.id];
    prepareNextProblemTransition(nextExcludeIds);
    delete nav.levelCacheRef.current[nav.currentLevel as 1 | 2 | 3];

    const diff = nav.currentDifficulty;
    if (nav.currentLevel === 2) {
      await nav.loadNewProblem(diff, nextExcludeIds, 2);
      toast.info("Great choice! Here's another Level 2 problem for extra practice.");
    } else if (nav.currentLevel === 3) {
      await nav.loadNewProblem(diff, nextExcludeIds, 3);
      toast.success("Another Level 3 problem loaded!");
    }
  }, [nav, prepareNextProblemTransition]);

  return {
    showProgressionModal,
    setShowProgressionModal,
    progressionResult,
    handleCheckProgression,
    handleContinueAfterProgression,
    handleAutoProgression,
    handleStayAtLevel,
  };
}

