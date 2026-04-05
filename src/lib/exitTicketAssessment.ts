import type { SolutionStep } from "@/types/chemistry";
import type { StudentAnswer } from "@/types/chemistry";
import type { ExitTicketResult } from "@/types/cognitive";
import type { UiExitTicketQuestion } from "@/lib/exitTicketMap";

/** Per-question correctness for class exit tickets (blank answers → incorrect). */
export function gradeClassQuestions(
  questions: UiExitTicketQuestion[],
  answers: Record<string, string>,
): {
  perQuestion: Record<string, boolean>;
  correctCount: number;
  total: number;
  scorePercent: number;
} {
  const perQuestion: Record<string, boolean> = {};
  questions.forEach((q) => {
    const studentAnswer = answers[q.id]?.trim().toLowerCase() || "";
    const correct = (q.correct_answer || "").trim().toLowerCase();
    perQuestion[q.id] = studentAnswer === correct;
  });
  const correctCount = Object.values(perQuestion).filter(Boolean).length;
  const total = questions.length;
  const scorePercent = total > 0 ? (correctCount / total) * 100 : 0;
  return { perQuestion, correctCount, total, scorePercent };
}

function classModeConfidenceRating(scorePercent: number, timeUsedSec: number, timeLimitSec: number): number {
  if (timeLimitSec <= 0) return Math.round(scorePercent);
  return Math.round(scorePercent * 0.8 + Math.max(0, 100 - (timeUsedSec / timeLimitSec) * 50) * 0.2);
}

export function buildClassExitTicketResult(opts: {
  configId: string | undefined;
  correctCount: number;
  total: number;
  timeLimitSec: number;
  timeRemainingSec: number;
}): ExitTicketResult {
  const { configId, correctCount, total, timeLimitSec, timeRemainingSec } = opts;
  const score = total > 0 ? (correctCount / total) * 100 : 0;
  const timeUsed = timeLimitSec - timeRemainingSec;
  return {
    problemId: configId || "class-exit-ticket",
    timestamp: Date.now(),
    completed: total > 0 && correctCount === total,
    hintsUsed: 0,
    finalScore: score,
    conceptualBreakdown: {},
    confidenceRating: classModeConfidenceRating(score, timeUsed, timeLimitSec),
    readyFlag: score >= 80,
    timeSpentSeconds: timeUsed,
  };
}

type InteractiveStep = SolutionStep & { type: "interactive" };

/** Problem-based exit ticket (interactive steps, no class config). */
export function buildProblemExitTicketResult(opts: {
  problemId: string | undefined;
  answers: Record<string, StudentAnswer>;
  steps: InteractiveStep[];
  timeLimitSec: number;
  timeRemainingSec: number;
}): ExitTicketResult {
  const { problemId, answers, steps, timeLimitSec, timeRemainingSec } = opts;
  const correctCount = Object.values(answers).filter((a) => a.is_correct === true).length;
  const totalSteps = steps.length;
  const finalScore = totalSteps > 0 ? (correctCount / totalSteps) * 100 : 0;
  const lastIdx = totalSteps - 1;
  const calcIdx = totalSteps >= 4 ? 2 : totalSteps === 3 ? 1 : 0;
  const conceptualBreakdown: Record<string, number> = {
    formula_selection: steps[0] && answers[steps[0].id]?.is_correct ? 100 : 0,
    multi_input: steps[1] && answers[steps[1].id]?.is_correct ? 100 : 0,
    calculation: steps[calcIdx] && answers[steps[calcIdx].id]?.is_correct ? 100 : 0,
    final_answer: steps[lastIdx] && answers[steps[lastIdx].id]?.is_correct ? 100 : 0,
  };
  const timeUsed = timeLimitSec - timeRemainingSec;
  const timeEfficiency = timeLimitSec > 0 ? Math.max(0, 100 - (timeUsed / timeLimitSec) * 50) : 0;
  const confidenceRating = Math.round(finalScore * 0.7 + timeEfficiency * 0.3);
  return {
    problemId: problemId || "unknown",
    timestamp: Date.now(),
    completed: totalSteps > 0 && correctCount === totalSteps,
    hintsUsed: 0,
    finalScore,
    conceptualBreakdown,
    confidenceRating,
    readyFlag: finalScore >= 80 && Object.values(answers).every((a) => (a.attempts || 0) <= 1),
    timeSpentSeconds: timeUsed,
  };
}
