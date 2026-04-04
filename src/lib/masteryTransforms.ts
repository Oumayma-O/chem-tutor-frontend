import type { SolutionStep, StudentAnswer } from "@/types/chemistry";
import type { ThinkingCategory } from "@/types/cognitive";

export type MasteryCategoryScores = {
  conceptual?: number;
  procedural?: number;
  computational?: number;
  representation?: number;
} | null;

export type StepLogEntry = {
  is_correct: boolean;
  reasoning_pattern: string;
  error_category: string;
};

/**
 * Maps each canonical blueprint step label to its cognitive category.
 *
 * Source of truth: app/services/ai/shared/blueprints.py (BLUEPRINT_CONFIG).
 * Conceptual = knowing *what* and *why*; Procedural = executing *how*.
 *
 * SOLVER:   Equation(C), Knowns(C), Substitute(P), Calculate(P), Answer(P)
 * RECIPE:   Goal/Setup(C), Conversion Factors(C), Dimensional Setup(P), Calculate(P), Answer(P)
 * ARCHITECT:Inventory/Rules(C), Draft(P), Refine(P), Final Answer(P)
 * DETECTIVE:Data Extraction(C), Feature ID(C), Apply Concept(P), Conclusion(C)
 * LAWYER:   Concept ID(C), Relation(C), Evidence/Claim(C), Conclusion(C)
 */
const LABEL_CATEGORY_MAP: Record<string, ThinkingCategory> = {
  // ── Conceptual / Setup ───────────────────────────────────────────────────
  "Equation":           "conceptual",
  "Knowns":             "conceptual",
  "Goal / Setup":       "conceptual",
  "Conversion Factors": "conceptual",
  "Inventory / Rules":  "conceptual",
  "Data Extraction":    "conceptual",
  "Feature ID":         "conceptual",
  "Concept ID":         "conceptual",
  "Relation":           "conceptual",
  "Evidence / Claim":   "conceptual",
  "Conclusion":         "conceptual",

  // ── Procedural / Execution ────────────────────────────────────────────────
  "Substitute":         "procedural",
  "Dimensional Setup":  "procedural",
  "Calculate":          "procedural",
  "Draft":              "procedural",
  "Refine":             "procedural",
  "Apply Concept":      "procedural",
  "Answer":             "procedural",
  "Final Answer":       "procedural",
};

/**
 * Return the cognitive category for a step based on its canonical label.
 * Falls back to "procedural" for any unrecognised label so new steps never crash.
 */
export function getCategoryFromLabel(label: string): ThinkingCategory {
  return LABEL_CATEGORY_MAP[label?.trim()] ?? "procedural";
}

export function overallMasteryPercent(
  masteryScore: number | undefined | null,
  categoryScores?: MasteryCategoryScores,
): number {
  const vals = categoryScores
    ? [
        categoryScores.conceptual,
        categoryScores.procedural,
        categoryScores.computational,
        categoryScores.representation,
      ].filter((v): v is number => typeof v === "number")
    : [];
  if (vals.length > 0 && (typeof masteryScore !== "number" || masteryScore === 0)) {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 100);
  }
  return typeof masteryScore === "number" ? Math.round(masteryScore * 100) : 0;
}

export function normalizeCategoryScores(categoryScores?: MasteryCategoryScores): {
  conceptual: number;
  procedural: number;
  computational: number;
  representation: number;
} | null {
  if (!categoryScores) return null;
  return {
    conceptual: categoryScores.conceptual ?? 0.0,
    procedural: categoryScores.procedural ?? 0.0,
    computational: categoryScores.computational ?? 0.0,
    representation: categoryScores.representation ?? 0.0,
  };
}

/** Partial mastery payload from apiGetMastery / apiCompleteAttempt / apiSaveStep responses. */
export type MasteryApiSnapshot = {
  mastery_score?: number | null;
  level3_unlocked?: boolean;
  category_scores?: MasteryCategoryScores;
};

/** Derive UI state from a mastery snapshot (single place for normalize + percent). */
export function scoresFromMasterySnapshot(state: MasteryApiSnapshot): {
  backendCategoryScores: ReturnType<typeof normalizeCategoryScores>;
  masteryPercent: number;
  level3Unlocked: boolean;
} {
  return {
    backendCategoryScores: normalizeCategoryScores(state.category_scores),
    masteryPercent: overallMasteryPercent(state.mastery_score, state.category_scores),
    level3Unlocked: !!state.level3_unlocked,
  };
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
 * Build the step_log payload sent to the backend on attempt completion.
 *
 * reasoning_pattern: the granular skill exercised (step.skill_used from backend),
 *   falling back to the step label so the backend always receives a meaningful string.
 *
 * error_category: cognitive domain from the step label — gives per-step granularity
 *   so a single problem can log both "conceptual" and "procedural" events correctly.
 */
export function buildStepLog(
  interactiveSteps: SolutionStep[],
  answers: Record<string, StudentAnswer>,
  structuredStepComplete: Record<string, boolean>,
): StepLogEntry[] {
  return interactiveSteps.map((s) => {
    const isCorrect = isStepAnswerCorrect(answers, structuredStepComplete, s.id);
    return {
      is_correct: isCorrect,
      reasoning_pattern: s.skill_used?.trim() || s.label,
      error_category: getCategoryFromLabel(s.label),
    };
  });
}
