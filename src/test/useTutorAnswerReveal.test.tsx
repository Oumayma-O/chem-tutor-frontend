import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTutorAnswerReveal } from "@/hooks/useTutorAnswerReveal";

describe("useTutorAnswerReveal", () => {
  it("disallows reveal at level 1 regardless of flags", () => {
    const { result } = renderHook(() =>
      useTutorAnswerReveal({
        unitId: "u",
        lessonIndex: 0,
        problemId: "p",
        currentLevel: 1,
        navAllowAnswerReveal: true,
        liveSessionAllowAnswerReveal: true,
      }),
    );
    expect(result.current.allowAnswerRevealSetting).toBe(false);
  });

  it("merges live session and nav for level 2+", () => {
    const { result } = renderHook(() =>
      useTutorAnswerReveal({
        unitId: "u",
        lessonIndex: 0,
        problemId: "p",
        currentLevel: 2,
        navAllowAnswerReveal: undefined,
        liveSessionAllowAnswerReveal: false,
      }),
    );
    expect(result.current.allowAnswerRevealSetting).toBe(false);
  });

  it("prefers live-session max reveals over nav when both are set", () => {
    const { result } = renderHook(() =>
      useTutorAnswerReveal({
        unitId: "u",
        lessonIndex: 0,
        problemId: "p",
        currentLevel: 2,
        navAllowAnswerReveal: true,
        liveSessionAllowAnswerReveal: true,
        navMaxAnswerRevealsPerLesson: 6,
        liveSessionMaxAnswerRevealsPerLesson: 4,
      }),
    );
    expect(result.current.maxAnswerRevealsPerLesson).toBe(4);
  });

  it("getInteractiveReveal maps reveal UI for a step with text", () => {
    const { result } = renderHook(() =>
      useTutorAnswerReveal({
        unitId: "u",
        lessonIndex: 0,
        problemId: "p",
        currentLevel: 2,
        navAllowAnswerReveal: true,
        liveSessionAllowAnswerReveal: true,
      }),
    );

    const r = result.current.getInteractiveReveal({
      id: "step1",
      step_number: 1,
      type: "interactive",
      label: "L",
      instruction: "I",
      correct_answer: "1",
    });
    expect(r.revealLimitReached).toBe(false);
    expect(r.revealAnswerText).toBeNull();
  });
});
