import type { SkillMastery, ProblemAttempt } from "@/types/cognitive";
import type { CategorySnapshot, StudentAttemptOut } from "@/services/api/teacher";

/** Build skill rows for PredictiveInsights from aggregated class category scores (0–1). */
export function skillMapFromCategoryBreakdown(
  breakdown: CategorySnapshot | undefined,
  problemCount: number,
): SkillMastery[] {
  if (!breakdown) return [];
  const row = (
    skillId: "conceptual" | "procedural" | "computational",
    skillName: string,
    category: SkillMastery["category"],
    v: number,
  ): SkillMastery => {
    const score = Math.round(v * 100);
    const status: SkillMastery["status"] =
      v >= 0.75 ? "mastered" : v >= 0.5 ? "developing" : "at_risk";
    return {
      skillId,
      skillName,
      category,
      score,
      status,
      lastUpdated: Date.now(),
      problemCount,
    };
  };
  return [
    row("conceptual", "Conceptual", "reaction_concepts", breakdown.conceptual ?? 0),
    row("procedural", "Procedural", "rate_laws", breakdown.procedural ?? 0),
    row("computational", "Computational", "unit_conversion", breakdown.computational ?? 0),
  ];
}

/** Map API practice attempts to the shape expected by PredictiveInsights (trend / pacing heuristics). */
export function studentAttemptsToPredictiveShape(attempts: StudentAttemptOut[]): ProblemAttempt[] {
  return attempts.map((a) => ({
    problemId: a.id,
    timestamp: new Date(a.started_at).getTime(),
    thinkingSteps: [],
    errors: [],
    hintsUsed: 0,
    scaffoldingLevel: 0,
    totalTimeSeconds: 0,
    stepFailures: {},
    firstAttemptCorrect: (a.score ?? 0) >= 0.75,
    finalScore: Math.round((a.score ?? 0) * 100),
  }));
}
