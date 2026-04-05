import type { Dispatch, SetStateAction } from "react";
import type { SolutionStep, StudentAnswer } from "@/types/chemistry";
import { masteryCategoryFromStep } from "@/lib/stepLabelToMasteryCategory";

export type MasteryCategoryScores = {
  conceptual?: number;
  procedural?: number;
  computational?: number;
} | null;

export type StepLogEntry = {
  is_correct: boolean;
  reasoning_pattern: string;
  /** Forwarded verbatim from step.category — set by LLM and guaranteed by server guardrail. */
  category: string;
  /**
   * Canonical step label (e.g. blueprint "Goal / Setup"). Sent so the server can infer
   * category when `category` was omitted on the problem payload (matches backend LABEL_TO_MASTERY_CATEGORY).
   */
  step_label: string;
};

/**
 * Headline mastery % for the UI: arithmetic mean of conceptual / procedural / computational
 * when the API reports at least one finite category score. Otherwise falls back to
 * `mastery_score` so empty or missing `category_scores` does not zero out a valid model score.
 */
export function overallMasteryPercent(
  masteryScore: number | undefined | null,
  categoryScores?: MasteryCategoryScores,
): number {
  if (!categoryScores) {
    return typeof masteryScore === "number" ? Math.round(masteryScore * 100) : 0;
  }
  const raw = [categoryScores.conceptual, categoryScores.procedural, categoryScores.computational];
  const hasAnyCategory = raw.some((v) => typeof v === "number" && Number.isFinite(v));
  if (!hasAnyCategory) {
    return typeof masteryScore === "number" ? Math.round(masteryScore * 100) : 0;
  }
  const conceptual = categoryScores.conceptual ?? 0;
  const procedural = categoryScores.procedural ?? 0;
  const computational = categoryScores.computational ?? 0;
  const avg = (conceptual + procedural + computational) / 3;
  return Math.round(avg * 100);
}

export function normalizeCategoryScores(categoryScores?: MasteryCategoryScores): {
  conceptual: number;
  procedural: number;
  computational: number;
} | null {
  if (!categoryScores) return null;
  return {
    conceptual: categoryScores.conceptual ?? 0.0,
    procedural: categoryScores.procedural ?? 0.0,
    computational: categoryScores.computational ?? 0.0,
  };
}

/** Brand hexes for mastery progress (bars, icons, percentages). */
export const MASTERY_PROGRESS_HEX = {
  red: "#de0030",
  yellow: "#e7b008",
  green: "#16a249",
} as const;

/** Mastery UI tiers (0–100%): red urgent, yellow progress, green proficient. */
export type MasteryColorBand = "red" | "amber" | "emerald";

export type MasteryColorClasses = {
  /** Tailwind text-* for labels and icons */
  text: string;
  /** Tailwind bg-* for fills */
  bg: string;
  band: MasteryColorBand;
};

/**
 * Dynamic mastery colors for score displays. Thresholds: &lt;15% red, 15–59% yellow, ≥60% green.
 * Use with `transition-colors duration-500` on colored elements.
 */
export function getMasteryColor(score: number): MasteryColorClasses {
  const s = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  // Full literal class strings (not template literals) so Tailwind JIT always emits these utilities.
  if (s < 15) {
    return { text: "text-[#de0030]", bg: "bg-[#de0030]", band: "red" };
  }
  if (s < 60) {
    return { text: "text-[#e7b008]", bg: "bg-[#e7b008]", band: "amber" };
  }
  return { text: "text-[#16a249]", bg: "bg-[#16a249]", band: "emerald" };
}

/** Partial mastery payload from apiGetMastery / apiCompleteAttempt / apiSaveStep responses. */
export type MasteryApiSnapshot = {
  mastery_score?: number | null;
  level3_unlocked?: boolean;
  category_scores?: MasteryCategoryScores;
  /** Backend-reported L2 completions for this lesson (optional). */
  level_2_completions?: number | null;
};

/** Derive UI state from a mastery snapshot (single place for normalize + percent). */
export function scoresFromMasterySnapshot(state: MasteryApiSnapshot): {
  backendCategoryScores: ReturnType<typeof normalizeCategoryScores>;
  masteryPercent: number;
  level3Unlocked: boolean;
  level2Completions: number | undefined;
} {
  return {
    backendCategoryScores: normalizeCategoryScores(state.category_scores),
    masteryPercent: overallMasteryPercent(state.mastery_score, state.category_scores),
    level3Unlocked: !!state.level3_unlocked,
    level2Completions:
      typeof state.level_2_completions === "number" && Number.isFinite(state.level_2_completions)
        ? state.level_2_completions
        : undefined,
  };
}

