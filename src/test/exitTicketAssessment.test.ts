import { describe, it, expect } from "vitest";
import { gradeClassQuestions, buildClassExitTicketResult } from "@/lib/exitTicketAssessment";
import type { UiExitTicketQuestion } from "@/lib/exitTicketMap";
import {
  canGradeExitTicketRow,
  exitTicketQuestionCorrectForTeacher,
  readStoredAnswerIsCorrect,
} from "@/lib/exitTicketAnalyticsUtils";
import type { ExitTicketQuestion } from "@/services/api/teacher";

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

  it("marks blanks wrong and matches case-insensitively", async () => {
    const g = await gradeClassQuestions(qs, { a: "YES" });
    expect(g.perQuestion.a).toBe(true);
    expect(g.perQuestion.b).toBe(false);
    expect(g.correctCount).toBe(1);
    expect(g.total).toBe(2);
    expect(g.scorePercent).toBe(50);
  });
});

describe("exitTicketQuestionCorrectForTeacher", () => {
  const q = (correct: string, type: string): ExitTicketQuestion => ({
    id: "q1",
    prompt: "p",
    question_type: type,
    options: [],
    correct_answer: correct,
    points: 1,
  });

  it("prefers persisted is_correct over string compare", () => {
    const row = { question_id: "q1", answer: "2", is_correct: true };
    expect(readStoredAnswerIsCorrect(row)).toBe(true);
    expect(exitTicketQuestionCorrectForTeacher(q("2.00", "numeric mol"), row)).toBe(true);
  });

  it("falls back to equivalence when is_correct is absent (legacy)", () => {
    const row = { question_id: "q1", answer: "2" };
    expect(readStoredAnswerIsCorrect(row)).toBe(undefined);
    expect(exitTicketQuestionCorrectForTeacher(q("2.00", "numeric mol"), row)).toBe(true);
  });

  it("canGradeExitTicketRow is true when stored or canonical exists", () => {
    expect(canGradeExitTicketRow(q("x", "mcq"), { is_correct: false })).toBe(true);
    expect(canGradeExitTicketRow(q("", "mcq"), {})).toBe(false);
    expect(canGradeExitTicketRow(q("a", "mcq"), { answer: "b" })).toBe(true);
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
