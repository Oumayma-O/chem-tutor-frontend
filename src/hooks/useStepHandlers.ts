/**
 * useStepHandlers — owns answer/hint state and step interaction logic:
 * validation, hints, reset, structured steps, and error classification.
 */

import { useState, useCallback, useEffect, useMemo, useRef, Dispatch, SetStateAction } from "react";
import { Level, Problem, SolutionStep, StudentAnswer } from "@/types/chemistry";
import { ThinkingStep, ThinkingStepType, ClassifiedError } from "@/types/cognitive";
import { apiValidateStep, apiGetHint } from "@/lib/api";
import { evaluateExpression, isExpression } from "@/lib/mathEval";
import { toast } from "sonner";
import { PerProblemState } from "@/hooks/useProblemNavigation";
import { MutableRefObject } from "react";

export const STEP_TYPE_MAP: Record<number, ThinkingStepType> = {
  1: "formula_selection",
  2: "variable_identification",
  3: "substitution",
  4: "calculation",
  5: "units_handling",
};

interface UseStepHandlersOptions {
  currentProblem: Problem | null;
  currentLevel: Level;
  calculatorEnabled: boolean;
  interests: string[];
  gradeLevel: string | null;
  perProblemCacheRef: MutableRefObject<Record<string, PerProblemState>>;
  // From useCognitiveTracking
  thinkingSteps: ThinkingStep[];
  classifiedErrors: ClassifiedError[];
  recordThinkingStep: (
    stepId: string,
    type: ThinkingStepType,
    studentInput: string,
    expectedValue?: string,
    isCorrect?: boolean,
  ) => ThinkingStep;
  updateSkillFromAttempt: (
    errors: ClassifiedError[],
    steps: ThinkingStep[],
    hintsUsed: number,
    scaffoldingLevel: number,
  ) => void;
  classifyErrors: (steps: ThinkingStep[], problemContext: string) => Promise<ClassifiedError[]>;
  resetTracking: () => void;
  setMasteryScore: Dispatch<SetStateAction<number>>;
  onMarkInProgress?: () => void;
}

