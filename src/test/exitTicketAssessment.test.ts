import { describe, it, expect } from "vitest";
import { gradeClassQuestions, buildClassExitTicketResult } from "@/lib/exitTicketAssessment";
import type { UiExitTicketQuestion } from "@/lib/exitTicketMap";

describe("gradeClassQuestions", () => {
  const qs: UiExitTicketQuestion[] = [
    {
      id: "a",
      question_order: 1,
      format: "mcq",
      question_text: "Q1",
      correct_answer: "yes",
    },
    {
      id: "b",
      question_order: 2,
      format: "structured",
      question_text: "Q2",
      correct_answer: "no",
    },
  ];

  it("marks blanks wrong and matches case-insensitively", () => {
    const g = gradeClassQuestions(qs, { a: "YES" });
    expect(g.perQuestion.a).toBe(true);
    expect(g.perQuestion.b).toBe(false);
    expect(g.correctCount).toBe(1);
    expect(g.total).toBe(2);
    expect(g.scorePercent).toBe(50);
  });
});

describe("buildClassExitTicketResult", () => {
  it("sets completed when all correct", () => {
    const r = buildClassExitTicketResult({
      configId: "t1",
      correctCount: 2,
      total: 2,
      timeLimitSec: 100,
      timeRemainingSec: 40,
    });
    expect(r.completed).toBe(true);
    expect(r.finalScore).toBe(100);
    expect(r.timeSpentSeconds).toBe(60);
    expect(r.readyFlag).toBe(true);
  });
});
