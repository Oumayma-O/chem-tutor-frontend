import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAnswerReveal } from "@/hooks/useAnswerReveal";

const CAP = 6;

describe("useAnswerReveal", () => {
  it("reveals after 3 wrong checks when allowed and budget remains", () => {
    const { result } = renderHook(
      (props: { problemId?: string }) =>
        useAnswerReveal({
          unitId: "u1",
          lessonIndex: 0,
          problemId: props.problemId ?? "p1",
          allowAnswerReveal: true,
        }),
      { initialProps: { problemId: "p1" } },
    );

    act(() => {
      result.current.recordCheckResult("s1", false);
      result.current.recordCheckResult("s1", false);
      result.current.recordCheckResult("s1", false);
    });

    expect(result.current.getRevealUi("s1", "x")?.kind).toBe("reveal");
    expect(result.current.totalRevealsUsed).toBe(1);
  });

  it("sets limit when session cap reached", () => {
    const { result } = renderHook(() =>
      useAnswerReveal({
        unitId: "u1",
        lessonIndex: 0,
        problemId: "p1",
        allowAnswerReveal: true,
        maxRevealsPerLesson: CAP,
      }),
    );

    for (let i = 0; i < CAP; i++) {
      const stepId = `s${i}`;
      act(() => {
        result.current.recordCheckResult(stepId, false);
        result.current.recordCheckResult(stepId, false);
        result.current.recordCheckResult(stepId, false);
      });
    }

    act(() => {
      result.current.recordCheckResult("s_cap", false);
      result.current.recordCheckResult("s_cap", false);
      result.current.recordCheckResult("s_cap", false);
    });

    expect(result.current.getRevealUi("s_cap", "ans")?.kind).toBe("limit");
  });

  it("consumeWasRevealedForSave after correct following reveal", () => {
    const { result } = renderHook(() =>
      useAnswerReveal({
        unitId: "u1",
        lessonIndex: 0,
        problemId: "p1",
        allowAnswerReveal: true,
        maxRevealsPerLesson: CAP,
      }),
    );

    act(() => {
      result.current.recordCheckResult("s1", false);
      result.current.recordCheckResult("s1", false);
      result.current.recordCheckResult("s1", false);
    });
    act(() => {
      result.current.recordCheckResult("s1", true);
    });

    expect(result.current.consumeWasRevealedForSave()).toBe(true);
    expect(result.current.consumeWasRevealedForSave()).toBe(false);
  });

  it("resets per-step state on problem change but keeps total reveals", () => {
    const { result, rerender } = renderHook(
      ({ problemId }: { problemId: string }) =>
        useAnswerReveal({
          unitId: "u1",
          lessonIndex: 0,
          problemId,
          allowAnswerReveal: true,
          maxRevealsPerLesson: CAP,
        }),
      { initialProps: { problemId: "p1" } },
    );

    act(() => {
      result.current.recordCheckResult("s1", false);
      result.current.recordCheckResult("s1", false);
      result.current.recordCheckResult("s1", false);
    });
    const totalAfter = result.current.totalRevealsUsed;

    rerender({ problemId: "p2" });
    expect(result.current.getRevealUi("s1", "x")?.kind).toBe("none");
    expect(result.current.totalRevealsUsed).toBe(totalAfter);
  });
});