export function useStepHandlers({
  currentProblem,
  currentLevel,
  calculatorEnabled,
  interests,
  gradeLevel,
  perProblemCacheRef,
  thinkingSteps,
  classifiedErrors,
  recordThinkingStep,
  updateSkillFromAttempt,
  classifyErrors,
  resetTracking,
  setMasteryScore,
  onMarkInProgress,
}: UseStepHandlersOptions) {
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [hints, setHints] = useState<Record<string, string>>({});
  const [hintLoading, setHintLoading] = useState<Set<string>>(new Set());
  const [checkingAnswer, setCheckingAnswer] = useState<Set<string>>(new Set());
  const [structuredStepComplete, setStructuredStepComplete] = useState<Record<string, boolean>>({});

  const hasClassifiedRef = useRef(false);

  // Derive interactive steps: all steps that require student input (not purely given).
  // Level 2: only type "interactive" (steps 1–2 are given/faded).
  // Level 3: include EquationBuilder/KnownsIdentifier steps even if type is "given".
  const interactiveSteps = useMemo(() => {
    if (!currentProblem) return [];
    return currentProblem.steps.filter((s) => {
      if (currentLevel === 2) return s.type === "interactive";
      if (currentLevel === 3) {
        return s.type !== "given" || !!s.equationParts || !!s.knownVariables;
      }
      return s.type !== "given";
    });
  }, [currentProblem, currentLevel]);

  // Reset classification guard when problem changes
  useEffect(() => {
    hasClassifiedRef.current = false;
  }, [currentProblem?.id]);

  // Classify errors once all interactive steps have been attempted
  useEffect(() => {
    if (hasClassifiedRef.current) return;
    const allAttempted = interactiveSteps.every(
      (s) => answers[s.id]?.isCorrect !== undefined || structuredStepComplete[s.id],
    );
    if (allAttempted && thinkingSteps.length > 0) {
      hasClassifiedRef.current = true;
      classifyErrors(thinkingSteps, currentProblem?.description || "");
    }
  }, [answers, structuredStepComplete, interactiveSteps, thinkingSteps, classifyErrors, currentProblem?.description]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAnswerChange = (stepId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [stepId]: {
        stepId,
        answer,
        isCorrect: undefined,
        attempts: prev[stepId]?.attempts || 0,
        firstAttemptCorrect: prev[stepId]?.firstAttemptCorrect,
      },
    }));
  };

  const handleCheckAnswer = useCallback(
    async (stepId: string) => {
      if (!currentProblem) return;
      onMarkInProgress?.();
      const step = currentProblem.steps.find((s) => s.id === stepId);
      if (!step) return;
      if (!step.correctAnswer) {
        console.warn("Step has no correctAnswer — skipping validation", step);
        return;
      }
      if (checkingAnswer.has(stepId)) return;

      const currentAnswer = answers[stepId];
      let studentText = currentAnswer?.answer?.trim() || "";
      const isFirstAttempt = !currentAnswer?.attempts || currentAnswer.attempts === 0;

      if (calculatorEnabled && isExpression(studentText)) {
        const evaluated = evaluateExpression(studentText);
        if (evaluated !== null) {
          const rounded = Math.round(evaluated * 1e10) / 1e10;
          studentText = String(rounded);
        }
      }

      setCheckingAnswer((prev) => new Set(prev).add(stepId));

      let isCorrect = false;
      try {
        const data = await apiValidateStep({
          student_answer: studentText,
          correct_answer: step.correctAnswer,
          step_label: step.label,
          step_type: step.type,
          problem_context: currentProblem.description,
        });
        isCorrect = data.is_correct;
      } catch {
        const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");
        const numStudent = parseFloat(normalize(studentText));
        const numCorrect = parseFloat(normalize(step.correctAnswer));
        if (!isNaN(numStudent) && !isNaN(numCorrect)) {
          isCorrect = Math.abs(numStudent - numCorrect) < 0.01;
        } else {
          isCorrect = normalize(studentText) === normalize(step.correctAnswer);
        }
      } finally {
        setCheckingAnswer((prev) => {
          const next = new Set(prev);
          next.delete(stepId);
          return next;
        });
      }

      setAnswers((prev) => ({
        ...prev,
        [stepId]: {
          ...prev[stepId],
          isCorrect,
          attempts: (prev[stepId]?.attempts || 0) + 1,
          firstAttemptCorrect: prev[stepId]?.firstAttemptCorrect ?? (isFirstAttempt && isCorrect),
        },
      }));

      const stepType = STEP_TYPE_MAP[step.stepNumber] || "calculation";
      recordThinkingStep(stepId, stepType, studentText, step.correctAnswer, isCorrect);

      const updatedSteps = [
        ...thinkingSteps,
        {
          id: stepId,
          type: stepType,
          category:
            stepType === "formula_selection" || stepType === "variable_identification"
              ? ("conceptual" as const)
              : stepType === "units_handling"
                ? ("units" as const)
                : ("procedural" as const),
          label: stepType,
          studentInput: studentText,
          expectedValue: step.correctAnswer,
          isCorrect,
          timestamp: Date.now(),
          timeSpent: 0,
        },
      ];
      updateSkillFromAttempt(classifiedErrors, updatedSteps, Object.keys(hints).length, currentLevel);

      if (isCorrect) {
        const bonus = isFirstAttempt ? 8 : 4;
        setMasteryScore((prev) => Math.min(100, prev + bonus));
        toast.success(isFirstAttempt ? "Perfect! First try!" : "Correct!");
      } else {
        setMasteryScore((prev) => Math.max(0, prev - 3));
      }
    },
    [currentProblem, answers, checkingAnswer, onMarkInProgress, recordThinkingStep, calculatorEnabled], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleRequestHint = useCallback(
    async (stepId: string) => {
      if (!currentProblem) return;
      if (hints[stepId] || hintLoading.has(stepId)) return;

      const step = currentProblem.steps.find((s) => s.id === stepId);
      if (!step) return;

      setMasteryScore((prev) => Math.max(0, prev - 2));
      setHintLoading((prev) => new Set(prev).add(stepId));

      try {
        const data = await apiGetHint({
          step_id: stepId,
          step_label: step.label,
          step_instruction: step.instruction,
          student_input: answers[stepId]?.answer || "",
          correct_answer: step.correctAnswer || "",
          attempt_count: answers[stepId]?.attempts || 1,
          interests: interests || [],
          grade_level: gradeLevel,
          problem_context: currentProblem.description,
        });
        if (data?.hint) {
          setHints((prev) => ({ ...prev, [stepId]: data.hint }));
        } else {
          setHints((prev) => ({ ...prev, [stepId]: step.hint || "Review the formula and try again." }));
        }
      } catch {
        setHints((prev) => ({ ...prev, [stepId]: step.hint || "Review the formula and try again." }));
      } finally {
        setHintLoading((prev) => {
          const next = new Set(prev);
          next.delete(stepId);
          return next;
        });
      }
    },
    [currentProblem, answers, interests, gradeLevel, hints, hintLoading], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleReset = useCallback(() => {
    if (currentProblem) delete perProblemCacheRef.current[currentProblem.id];
    setAnswers({});
    setHints({});
    setHintLoading(new Set());
    setStructuredStepComplete({});
    resetTracking();
    toast.info("Problem reset. Try again!");
  }, [currentProblem, resetTracking]); // perProblemCacheRef is a stable ref

  const handleStructuredStepComplete = useCallback(
    (stepId: string, isCorrect: boolean) => {
      if (isCorrect) {
        setStructuredStepComplete((prev) => ({ ...prev, [stepId]: true }));
        setMasteryScore((prev) => Math.min(100, prev + 6));
        toast.success("Correct!");
      } else {
        setMasteryScore((prev) => Math.max(0, prev - 3));
      }
    },
    [setMasteryScore],
  );

  const handleValidateEquation = useCallback(
    async (mathExpr: string, step: SolutionStep): Promise<boolean> => {
      try {
        const result = await apiValidateStep({
          student_answer: mathExpr,
          correct_answer: step.correctAnswer || "",
          step_label: step.label,
          step_type: "drag_drop",
          problem_context: currentProblem?.description || "",
        });
        return result.is_correct;
      } catch {
        return false;
      }
    },
    [currentProblem],
  );

  return {
    answers,
    setAnswers,
    hints,
    setHints,
    hintLoading,
    setHintLoading,
    checkingAnswer,
    structuredStepComplete,
    setStructuredStepComplete,
    interactiveSteps,
    handleAnswerChange,
    handleCheckAnswer,
    handleRequestHint,
    handleReset,
    handleStructuredStepComplete,
    handleValidateEquation,
  };
}
