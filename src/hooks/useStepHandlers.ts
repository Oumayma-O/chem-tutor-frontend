/**
 * useStepHandlers — owns answer/hint state and step interaction logic:
 * validation, hints, reset, structured steps, and error classification.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
        return s.type !== "given" || !!s.equation_parts || !!s.labeled_values;
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
      (s) => answers[s.id]?.is_correct !== undefined || structuredStepComplete[s.id],
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
        step_id: stepId,
        answer,
        is_correct: undefined,
        attempts: prev[stepId]?.attempts || 0,
        first_attempt_correct: prev[stepId]?.first_attempt_correct,
      },
    }));
  };

  const handleCheckAnswer = useCallback(
    async (stepId: string) => {
      if (!currentProblem) return;
      onMarkInProgress?.();
      const step = currentProblem.steps.find((s) => s.id === stepId);
      if (!step) return;
      if (!step.correct_answer) {
        console.warn("Step has no correct_answer — skipping validation", step);
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
        // Send the step being validated (step_id, step_number, correct_answer) so backend uses this step's key
        const data = await apiValidateStep({
          student_answer: studentText,
          correct_answer: step.correct_answer,
          step_id: step.id,
          step_number: step.step_number,
          step_label: step.label,
          step_type: step.type,
          problem_context: currentProblem.description,
        });
        isCorrect = data.is_correct;
        if (!isCorrect && data.feedback) {
          setAnswers((prev) => ({
            ...prev,
            [stepId]: { ...prev[stepId], validation_feedback: data.feedback },
          }));
        }
      } catch {
        const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");
        const numStudent = parseFloat(normalize(studentText));
        const numCorrect = parseFloat(normalize(step.correct_answer ?? ""));
        if (!isNaN(numStudent) && !isNaN(numCorrect)) {
          // Final "Answer" / "Final Answer" steps: strict 1% tolerance (sig figs matter).
          // All intermediate steps: 5% tolerance (rounding variations are acceptable).
          const isFinalStep = step.label.toLowerCase().includes("answer");
          const tolerance = isFinalStep ? 0.01 : 0.05;
          isCorrect = numCorrect === 0
            ? Math.abs(numStudent) < 1e-9
            : Math.abs(numStudent - numCorrect) / Math.abs(numCorrect) <= tolerance;
        } else {
          isCorrect = normalize(studentText) === normalize(step.correct_answer ?? "");
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
          is_correct: isCorrect,
          attempts: (prev[stepId]?.attempts || 0) + 1,
          first_attempt_correct: prev[stepId]?.first_attempt_correct ?? (isFirstAttempt && isCorrect),
        },
      }));

      const stepType = STEP_TYPE_MAP[step.step_number] || "calculation";
      recordThinkingStep(stepId, stepType, studentText, step.correct_answer, isCorrect);

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
          expectedValue: step.correct_answer,
          isCorrect,
          timestamp: Date.now(),
          timeSpent: 0,
        },
      ];
      updateSkillFromAttempt(classifiedErrors, updatedSteps, Object.keys(hints).length, currentLevel);

      if (isCorrect) {
        toast.success(isFirstAttempt ? "Perfect! First try!" : "Correct!");
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

      setHintLoading((prev) => new Set(prev).add(stepId));

      try {
        const data = await apiGetHint({
          step_id: stepId,
          step_label: step.label,
          step_instruction: step.instruction,
          student_input: answers[stepId]?.answer || "",
          correct_answer: step.correct_answer || "",
          attempt_count: answers[stepId]?.attempts || 1,
          interests: interests || [],
          grade_level: gradeLevel,
          problem_context: currentProblem.description,
          validation_feedback: answers[stepId]?.validation_feedback,
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
      setAnswers((prev) => {
        const attempts = (prev[stepId]?.attempts || 0) + 1;
        const isFirstAttempt = !prev[stepId]?.attempts || prev[stepId]?.attempts === 0;
        return {
          ...prev,
          [stepId]: {
            step_id: stepId,
            answer: prev[stepId]?.answer || "",
            is_correct: isCorrect,
            attempts,
            first_attempt_correct: prev[stepId]?.first_attempt_correct ?? (isFirstAttempt && isCorrect),
          },
        };
      });

      if (isCorrect) {
        setStructuredStepComplete((prev) => ({ ...prev, [stepId]: true }));
        toast.success("Correct!");
      }
    },
    [],
  );

  const handleValidateEquation = useCallback(
    async (mathExpr: string, step: SolutionStep): Promise<boolean> => {
      try {
        const result = await apiValidateStep({
          student_answer: mathExpr,
          correct_answer: step.correct_answer || "",
          step_id: step.id,
          step_number: step.step_number,
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
