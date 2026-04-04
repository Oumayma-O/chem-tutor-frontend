import { useState, useCallback } from "react";
import type { Problem, SolutionStep, StudentAnswer } from "@/types/chemistry";
import { apiGetHint } from "@/lib/api";
import { canonicalDragDropFromParts } from "@/lib/equationDragDrop";

interface UseStepHintsOptions {
  currentProblem: Problem | null;
  answers: Record<string, StudentAnswer>;
  interests: string[];
  gradeLevel: string | null;
}

/**
 * Hint request state + API — separated from broader step/answer handling for SRP.
 */
export function useStepHints({
  currentProblem,
  answers,
  interests,
  gradeLevel,
}: UseStepHintsOptions) {
  const [hints, setHints] = useState<Record<string, string>>({});
  const [hintLoading, setHintLoading] = useState<Set<string>>(new Set());

  const clearStaleHintForStep = useCallback((stepId: string) => {
    setHints((prev) => {
      if (!(stepId in prev)) return prev;
      const next = { ...prev };
      delete next[stepId];
      return next;
    });
    setHintLoading((prev) => {
      if (!prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.delete(stepId);
      return next;
    });
  }, []);

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
          setHints((prev) => ({
            ...prev,
            [stepId]: step.hint || "Review the formula and try again.",
          }));
        }
      } catch {
        setHints((prev) => ({
          ...prev,
          [stepId]: step.hint || "Review the formula and try again.",
        }));
      } finally {
        setHintLoading((prev) => {
          const next = new Set(prev);
          next.delete(stepId);
          return next;
        });
      }
    },
    [currentProblem, answers, interests, gradeLevel, hints, hintLoading],
  );

  return {
    hints,
    setHints,
    hintLoading,
    setHintLoading,
    clearStaleHintForStep,
    handleRequestHint,
  };
}
