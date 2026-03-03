import { useState, useCallback, useRef } from "react";
import {
  ThinkingStep,
  ThinkingStepType,
  ThinkingCategory,
  ProblemAttempt,
  ClassifiedError,
  SkillMastery,
  StudentCognitiveProfile,
  MisconceptionPattern,
} from "@/types/cognitive";
import { supabase } from "@/integrations/supabase/client";
import { apiClassifyErrors, useBackendApi } from "@/lib/api";

const STEP_TYPE_TO_CATEGORY: Record<ThinkingStepType, ThinkingCategory> = {
  formula_selection: "conceptual",
  variable_identification: "conceptual",
  substitution: "procedural",
  calculation: "procedural",
  units_handling: "units",
  final_answer: "procedural",
};

const INITIAL_SKILLS: SkillMastery[] = [
  { skillId: "reaction_concepts", skillName: "Reaction Concepts", category: "reaction_concepts", score: 0, status: "developing", lastUpdated: Date.now(), problemCount: 0 },
  { skillId: "rate_laws", skillName: "Rate Laws", category: "rate_laws", score: 0, status: "developing", lastUpdated: Date.now(), problemCount: 0 },
  { skillId: "variable_isolation", skillName: "Variable Isolation", category: "variable_isolation", score: 0, status: "developing", lastUpdated: Date.now(), problemCount: 0 },
  { skillId: "unit_conversion", skillName: "Unit Conversion", category: "unit_conversion", score: 0, status: "developing", lastUpdated: Date.now(), problemCount: 0 },
  { skillId: "graph_interpretation", skillName: "Graph Interpretation", category: "graph_interpretation", score: 0, status: "developing", lastUpdated: Date.now(), problemCount: 0 },
];

