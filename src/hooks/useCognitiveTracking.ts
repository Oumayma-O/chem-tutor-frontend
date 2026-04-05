import { useState, useCallback, useRef } from "react";
import {
  ThinkingStep,
  ProblemAttempt,
  ClassifiedError,
  SkillMastery,
  StudentCognitiveProfile,
  MisconceptionPattern,
} from "@/types/cognitive";
import { apiClassifyErrors, useBackendApi } from "@/lib/api";
import { STEP_LABEL_TO_MASTERY_CATEGORY } from "@/lib/stepLabelToMasteryCategory";

const INITIAL_SKILLS: SkillMastery[] = [
  { skillId: "reaction_concepts", skillName: "Reaction Concepts", category: "reaction_concepts", score: 0, status: "developing", lastUpdated: Date.now(), problemCount: 0 },
  { skillId: "rate_laws", skillName: "Rate Laws", category: "rate_laws", score: 0, status: "developing", lastUpdated: Date.now(), problemCount: 0 },
  { skillId: "variable_isolation", skillName: "Variable Isolation", category: "variable_isolation", score: 0, status: "developing", lastUpdated: Date.now(), problemCount: 0 },
  { skillId: "unit_conversion", skillName: "Unit Conversion", category: "unit_conversion", score: 0, status: "developing", lastUpdated: Date.now(), problemCount: 0 },
  { skillId: "graph_interpretation", skillName: "Graph Interpretation", category: "graph_interpretation", score: 0, status: "developing", lastUpdated: Date.now(), problemCount: 0 },
];

/** Conceptual skills: update when blueprint is conceptual ("architect"|"detective"|"lawyer"). */
const CONCEPTUAL_SKILL_CATEGORIES = new Set(["reaction_concepts", "graph_interpretation"]);

