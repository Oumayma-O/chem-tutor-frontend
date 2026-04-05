import { describe, it, expect } from "vitest";
import {
  buildStepLog,
  getMasteryColor,
  MASTERY_PROGRESS_HEX,
  overallMasteryPercent,
  stepLogForIncrementalSave,
} from "@/lib/masteryTransforms";
import type { SolutionStep } from "@/types/chemistry";

describe("getMasteryColor", () => {
  it("returns red below 15%", () => {
    expect(getMasteryColor(0).band).toBe("red");
    expect(getMasteryColor(14).text).toContain(MASTERY_PROGRESS_HEX.red);
  });
  it("returns yellow tier from 15% through 59%", () => {
    expect(getMasteryColor(15).band).toBe("amber");
    expect(getMasteryColor(59).text).toContain(MASTERY_PROGRESS_HEX.yellow);
  });
  it("returns green at 60% and above", () => {
    expect(getMasteryColor(60).band).toBe("emerald");
    expect(getMasteryColor(100).bg).toContain(MASTERY_PROGRESS_HEX.green);
  });
  it("clamps out-of-range scores", () => {
    expect(getMasteryColor(-5).band).toBe("red");
    expect(getMasteryColor(150).band).toBe("emerald");
  });
});

describe("overallMasteryPercent", () => {
  it("uses mastery_score when category_scores is absent", () => {
    expect(overallMasteryPercent(0.73, undefined)).toBe(73);
    expect(overallMasteryPercent(0.73, null)).toBe(73);
  });

  it("uses mastery_score when no finite category values are present", () => {
    expect(overallMasteryPercent(0.5, {})).toBe(50);
    expect(
      overallMasteryPercent(0.6, {
        conceptual: undefined,
        procedural: undefined,
        computational: undefined,
      }),
    ).toBe(60);
  });

  it("uses arithmetic mean of three categories when any category is finite", () => {
    expect(
      overallMasteryPercent(0.99, {
        conceptual: 0.3,
        procedural: 0.6,
        computational: 0.9,
      }),
    ).toBe(60);
  });

  it("fills missing categories with 0 when computing the mean", () => {
    expect(
      overallMasteryPercent(0.9, {
        conceptual: 0.9,
        procedural: undefined,
        computational: undefined,
      }),
    ).toBe(30);
  });
});

function minimalStep(overrides: Partial<SolutionStep>): SolutionStep {
  return {
    id: "s1",
    step_number: 1,
    type: "interactive",
    label: "L",
    instruction: "I",
    ...overrides,
  };
}

describe("buildStepLog", () => {
  it("marks is_given steps as correct", () => {
    const steps: SolutionStep[] = [
      minimalStep({ id: "g", is_given: true, category: "conceptual", skill_used: "skill" }),
      minimalStep({ id: "a", is_given: false, category: "computational" }),
    ];
    const log = buildStepLog(steps, {}, {});
    expect(log).toHaveLength(2);
    expect(log[0]).toMatchObject({
      is_correct: true,
      reasoning_pattern: "skill",
      category: "conceptual",
    });
    expect(log[1].is_correct).toBe(false);
  });

  it("uses structured completion for interactive steps", () => {
    const steps: SolutionStep[] = [minimalStep({ id: "x", is_given: false })];
    const log = buildStepLog(steps, {}, { x: true });
    expect(log[0].is_correct).toBe(true);
  });

  it("infers category from canonical step label when category is missing (matches Thinking Tracker)", () => {
    const steps: SolutionStep[] = [
      minimalStep({
        id: "a",
        is_given: false,
        label: "Calculate",
        category: undefined,
      }),
      minimalStep({
        id: "b",
        is_given: false,
        label: "Goal / Setup",
        category: null,
      }),
    ];
    const log = buildStepLog(
      steps,
      { a: { is_correct: true }, b: { is_correct: true } } as Record<string, import("@/types/chemistry").StudentAnswer>,
      {},
    );
    expect(log[0].category).toBe("computational");
    expect(log[1].category).toBe("conceptual");
  });
});

describe("stepLogForIncrementalSave", () => {
  it("omits given steps until an interactive step is attempted", () => {
    const steps: SolutionStep[] = [
      minimalStep({ id: "g", is_given: true, category: "conceptual" }),
      minimalStep({ id: "a", is_given: false, category: "computational" }),
    ];
    expect(stepLogForIncrementalSave(steps, {}, {})).toHaveLength(0);
    const afterAttempt = stepLogForIncrementalSave(
      steps,
      { a: { is_correct: false } } as Record<string, import("@/types/chemistry").StudentAnswer>,
      {},
    );
    expect(afterAttempt).toHaveLength(2);
  });
});