export function useCognitiveTracking() {
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<Partial<ProblemAttempt>>({});
  const [classifiedErrors, setClassifiedErrors] = useState<ClassifiedError[]>([]);
  const [skillMap, setSkillMap] = useState<SkillMastery[]>(INITIAL_SKILLS);
  const [recentAttempts, setRecentAttempts] = useState<ProblemAttempt[]>([]);
  const [learningInsight, setLearningInsight] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const stepTimers = useRef<Record<string, number>>({});

  const startStepTimer = useCallback((stepId: string) => {
    stepTimers.current[stepId] = Date.now();
  }, []);

  const recordThinkingStep = useCallback((
    stepId: string,
    type: ThinkingStepType,
    studentInput: string,
    expectedValue?: string,
    isCorrect?: boolean
  ) => {
    const startTime = stepTimers.current[stepId] || Date.now();
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    const step: ThinkingStep = {
      id: stepId,
      type,
      category: STEP_TYPE_TO_CATEGORY[type],
      label: type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
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
    problemContext: string
  ): Promise<ClassifiedError[]> => {
    setIsAnalyzing(true);
    
    try {
      const incorrectSteps = steps.filter(s => s.isCorrect === false);
      if (incorrectSteps.length === 0) {
        setIsAnalyzing(false);
        return [];
      }

      let errors: ClassifiedError[];
      if (useBackendApi()) {
        const data = await apiClassifyErrors({
          steps: incorrectSteps.map(s => ({
            id: s.id,
            type: s.type,
            category: s.category,
            label: s.label,
            student_input: s.studentInput,
            expected_value: s.expectedValue,
            is_correct: s.isCorrect,
            time_spent: s.timeSpent,
          })),
          problem_context: problemContext,
          all_steps: steps.map(s => ({
            id: s.id,
            type: s.type,
            category: s.category,
            label: s.label,
            student_input: s.studentInput,
            expected_value: s.expectedValue,
            is_correct: s.isCorrect,
            time_spent: s.timeSpent,
          })),
        });
        errors = (data.errors || []).map(e => ({
          stepId: e.step_id,
          category: e.category as ClassifiedError["category"],
          subcategory: e.subcategory as ClassifiedError["subcategory"],
          severity: e.severity as ClassifiedError["severity"],
          description: e.description,
          conceptMissing: e.concept_missing ?? undefined,
          misconception_tag: e.misconception_tag,
          suggestedIntervention: e.suggested_intervention as ClassifiedError["suggestedIntervention"],
        }));
        setClassifiedErrors(errors);
        setLearningInsight(data.insight || "");
      } else {
        const response = await supabase.functions.invoke("classify-errors", {
          body: {
            steps: incorrectSteps,
            problemContext,
            allSteps: steps,
          },
        });
        if (response.error) {
          console.error("Error classifying:", response.error);
          const fallbackErrors = incorrectSteps.map(step => ({
            stepId: step.id,
            category: step.category === "conceptual" ? "conceptual" as const : "procedural" as const,
            severity: "slowing" as const,
            description: `Error in ${step.label}`,
            suggestedIntervention: step.category === "conceptual" ? "concept_refresher" as const : "faded_example" as const,
          }));
          setClassifiedErrors(fallbackErrors);
          setIsAnalyzing(false);
          return fallbackErrors;
        }
        errors = response.data?.errors || [];
        setClassifiedErrors(errors);
        setLearningInsight(response.data?.insight || "");
      }
      setIsAnalyzing(false);
      return errors;
    } catch (error) {
      console.error("Classification error:", error);
      setIsAnalyzing(false);
      return [];
    }
  }, []);

  // Detect misconception patterns from recent errors
  const detectPatterns = useCallback((errors: ClassifiedError[]): MisconceptionPattern[] => {
    const tagCounts: Record<string, MisconceptionPattern> = {};
    
    errors.forEach(err => {
      const tag = err.misconception_tag || `${err.category}_${err.subcategory || "general"}`;
      if (!tagCounts[tag]) {
        tagCounts[tag] = {
          tag,
          category: err.category,
          subcategory: err.subcategory,
          count: 0,
          description: err.description,
        };
      }
      tagCounts[tag].count += 1;
    });

    return Object.values(tagCounts)
      .filter(p => p.count >= 2) // Only patterns with 2+ occurrences
      .sort((a, b) => b.count - a.count);
  }, []);

  const updateSkillFromAttempt = useCallback((
    errors: ClassifiedError[],
    steps: ThinkingStep[],
    _hintsUsed: number, // tracked for analytics but no longer penalized
    scaffoldingLevel: number = 2
  ) => {
    setSkillMap(prev => {
      const updated = [...prev];
      
      const correctSteps = steps.filter(s => s.isCorrect === true);
      const totalSteps = steps.length;
      const overallRate = totalSteps > 0 ? correctSteps.length / totalSteps : 0;
      
      for (const skill of updated) {
        const relevantSteps = steps.filter(s => {
          if (skill.category === "reaction_concepts") return s.type === "formula_selection";
          if (skill.category === "rate_laws") return s.type === "variable_identification";
          if (skill.category === "variable_isolation") return s.type === "substitution" || s.type === "calculation" || s.type === "final_answer";
          if (skill.category === "unit_conversion") return s.type === "units_handling" || s.type === "final_answer";
          if (skill.category === "graph_interpretation") return false;
          return false;
        });

        let adjustment = 0;

        if (relevantSteps.length > 0) {
          const relevantCorrect = relevantSteps.filter(s => s.isCorrect === true).length;
          const relevantRate = relevantCorrect / relevantSteps.length;
          // Phase 8: No hint penalty — reward eventual correctness
          adjustment = (relevantRate * 20) - ((1 - relevantRate) * 12);
        } else {
          if (skill.category === "reaction_concepts" || skill.category === "rate_laws") {
            if (scaffoldingLevel >= 3) {
              adjustment = (overallRate * 18) - ((1 - overallRate) * 10);
            } else if (scaffoldingLevel === 2 && overallRate > 0) {
              adjustment = (overallRate * 8) - ((1 - overallRate) * 4);
            }
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
    firstAttemptCorrect: boolean
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
      finalScore: (correctSteps.length / thinkingSteps.length) * 100,
    };

    setRecentAttempts(prev => [attempt, ...prev.slice(0, 4)]); // Keep last 5
    updateSkillFromAttempt(classifiedErrors, thinkingSteps, hintsUsed, scaffoldingLevel);
    
    return attempt;
  }, [thinkingSteps, classifiedErrors, updateSkillFromAttempt]);

  const resetTracking = useCallback(() => {
    setThinkingSteps([]);
    setClassifiedErrors([]);
    setCurrentAttempt({});
    stepTimers.current = {};
  }, []);

  const getCognitiveProfile = useCallback((): StudentCognitiveProfile => {
    const errorPatterns = classifiedErrors.reduce((acc, error) => {
      const existing = acc.find(p => p.category === error.category);
      if (existing) {
        existing.count += 1;
        existing.recentSteps.push(error.stepId);
      } else {
        acc.push({
          category: error.category,
          count: 1,
          recentSteps: [error.stepId],
        });
      }
      return acc;
    }, [] as StudentCognitiveProfile["errorPatterns"]);

    const weakTopics = skillMap
      .filter(s => s.status === "at_risk")
      .map(s => s.skillName);

    return {
      studentId: "current-student",
      masteryScore: skillMap.reduce((acc, s) => acc + s.score, 0) / skillMap.length,
      skillMap,
      recentAttempts,
      errorPatterns,
      learningPatternSummary: learningInsight,
      predictedProficiency: {},
      weakTopics,
    };
  }, [skillMap, recentAttempts, classifiedErrors, learningInsight]);

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
  };
}
