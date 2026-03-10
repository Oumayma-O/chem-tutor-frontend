import { useState, useCallback } from "react";
import {
  Level,
  StudentAnswer,
  ProgressionResult,
} from "@/types/chemistry";
import { getDifficultyForMastery } from "@/data/sampleProblems";

interface UseAdaptiveProgressionProps {
  currentLevel: Level;
  masteryScore: number;
  answers: Record<string, StudentAnswer>;
  interactiveStepIds: string[];
  structuredStepComplete?: Record<string, boolean>;
}

export function useAdaptiveProgression({
  currentLevel,
  masteryScore,
  answers,
  interactiveStepIds,
  structuredStepComplete = {},
}: UseAdaptiveProgressionProps) {
  const checkProgression = useCallback((): ProgressionResult => {
    // Check if all interactive steps are complete
    const allComplete = interactiveStepIds.every(
      (id) => answers[id]?.is_correct === true || structuredStepComplete[id] === true
    );

    if (!allComplete) {
      return {
        should_advance: false,
        next_level: currentLevel,
        reason: "Complete all steps first",
      };
    }

    if (currentLevel === 1) {
      // From Level 1, always go to Level 2
      return {
        should_advance: true,
        next_level: 2,
        reason: "Ready to try a faded example!",
      };
    }

    if (currentLevel === 2) {
      // Level 3 unlocks upon any correct completion of Level 2
      return {
        should_advance: true,
        next_level: 3,
        reason: "Great work! You completed this successfully. Ready to try independent practice?",
        suggested_difficulty: getDifficultyForMastery(masteryScore),
      };
    }

    if (currentLevel === 3) {
      // At Level 3, offer another problem
      return {
        should_advance: true,
        next_level: 3,
        reason: "Great work! You can try another independent problem or stop here.",
        suggested_difficulty: getDifficultyForMastery(masteryScore),
      };
    }

    return {
      should_advance: false,
      next_level: currentLevel,
      reason: "Continue practicing",
    };
  }, [currentLevel, masteryScore, answers, interactiveStepIds, structuredStepComplete]);

  return { checkProgression };
}