export function useCognitiveTracking() {
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [currentAttempt] = useState<Partial<ProblemAttempt>>({});
  const [classifiedErrors, setClassifiedErrors] = useState<ClassifiedError[]>([]);
  const [skillMap, setSkillMap] = useState<SkillMastery[]>(INITIAL_SKILLS);
  const [recentAttempts, setRecentAttempts] = useState<ProblemAttempt[]>([]);
  const [learningInsight, setLearningInsight] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const stepTimers = useRef<Record<string, number>>({});

  const startStepTimer = useCallback((stepId: string) => {
    stepTimers.current[stepId] = Date.now();
  }, []);

  /**
   * Record one step outcome into the thinking tracker.
   *
   * @param skillUsed  step.skill_used from backend (e.g. "Write rate law expressions…")
   * @param blueprint  problem.blueprint — drives the cognitive category
   */
  const recordThinkingStep = useCallback((
    stepId: string,
    skillUsed: string,
    studentInput: string,
    stepLabel?: string | null,
    expectedValue?: string,
    isCorrect?: boolean,
  ) => {
    const startTime = stepTimers.current[stepId] || Date.now();
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    const step: ThinkingStep = {
      id: stepId,
      skill_used: skillUsed,
      category: STEP_LABEL_TO_MASTERY_CATEGORY[stepLabel ?? ""] ?? "procedural",
      label: stepLabel || skillUsed || stepId,
      studentInput,
      expectedValue,
      isCorrect,
      timestamp: Date.now(),
      timeSpent,
    };

    setThinkingSteps(prev => {
      const existing = prev.findIndex(s => s.id === stepId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = step;
        return updated;
      }
      return [...prev, step];
    });

    return step;
  }, []);

  const classifyErrors = useCallback(async (
    steps: ThinkingStep[],
    problemContext: string,
  ): Promise<ClassifiedError[]> => {
    setIsAnalyzing(true);

    try {
      const incorrectSteps = steps.filter(s => s.isCorrect === false);
      if (incorrectSteps.length === 0) {
        setIsAnalyzing(false);
        return [];
      }

      let errors: ClassifiedError[];
      const backend = useBackendApi();
      if (backend) {
        const data = await apiClassifyErrors({
          steps: incorrectSteps.map(s => ({
            step_id: s.id,
            step_label: s.label,
            student_input: s.studentInput,
            is_correct: s.isCorrect,
            time_spent_seconds: s.timeSpent,
            attempt_count: 1,
          })),
          problem_context: problemContext,
          all_steps: steps.map(s => ({
            step_id: s.id,
            step_label: s.label,
            student_input: s.studentInput,
            expected_value: s.expectedValue,
            is_correct: s.isCorrect,
            time_spent_seconds: s.timeSpent,
          })),
        });
        type RawError = {
          step_id?: string; category?: string; error_category?: string;
          subcategory?: string; error_subcategory?: string; severity?: string;
          description?: string; step_label?: string; concept_missing?: string;
          misconception_tag?: string; suggested_intervention?: string;
        };
        errors = ((data.errors || []) as RawError[]).map(e => ({
          stepId: e.step_id ?? "",
          category: (e.category ?? e.error_category) as ClassifiedError["category"],
          subcategory: (e.subcategory ?? e.error_subcategory) as ClassifiedError["subcategory"],
          severity: (e.severity ?? "slowing") as ClassifiedError["severity"],
          description: e.description ?? `Issue in ${e.step_label ?? "step"}`,
          conceptMissing: e.concept_missing ?? undefined,
          misconception_tag: e.misconception_tag,
          suggestedIntervention: (e.suggested_intervention ?? "concept_refresher") as ClassifiedError["suggestedIntervention"],
        }));
        setClassifiedErrors(errors);
        setLearningInsight(data.insight || "");
      } else {
        const fallbackErrors = incorrectSteps.map((step) => ({
          stepId: step.id,
          category: (step.category === "conceptual" ? "conceptual" : "procedural") as ClassifiedError["category"],
          severity: "slowing" as const,
          description: `Error in ${step.label}`,
          suggestedIntervention: (step.category === "conceptual" ? "concept_refresher" : "faded_example") as ClassifiedError["suggestedIntervention"],
        }));
        errors = fallbackErrors;
        setClassifiedErrors(fallbackErrors);
        setLearningInsight("");
      }
      setIsAnalyzing(false);
      return errors;
    } catch (error) {
      console.error("Classification error:", error);
      setIsAnalyzing(false);
      return [];
    }
  }, []);

  const detectPatterns = useCallback((errors: ClassifiedError[]): MisconceptionPattern[] => {
    const tagCounts: Record<string, MisconceptionPattern> = {};
    errors.forEach(err => {
      const tag = err.misconception_tag || `${err.category}_${err.subcategory || "general"}`;
      if (!tagCounts[tag]) {
        tagCounts[tag] = { tag, category: err.category, subcategory: err.subcategory, count: 0, description: err.description };
      }
      tagCounts[tag].count += 1;
    });
    return Object.values(tagCounts).filter(p => p.count >= 2).sort((a, b) => b.count - a.count);
  }, []);

  /**
   * Update per-skill scores after a problem attempt.
   * Category alignment comes from ThinkingStep.category (blueprint-derived), not UI widget type.
   *   Conceptual skills  (reaction_concepts, graph_interpretation) → update on conceptual steps.
   *   Procedural skills  (rate_laws, variable_isolation, unit_conversion) → update on procedural steps.
   */
  const updateSkillFromAttempt = useCallback((
    _errors: ClassifiedError[],
    steps: ThinkingStep[],
    _hintsUsed: number,
    scaffoldingLevel: number = 2,
  ) => {
    setSkillMap(prev => {
      const updated = [...prev];

      const correctSteps = steps.filter(s => s.isCorrect === true);
      const totalSteps = steps.length;
      const overallRate = totalSteps > 0 ? correctSteps.length / totalSteps : 0;

      for (const skill of updated) {
        const skillIsConceptual = CONCEPTUAL_SKILL_CATEGORIES.has(skill.category);

        // Find steps whose cognitive category aligns with this skill's domain.
        const relevantSteps = steps.filter(s =>
          skillIsConceptual ? s.category === "conceptual" : s.category === "procedural",
        );

        let adjustment = 0;

        if (relevantSteps.length > 0) {
          const relevantCorrect = relevantSteps.filter(s => s.isCorrect === true).length;
          const relevantRate = relevantCorrect / relevantSteps.length;
          adjustment = (relevantRate * 20) - ((1 - relevantRate) * 12);
        } else {
          // No directly relevant steps — apply a softer overall signal at higher scaffolding.
          if (scaffoldingLevel >= 3) {
            adjustment = (overallRate * 18) - ((1 - overallRate) * 10);
          } else if (scaffoldingLevel === 2 && overallRate > 0) {
            adjustment = (overallRate * 8) - ((1 - overallRate) * 4);
          }
        }

        if (adjustment !== 0) {
          skill.score = Math.max(0, Math.min(100, skill.score + adjustment));
          skill.lastUpdated = Date.now();
          skill.problemCount += 1;
          if (skill.score >= 80) skill.status = "mastered";
          else if (skill.score >= 20) skill.status = "developing";
          else skill.status = "at_risk";
        }
      }

      return updated;
    });
  }, []);

  const completeProblemAttempt = useCallback((
    problemId: string,
    hintsUsed: number,
    scaffoldingLevel: number,
    firstAttemptCorrect: boolean,
  ) => {
    const correctSteps = thinkingSteps.filter(s => s.isCorrect === true);
    const totalTime = thinkingSteps.reduce((acc, s) => acc + s.timeSpent, 0);

    const stepFailures: Record<string, number> = {};
    thinkingSteps.forEach(step => {
      if (step.isCorrect === false) {
        stepFailures[step.id] = (stepFailures[step.id] || 0) + 1;
      }
    });

    const attempt: ProblemAttempt = {
      problemId,
      timestamp: Date.now(),
      thinkingSteps: [...thinkingSteps],
      errors: [...classifiedErrors],
      hintsUsed,
      scaffoldingLevel,
      totalTimeSeconds: totalTime,
      stepFailures,
      firstAttemptCorrect,
      finalScore: thinkingSteps.length > 0 ? (correctSteps.length / thinkingSteps.length) * 100 : 0,
    };

    setRecentAttempts(prev => [attempt, ...prev.slice(0, 4)]);
    updateSkillFromAttempt(classifiedErrors, thinkingSteps, hintsUsed, scaffoldingLevel);

    return attempt;
  }, [thinkingSteps, classifiedErrors, updateSkillFromAttempt]);

  const resetTracking = useCallback(() => {
    setThinkingSteps([]);
    setClassifiedErrors([]);
    stepTimers.current = {};
  }, []);

  const getCognitiveProfile = useCallback((): StudentCognitiveProfile => {
    const errorPatterns = classifiedErrors.reduce((acc, error) => {
      const existing = acc.find(p => p.category === error.category);
      if (existing) {
        existing.count += 1;
        existing.recentSteps.push(error.stepId);
      } else {
        acc.push({ category: error.category, count: 1, recentSteps: [error.stepId] });
      }
      return acc;
    }, [] as StudentCognitiveProfile["errorPatterns"]);

    const weakLessons = skillMap.filter(s => s.status === "at_risk").map(s => s.skillName);

    return {
      studentId: "current-student",
      masteryScore: skillMap.reduce((acc, s) => acc + s.score, 0) / skillMap.length,
      skillMap,
      recentAttempts,
      errorPatterns,
      learningPatternSummary: learningInsight,
      predictedProficiency: {},
      weakLessons,
    };
  }, [skillMap, recentAttempts, classifiedErrors, learningInsight]);

  // currentAttempt kept in return for API surface compat
  void currentAttempt;

  return {
    thinkingSteps,
    classifiedErrors,
    skillMap,
    recentAttempts,
    learningInsight,
    isAnalyzing,
    startStepTimer,
    recordThinkingStep,
    classifyErrors,
    detectPatterns,
    updateSkillFromAttempt,
    completeProblemAttempt,
    resetTracking,
    getCognitiveProfile,
    setThinkingSteps,
    setClassifiedErrors,
  };
}