export type BackendCategoryScoresState = {
  conceptual: number;
  procedural: number;
  computational: number;
};

/**
 * Push mastery snapshot fields into tutor lesson UI state (single place; hooks should not
 * duplicate `scoresFromMasterySnapshot` + individual setters).
 */
export function applyMasterySnapshotToLessonUi(
  snapshot: MasteryApiSnapshot,
  setters: {
    setBackendCategoryScores: Dispatch<SetStateAction<BackendCategoryScoresState | null>>;
    setMasteryScore: Dispatch<SetStateAction<number>>;
    setHasCompletedLevel2?: Dispatch<SetStateAction<boolean>>;
    onMasteryLevel2Completions?: (count: number) => void;
  },
): void {
  const m = scoresFromMasterySnapshot(snapshot);
  setters.setBackendCategoryScores(m.backendCategoryScores);
  setters.setMasteryScore(m.masteryPercent);
  if (setters.setHasCompletedLevel2) {
    setters.setHasCompletedLevel2((prev) => prev || m.level3Unlocked);
  }
  if (m.level2Completions != null) setters.onMasteryLevel2Completions?.(m.level2Completions);
}

/** True when the student has a definitive result (correct or structured complete). */
export function isStepAnswerCorrect(
  answers: Record<string, StudentAnswer>,
  structuredStepComplete: Record<string, boolean>,
  stepId: string,
): boolean {
  return answers[stepId]?.is_correct === true || structuredStepComplete[stepId] === true;
}

/** True once the step was checked or marked complete (includes incorrect attempts). */
export function isStepAnswerAttempted(
  answers: Record<string, StudentAnswer>,
  structuredStepComplete: Record<string, boolean>,
  stepId: string,
): boolean {
  return answers[stepId]?.is_correct !== undefined || !!structuredStepComplete[stepId];
}

/**
 * Build the step_log payload for save-step and attempt completion.
 *
 * Includes **all** problem steps in order. Given (scaffold) steps are logged as correct so the
 * backend can weight them appropriately. Interactive steps use live answer state.
 *
 * reasoning_pattern: skill_used from backend, else step label.
 * category: server step.category, else label→category (same as Thinking Tracker).
 * step_label: same as step.label for server-side category fallback.
 */
export function buildStepLog(
  steps: SolutionStep[],
  answers: Record<string, StudentAnswer>,
  structuredStepComplete: Record<string, boolean>,
): StepLogEntry[] {
  return steps.map((s) => ({
    is_correct: s.is_given
      ? true
      : isStepAnswerCorrect(answers, structuredStepComplete, s.id),
    reasoning_pattern: s.skill_used?.trim() || s.label,
    category: masteryCategoryFromStep(s),
    step_label: s.label,
  }));
}

/** Interactive (non–`is_given`) steps derived from the full problem list. */
export function interactiveStepsFromProblem(steps: SolutionStep[]): SolutionStep[] {
  return steps.filter((s) => !s.is_given);
}

/**
 * `step_log` for **incremental** `save-step` calls: only rows that should sync mid-attempt.
 * Given steps appear once the student has attempted at least one interactive step.
 */
export function stepLogForIncrementalSave(
  problemSteps: SolutionStep[],
  answers: Record<string, StudentAnswer>,
  structuredStepComplete: Record<string, boolean>,
): StepLogEntry[] {
  const interactive = interactiveStepsFromProblem(problemSteps);
  const anyInteractiveAttempted = interactive.some((s) =>
    isStepAnswerAttempted(answers, structuredStepComplete, s.id),
  );
  return buildStepLog(problemSteps, answers, structuredStepComplete).filter((_, idx) => {
    const step = problemSteps[idx];
    if (!step) return false;
    if (step.is_given) return anyInteractiveAttempted;
    return isStepAnswerAttempted(answers, structuredStepComplete, step.id);
  });
}

/**
 * `step_log` for **attempt completion**: full problem step list (or `fallbackWhenEmpty` if
 * `problemSteps` is empty — defensive fallback).
 */
export function stepLogForAttemptComplete(
  problemSteps: SolutionStep[],
  answers: Record<string, StudentAnswer>,
  structuredStepComplete: Record<string, boolean>,
  fallbackWhenEmpty: SolutionStep[] = [],
): StepLogEntry[] {
  const stepsForLog = problemSteps.length > 0 ? problemSteps : fallbackWhenEmpty;
  return buildStepLog(stepsForLog, answers, structuredStepComplete);
}
