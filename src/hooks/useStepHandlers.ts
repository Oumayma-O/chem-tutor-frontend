/**
 * useStepHandlers — owns answer/hint state and step interaction logic:
 * validation, hints, reset, structured steps, and error classification.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Level, Problem, SolutionStep, StudentAnswer } from "@/types/chemistry";
import { ThinkingStep, ClassifiedError } from "@/types/cognitive";
import { apiValidateStep, apiGetHint } from "@/lib/api";
import { buildMathExpression, canonicalDragDropFromParts } from "@/lib/equationDragDrop";
import { formatStructuredAnswerForThinkingTracker } from "@/lib/thinkingTrackerFormat";
import { evaluateExpression, isExpression } from "@/lib/mathEval";
import { toast } from "sonner";
import { PerProblemState } from "@/hooks/useProblemNavigation";
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
  const [hints, setHints] = useState<Record<string, string>>({});
  const [hintLoading, setHintLoading] = useState<Set<string>>(new Set());
  const [checkingAnswer, setCheckingAnswer] = useState<Set<string>>(new Set());
  const [structuredStepComplete, setStructuredStepComplete] = useState<Record<string, boolean>>({});

  const hasClassifiedRef = useRef(false);

  // Derive interactive steps: all steps that require student input (is_given=false).
  const interactiveSteps = useMemo(() => {
    if (!currentProblem) return [];
    return currentProblem.steps.filter((s) => !s.is_given);
  }, [currentProblem]);

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
        validation_feedback: undefined,
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
      let apiFeedback: string | undefined;
      try {
        // Send the step being validated (step_id, step_number, correct_answer) so backend uses this step's key
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
          validation_feedback: isCorrect ? undefined : apiFeedback,
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
      updateSkillFromAttempt(classifiedErrors, [...thinkingSteps, recorded], Object.keys(hints).length, currentLevel);

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
        const stepIndex = currentProblem.steps.findIndex((s) => s.id === stepId);
        const priorStepsSummary =
          stepIndex > 0
            ? currentProblem.steps
                .slice(0, stepIndex)
                .map((s) => `Step ${s.step_number} (${s.label}): ${s.instruction}`)
                .join(" · ")
            : undefined;

        const data = await apiGetHint({
          step_id: stepId,
          step_label: step.label,
          step_instruction: step.instruction,
          step_explanation: step.explanation,
          student_input: answers[stepId]?.answer || "",
          correct_answer:
            step.type === "drag_drop"
              ? canonicalDragDropFromParts(step.equation_parts)
              : step.correct_answer || "",
          attempt_count: answers[stepId]?.attempts || 1,
          interests: interests || [],
          grade_level: gradeLevel,
          problem_context: currentProblem.description,
          validation_feedback: answers[stepId]?.validation_feedback ?? undefined,
          key_rule: step.key_rule?.trim() || undefined,
          step_number: step.step_number,
          total_steps: currentProblem.steps.length,
          step_type: step.type,
          prior_steps_summary: priorStepsSummary,
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
    setCheckingAnswer(new Set());
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
  };
}
