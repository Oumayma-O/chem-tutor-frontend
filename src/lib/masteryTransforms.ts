import type { Dispatch, SetStateAction } from "react";
import type { SolutionStep, StudentAnswer } from "@/types/chemistry";
import { masteryCategoryFromStep } from "@/lib/stepLabelToMasteryCategory";

export type MasteryCategoryScores = {
  conceptual?: number;
  procedural?: number;
  computational?: number;
} | null;

export type StepLogEntry = {
  step_id?: string;
  is_given?: boolean;
  is_correct: boolean;
  reasoning_pattern: string;
  /** Forwarded verbatim from step.category — set by LLM and guaranteed by server guardrail. */
  category: string;
  /**
   * Canonical step label (e.g. blueprint "Goal / Setup"). Sent so the server can infer
   * category when `category` was omitted on the problem payload (matches backend LABEL_TO_MASTERY_CATEGORY).
   */
  step_label: string;
  answer?: string;
  attempts?: number;
  first_attempt_correct?: boolean;
  validation_feedback?: string;
  hints_used?: number;
  was_revealed?: boolean;
};

/**
 * Headline mastery % for the UI: always derived from the backend `mastery_score` (band-based
 * 0–1 float). Category scores are informational only and must NOT override the headline figure —
 * averaging them caused instant-100% on the first perfect attempt (all categories → 1.0).
 */
export function overallMasteryPercent(
  masteryScore: number | undefined | null,
  _categoryScores?: MasteryCategoryScores,
): number {
  return typeof masteryScore === "number" && Number.isFinite(masteryScore)
    ? Math.round(masteryScore * 100)
    : 0;
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
 * Dynamic mastery colors for score displays. Thresholds: &lt;15% red, 15–49% yellow, ≥50% green.
 * 50% = new L2 ceiling (student has filled both L1 and L2 bands).
 * Use with `transition-colors duration-500` on colored elements.
 */
export function getMasteryColor(score: number): MasteryColorClasses {
  const s = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  // Full literal class strings (not template literals) so Tailwind JIT always emits these utilities.
  if (s < 15) {
    return { text: "text-[#de0030]", bg: "bg-[#de0030]", band: "red" };
  }
  if (s < 50) {
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
  options?: {
    hintedStepIds?: Set<string>;
    revealedStepIds?: Set<string>;
  },
): StepLogEntry[] {
  const hintedStepIds = options?.hintedStepIds;
  const revealedStepIds = options?.revealedStepIds;
  return steps.map((s) => {
    const saved = answers[s.id];
    return {
      step_id: s.id,
      is_given: !!s.is_given,
      is_correct: s.is_given
        ? true
        : isStepAnswerCorrect(answers, structuredStepComplete, s.id),
      reasoning_pattern: s.skill_used?.trim() || s.label,
      category: masteryCategoryFromStep(s),
      step_label: s.label,
      answer: saved?.answer ?? "",
      attempts: saved?.attempts ?? 0,
      first_attempt_correct: saved?.first_attempt_correct,
      validation_feedback: saved?.validation_feedback,
      hints_used: hintedStepIds?.has(s.id) ? 1 : 0,
      was_revealed: revealedStepIds?.has(s.id) ?? false,
    };
  });
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
  options?: {
    hintedStepIds?: Set<string>;
    revealedStepIds?: Set<string>;
  },
): StepLogEntry[] {
  const interactive = interactiveStepsFromProblem(problemSteps);
  const anyInteractiveAttempted = interactive.some((s) =>
    isStepAnswerAttempted(answers, structuredStepComplete, s.id),
  );
  return buildStepLog(problemSteps, answers, structuredStepComplete, options).filter((_, idx) => {
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
  options?: {
    hintedStepIds?: Set<string>;
    revealedStepIds?: Set<string>;
  },
): StepLogEntry[] {
  const stepsForLog = problemSteps.length > 0 ? problemSteps : fallbackWhenEmpty;
  return buildStepLog(stepsForLog, answers, structuredStepComplete, options);
}
