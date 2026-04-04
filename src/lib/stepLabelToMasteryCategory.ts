import type { ThinkingCategory } from "@/types/cognitive";
import type { SolutionStep } from "@/types/chemistry";

/**
 * Mirrors backend `LABEL_TO_MASTERY_CATEGORY` (app/services/ai/shared/blueprints.py).
 * Used when `step.category` is missing on the client so mastery step_log matches Thinking Tracker.
 */
export const STEP_LABEL_TO_MASTERY_CATEGORY: Record<string, ThinkingCategory> = {
  Equation: "conceptual",
  Knowns: "conceptual",
  "Goal / Setup": "conceptual",
  "Conversion Factors": "conceptual",
  "Inventory / Rules": "conceptual",
  "Data Extraction": "conceptual",
  "Feature ID": "conceptual",
  "Concept ID": "conceptual",
  Relation: "conceptual",
  "Evidence / Claim": "conceptual",
  Conclusion: "conceptual",
  Substitute: "procedural",
  "Dimensional Setup": "procedural",
  Draft: "procedural",
  Refine: "procedural",
  "Apply Concept": "procedural",
  Calculate: "computational",
  Answer: "computational",
  "Final Answer": "computational",
};

/**
 * Category for mastery API: prefer server-provided `step.category`, else canonical label map.
 * Keeps Thinking Tracker and `buildStepLog` aligned when the problem payload omits `category`.
 */
export function masteryCategoryFromStep(step: SolutionStep): ThinkingCategory {
  if (step.category === "conceptual" || step.category === "procedural" || step.category === "computational") {
    return step.category;
  }
  return STEP_LABEL_TO_MASTERY_CATEGORY[step.label] ?? "procedural";
}
