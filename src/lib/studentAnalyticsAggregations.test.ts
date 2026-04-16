import { describe, expect, it } from "vitest";
import {
  computeStudentActivityAggregates,
  deriveStrengthsAndWeakTopics,
} from "@/lib/studentAnalyticsAggregations";

const unitTitle = (id: string) => ({ u1: "Unit 1", u2: "Unit 2" }[id] ?? id);

function makePractice(id: string, unitId: string, startedAt: string, score = 0.8) {
  return {
    id,
    unit_id: unitId,
    lesson_index: 0,
    level: 1,
    score,
    is_complete: true,
    started_at: startedAt,
    completed_at: startedAt,
    time_spent_s: 90,
    hints_used: 1,
    reveals_used: 0,
  };
}

function makeExit(score: number | null, unitId: string, submittedAt: string) {
  return {
    response: {
      id: `r-${submittedAt}`,
      student_id: "s1",
      student_name: "A",
      student_email: null,
      answers: [],
      score,
      submitted_at: submittedAt,
      time_spent_s: 120,
    },
    ticket: {
      id: `t-${submittedAt}`,
      class_id: "c1",
      teacher_id: "t1",
      unit_id: unitId,
      lesson_index: 0,
      difficulty: "medium",
      time_limit_minutes: 10,
      is_active: false,
      questions: [],
      published_at: submittedAt,
      created_at: submittedAt,
      updated_at: submittedAt,
    },
  };
}

describe("studentAnalyticsAggregations", () => {
  it("computes practice aggregates and sorts rows newest-first", () => {
    const result = computeStudentActivityAggregates({
      analyticsMode: "practice",
      finishedPractice: [
        makePractice("a", "u1", "2026-04-14T10:00:00Z", 0.6),
        makePractice("b", "u1", "2026-04-15T10:00:00Z", 0.8),
      ],
      exitForStudent: [],
      masteryPct: 70,
      unitTitle,
    });

    expect(result.finishedCount).toBe(2);
    expect(result.chapterSummary[0].unitId).toBe("u1");
    expect(result.chapterSummary[0].avg).toBe(70);
    expect(result.unifiedRows[0].kind).toBe("practice");
    if (result.unifiedRows[0].kind === "practice") {
      expect(result.unifiedRows[0].attempt.id).toBe("b");
    }
  });

  it("computes all-mode finished count from practice and scored exits", () => {
    const result = computeStudentActivityAggregates({
      analyticsMode: "all",
      finishedPractice: [makePractice("a", "u1", "2026-04-14T10:00:00Z", 0.6)],
      exitForStudent: [
        makeExit(80, "u1", "2026-04-14T11:00:00Z"),
        makeExit(null, "u2", "2026-04-14T12:00:00Z"),
      ],
      masteryPct: 65,
      unitTitle,
    });

    expect(result.finishedCount).toBe(2);
    expect(result.chapterSummary.length).toBeGreaterThan(0);
  });

  it("derives strengths and weak topics from category scores", () => {
    const out = deriveStrengthsAndWeakTopics({
      categoryScores: { conceptual: 0.8, procedural: 0.4, computational: 0.3 },
      analyticsLesson: "all",
      headlineScorePct: 62,
    });
    expect(out.strengths).toContain("conceptual");
    expect(out.weakTopics).toEqual(expect.arrayContaining(["procedural", "computational"]));
  });
});
