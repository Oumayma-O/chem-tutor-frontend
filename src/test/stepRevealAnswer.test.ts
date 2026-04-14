import { describe, it, expect } from "vitest";
import type { SolutionStep } from "@/types/chemistry";
import { correctAnswerTextForReveal } from "@/lib/stepRevealAnswer";

function step(partial: Partial<SolutionStep> & Pick<SolutionStep, "id" | "type">): SolutionStep {
  return {
    step_number: 1,
    label: "L",
    instruction: "I",
    ...partial,
  } as SolutionStep;
}

describe("correctAnswerTextForReveal", () => {
  it("joins drag_drop equation_parts for display", () => {
    const out = correctAnswerTextForReveal(
      step({
        id: "1",
        type: "drag_drop",
        equation_parts: ["a", "=", "b"],
      }),
    );
    expect(out).toBeTruthy();
    expect(out!.split(" ").length).toBe(3);
  });

  it("uses correct_equation when equation_parts missing", () => {
    const out = correctAnswerTextForReveal(
      step({
        id: "1",
        type: "drag_drop",
        equation_parts: [],
        correct_equation: "a = b",
      }),
    );
    expect(out).toBe("a = b");
  });

  it("formats multi_input fields with labels", () => {
    const out = correctAnswerTextForReveal(
      step({
        id: "1",
        type: "multi_input",
        input_fields: [
          { label: "k1", value: "1", unit: "M" },
          { label: "k2", value: "2", unit: "M" },
        ],
      }),
    );
    expect(out).toContain("K1:");
    expect(out).toContain("·");
  });

  it("concatenates comparison parts and operator", () => {
    const out = correctAnswerTextForReveal(
      step({
        id: "1",
        type: "comparison",
        comparison_parts: ["1", "2"],
        correct_answer: "<",
      }),
    );
    expect(out).toBe("1 < 2");
  });

  it("falls back to correct_answer for interactive", () => {
    expect(
      correctAnswerTextForReveal(
        step({ id: "1", type: "interactive", correct_answer: " 42 " }),
      ),
    ).toBe("42");
  });
});
