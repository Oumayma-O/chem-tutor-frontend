import type { SkillMastery, ProblemAttempt } from "@/types/cognitive";
import type { CategorySnapshot, StudentAttemptOut } from "@/services/api/teacher";
import { TEACHER_SCORE_MODERATE_MIN, TEACHER_SCORE_STRONG_MIN } from "@/lib/teacherScoreStyles";

const DEFAULT_SKILL_DESCRIPTIONS: Record<"conceptual" | "procedural" | "computational", string> = {
  conceptual: "Did they choose the right formula and understand the underlying chemistry?",
  procedural: "Did they correctly identify knowns/unknowns and set up the problem?",
  computational: "Did they perform the arithmetic and unit conversions correctly?",
};

/** Build skill rows for PredictiveInsights from aggregated class category scores (0–1). */
export function skillMapFromCategoryBreakdown(
  breakdown: CategorySnapshot | undefined,
  problemCount: number,
  descriptions: Partial<Record<"conceptual" | "procedural" | "computational", string>> = {},
): SkillMastery[] {
  if (!breakdown) return [];
  const mergedDescriptions = { ...DEFAULT_SKILL_DESCRIPTIONS, ...descriptions };
  const row = (
    skillId: "conceptual" | "procedural" | "computational",
    skillName: string,
    category: SkillMastery["category"],
    v: number,
  ): SkillMastery => {
    const score = Math.round(v * 100);
    const status: SkillMastery["status"] =
      v >= TEACHER_SCORE_STRONG_MIN / 100
        ? "mastered"
        : v >= TEACHER_SCORE_MODERATE_MIN / 100
          ? "developing"
          : "at_risk";
    return {
      skillId,
      skillName,
      description: mergedDescriptions[skillId],
      category,
      score,
      status,
      lastUpdated: Date.now(),
      problemCount,
    };
  };
  const entries: SkillMastery[] = [];
  if (breakdown.conceptual != null) entries.push(row("conceptual", "Conceptual", "reaction_concepts", breakdown.conceptual));
  if (breakdown.procedural != null) entries.push(row("procedural", "Procedural", "rate_laws", breakdown.procedural));
  if (breakdown.computational != null) entries.push(row("computational", "Computational", "unit_conversion", breakdown.computational));
  return entries;
}

/** Map API practice attempts to the shape expected by PredictiveInsights (trend / pacing heuristics). */
export function studentAttemptsToPredictiveShape(attempts: StudentAttemptOut[]): ProblemAttempt[] {
  return attempts.map((a) => ({
    problemId: a.id,
    timestamp: new Date(a.started_at).getTime(),
    thinkingSteps: [],
    errors: [],
    hintsUsed: a.hints_used ?? 0,
    scaffoldingLevel: a.level ?? 0,
    totalTimeSeconds: a.time_spent_s ?? 0,
    stepFailures: {},
    firstAttemptCorrect: (a.score ?? 0) >= TEACHER_SCORE_STRONG_MIN / 100,
    finalScore: Math.round((a.score ?? 0) * 100),
  }));
}
