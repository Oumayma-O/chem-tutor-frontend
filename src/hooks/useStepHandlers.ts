/**
 * useStepHandlers — owns answer state and step interaction logic:
 * validation, structured steps, error classification. Hints live in useStepHints.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Level, Problem, SolutionStep, StudentAnswer } from "@/types/chemistry";
import { ThinkingStep, ClassifiedError } from "@/types/cognitive";
import { apiValidateStep } from "@/lib/api";
import { compareStudentAnswerFallback } from "@/lib/stepValidationFallback";
import { validateMultiInputStep as validateMultiInputStepApi } from "@/lib/validateMultiInputStep";
import { isStepAnswerAttempted } from "@/lib/masteryTransforms";
import { buildMathExpression, canonicalDragDropFromParts } from "@/lib/equationDragDrop";
import { formatStructuredAnswerForThinkingTracker } from "@/lib/thinkingTrackerFormat";
import { toast } from "sonner";
import { PerProblemState } from "@/hooks/useProblemNavigation";
import { useStepHints } from "@/hooks/useStepHints";
import { MutableRefObject } from "react";

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
    skillUsed: string,
    studentInput: string,
    stepLabel?: string | null,
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
  const [checkingAnswer, setCheckingAnswer] = useState<Set<string>>(new Set());
  const [structuredStepComplete, setStructuredStepComplete] = useState<Record<string, boolean>>({});

  const {
    hints,
    setHints,
    hintLoading,
    setHintLoading,
    clearStaleHintForStep,
    handleRequestHint,
  } = useStepHints({ currentProblem, answers, interests, gradeLevel });

  const hasClassifiedRef = useRef(false);

  const interactiveSteps = useMemo(() => {
    if (!currentProblem) return [];
    return currentProblem.steps.filter((s) => !s.is_given);
  }, [currentProblem]);

  useEffect(() => {
    hasClassifiedRef.current = false;
  }, [currentProblem?.id]);

  useEffect(() => {
    if (hasClassifiedRef.current) return;
    const allAttempted = interactiveSteps.every((s) =>
      isStepAnswerAttempted(answers, structuredStepComplete, s.id),
    );
    if (allAttempted && thinkingSteps.length > 0) {
      hasClassifiedRef.current = true;
      classifyErrors(thinkingSteps, currentProblem?.description || "");
    }
  }, [answers, structuredStepComplete, interactiveSteps, thinkingSteps, classifyErrors, currentProblem?.description]);

  const handleAnswerChange = (stepId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [stepId]: {
        step_id: stepId,
        answer,
        is_correct: undefined,
        attempts: prev[stepId]?.attempts || 0,
        first_attempt_correct: prev[stepId]?.first_attempt_correct,
        validation_feedback: undefined,
      },
    }));
  };

  const validateMultiInputStep = useCallback(
    async (
      step: SolutionStep,
      studentAnswer: string,
      correctAnswer: string,
    ): Promise<{ isCorrect: boolean; feedback?: string }> => {
      if (!currentProblem) {
        return { isCorrect: false, feedback: undefined };
      }
      return validateMultiInputStepApi(currentProblem, step, studentAnswer, correctAnswer);
    },
    [currentProblem],
  );

  const handleCheckAnswer = useCallback(
    async (stepId: string) => {
      if (!currentProblem) return;
      const step = currentProblem.steps.find((s) => s.id === stepId);
      if (!step) return;
      if (!step.correct_answer) {
        console.warn("Step has no correct_answer — skipping validation", step);
        return;
      }
      if (checkingAnswer.has(stepId)) return;

      clearStaleHintForStep(stepId);

      const currentAnswer = answers[stepId];
      let studentText = currentAnswer?.answer?.trim() || "";
      const isFirstAttempt = !currentAnswer?.attempts || currentAnswer.attempts === 0;
      const hadHintForStep = Boolean(hints[stepId]);

      // Expression evaluation is handled entirely by the backend.
      // Sending the raw expression preserves the student's notation and lets
      // the server apply correct operator-precedence rules (e.g. N*10^E grouping).

      setAnswers((prev) => ({
        ...prev,
        [stepId]: {
          ...prev[stepId],
          step_id: stepId,
          answer: prev[stepId]?.answer ?? "",
          is_correct: undefined,
          attempts: prev[stepId]?.attempts || 0,
          first_attempt_correct: prev[stepId]?.first_attempt_correct,
          validation_feedback: undefined,
        },
      }));

      onMarkInProgress?.();

      setCheckingAnswer((prev) => new Set(prev).add(stepId));

      let isCorrect = false;
      let apiFeedback: string | undefined;
      try {
        const data = await apiValidateStep({
          student_answer: studentText,
          correct_answer: step.correct_answer,
          step_id: step.id,
          step_number: step.step_number,
          step_label: step.label,
          step_type: step.type,
          step_instruction: step.instruction,
          problem_context: currentProblem.description,
        });
        isCorrect = data.is_correct;
        apiFeedback = data.feedback?.trim() || undefined;
      } catch {
        isCorrect = compareStudentAnswerFallback(studentText, step.correct_answer, step.label);
        apiFeedback = undefined;
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
          validation_feedback: apiFeedback,
        },
      }));

      const recorded = recordThinkingStep(
        stepId,
        step.skill_used ?? step.label,
        studentText,
        step.label,
        step.correct_answer ?? undefined,
        isCorrect,
      );
      const hintsUsedCount = Math.max(0, Object.keys(hints).length - (hadHintForStep ? 1 : 0));
      updateSkillFromAttempt(classifiedErrors, [...thinkingSteps, recorded], hintsUsedCount, currentLevel);

      if (isCorrect) {
        toast.success(isFirstAttempt ? "Perfect! First try!" : "Correct!");
      }
    },
    [
      currentProblem,
      answers,
      checkingAnswer,
      hints,
      classifiedErrors,
      thinkingSteps,
      currentLevel,
      onMarkInProgress,
      recordThinkingStep,
      updateSkillFromAttempt,
      calculatorEnabled,
      clearStaleHintForStep,
    ],
  );

  const handleReset = useCallback(() => {
    if (currentProblem) delete perProblemCacheRef.current[currentProblem.id];
    setAnswers({});
    setHints({});
    setHintLoading(new Set());
    setStructuredStepComplete({});
    setCheckingAnswer(new Set());
    resetTracking();
    toast.info("Problem reset. Try again!");
  }, [currentProblem, resetTracking, setHints, setHintLoading]);

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

      const step = currentProblem?.steps.find((s) => s.id === stepId);
      if (step) {
        const expected =
          step.type === "drag_drop"
            ? canonicalDragDropFromParts(step.equation_parts)
            : (step.correct_answer ?? "").trim();
        const rawAnswer = answers[stepId]?.answer ?? "";
        recordThinkingStep(
          stepId,
          step.skill_used ?? step.label,
          formatStructuredAnswerForThinkingTracker(step, rawAnswer),
          step.label,
          expected || undefined,
          isCorrect,
        );
      }

      if (isCorrect) {
        setStructuredStepComplete((prev) => ({ ...prev, [stepId]: true }));
        toast.success("Correct!");
      }
    },
    [answers, currentProblem, recordThinkingStep],
  );

  const handleValidateEquation = useCallback(
    async (orderedParts: string[], step: SolutionStep): Promise<boolean> => {
      if (step.type !== "drag_drop") return false;

      const canonicalAnswer = canonicalDragDropFromParts(step.equation_parts);
      if (!canonicalAnswer) return false;

      const studentAnswer = buildMathExpression(orderedParts);

      try {
        const result = await apiValidateStep({
          student_answer: studentAnswer,
          correct_answer: canonicalAnswer,
          step_id: step.id,
          step_number: step.step_number,
          step_label: step.label,
          step_type: "drag_drop",
          step_instruction: step.instruction,
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
    setCheckingAnswer,
    structuredStepComplete,
    setStructuredStepComplete,
    interactiveSteps,
    handleAnswerChange,
    handleCheckAnswer,
    handleRequestHint,
    handleReset,
    handleStructuredStepComplete,
    handleValidateEquation,
    clearStaleHintForStep,
    validateMultiInputStep,
  };
}
