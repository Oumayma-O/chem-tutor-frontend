import { describe, expect, it } from "vitest";

import type { Problem, StudentAnswer } from "@/types/chemistry";
import { mergeHydratedProblemState, type PerProblemState } from "@/hooks/useProblemNavigation";

function makeProblem(): Problem {
  return {
    id: "problem-1",
    title: "Test Problem",
    description: "Hydration test",
    lesson: "Chem",
    difficulty: "medium",
    steps: [
      {
        id: "given-1",
        step_number: 1,
        type: "interactive",
        is_given: true,
        label: "Setup",
        instruction: "Read setup",
        correct_answer: "Knowns",
      },
      {
        id: "step-a",
        step_number: 2,
        type: "interactive",
        label: "Calculate",
        instruction: "Do math",
        correct_answer: "42",
      },
      {
        id: "step-b",
        step_number: 3,
        type: "drag_drop",
        label: "Answer",
        instruction: "Build equation",
        correct_answer: "H2 + O2 -> H2O",
        equation_parts: ["H2", "+", "O2", "->", "H2O"],
      },
    ],
  };
}

describe("mergeHydratedProblemState", () => {
  it("prefers backend active attempt over stale local state for the active step", () => {
    const localState: PerProblemState = {
      answers: {
        "step-a": {
          step_id: "step-a",
          answer: "999",
          is_correct: true,
          attempts: 4,
        },
      },
      hints: {},
      structuredStepComplete: {},
    };

    const result = mergeHydratedProblemState(makeProblem(), localState, {
      attempt_id: "attempt-1",
      problem_id: "problem-1",
      level: 2,
      is_complete: false,
      step_log: [
        {
          step_id: "step-a",
          step_label: "Calculate",
          answer: "41",
          is_correct: false,
          attempts: 1,
          validation_feedback: "Try again",
        },
      ],
    });

    expect(result.attemptId).toBe("attempt-1");
    expect(result.answers["step-a"]).toEqual<StudentAnswer>({
      step_id: "step-a",
      answer: "41",
      is_correct: false,
      attempts: 1,
      first_attempt_correct: undefined,
      validation_feedback: "Try again",
    });
  });

  it("keeps local drafts only for steps missing from backend state", () => {
    const localState: PerProblemState = {
      answers: {
        "step-a": {
          step_id: "step-a",
          answer: "local stale",
          is_correct: true,
          attempts: 2,
        },
        "step-b": {
          step_id: "step-b",
          answer: JSON.stringify({ orderedParts: ["H2", "+", "O2"] }),
          attempts: 0,
        },
      },
      hints: {},
      structuredStepComplete: {
        "step-b": true,
      },
    };

    const result = mergeHydratedProblemState(makeProblem(), localState, {
      attempt_id: "attempt-1",
      problem_id: "problem-1",
      level: 2,
      is_complete: true,
      step_log: [
        {
          step_id: "step-a",
          step_label: "Calculate",
          answer: "42",
          is_correct: true,
          attempts: 1,
        },
      ],
    });

    expect(result.answers["step-a"]?.answer).toBe("42");
    expect(result.answers["step-b"]?.answer).toBe(JSON.stringify({ orderedParts: ["H2", "+", "O2"] }));
    expect(result.structuredStepComplete["step-b"]).toBe(true);
    expect(result.attemptId).toBe("attempt-1");
  });
});
