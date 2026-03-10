import { useState, useCallback } from "react";
import { Problem, SolutionStep } from "@/types/chemistry";
import { apiGenerateProblemV2, ProblemDeliveryResponse, ProblemPagination } from "@/lib/api";

interface UseGeneratedProblemOptions {
  unitId: string;
  lessonIndex: number;
  lessonName: string;
  interests: string[];
  gradeLevel: string | null;
  masteryScore: number;
  userId?: string;
}

export interface GenerateResult {
  problem: Problem;
  pagination: ProblemPagination | null;
}

export function parseProblemOutput(data: ProblemDeliveryResponse): GenerateResult {
  const pd = data.problem;
  const steps: SolutionStep[] = pd.steps.map((s) => ({
    id: s.id || `${pd.id}-step-${s.step_number}`,
    step_number: s.step_number,
    type: s.type as SolutionStep["type"],
    label: s.label,
    instruction: s.instruction,
    content: s.content ?? undefined,
    placeholder: s.placeholder ?? undefined,
    explanation: s.explanation ?? undefined,
    equation_parts: s.equation_parts ?? undefined,
    // correct_equation stores the answer for drag_drop steps
    correct_equation: s.type === "drag_drop" ? (s.correct_answer ?? undefined) : undefined,
    labeled_values: s.labeled_values ?? undefined,
    comparison_parts: s.comparison_parts ?? undefined,
    correct_answer: s.correct_answer ?? undefined,
    hint: s.hint ?? undefined,
  }));

  const problem: Problem = {
    id: pd.id,
    title: pd.title,
    description: pd.statement,
    lesson: pd.lesson,
    difficulty: pd.difficulty as Problem["difficulty"],
    steps,
    blueprint: (pd.blueprint as Problem["blueprint"]) ?? undefined,
  };

  // Show pagination nav only when the playlist has meaningful data
  // (always present in response but only useful when total > 1 or limits apply)
  const pagination: ProblemPagination | null =
    data.total > 1 || data.has_prev || data.has_next || data.at_limit
      ? {
          current_index: data.current_index,
          total: data.total,
          max_problems: data.max_problems,
          has_prev: data.has_prev,
          has_next: data.has_next,
          at_limit: data.at_limit,
        }
      : null;

  return { problem, pagination };
}

export function useGeneratedProblem({
  unitId,
  lessonIndex,
  lessonName,
  interests,
  gradeLevel,
  userId,
}: UseGeneratedProblemOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (
      difficulty: "easy" | "medium" | "hard",
      excludeIds: string[],
      level: number = 2,
      isRetry = false,
    ): Promise<GenerateResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiGenerateProblemV2({
          unit_id: unitId,
          lesson_index: lessonIndex,
          lesson_name: lessonName,
          difficulty,
          level,
          interests: interests || [],
          grade_level: gradeLevel,
          user_id: userId,
          exclude_ids: excludeIds.length > 0 ? excludeIds : undefined,
        });

        if (!data?.problem?.id || !data?.problem?.steps?.length) {
          throw new Error("Invalid problem structure returned from API");
        }

        const result = parseProblemOutput(data);

        // When at the playlist cap the backend cycles through existing problems —
        // seeing a previously-excluded id is expected, so skip the duplicate check.
        if (!data.at_limit && excludeIds.includes(data.problem.id)) {
          if (!isRetry) {
            return generate(difficulty, [...excludeIds, data.problem.id], level, true);
          }
          // Retry also returned a duplicate — backend may still be warming up; surface the error.
          throw new Error("Duplicate problem returned. Try again in a moment.");
        }

        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error generating problem";
        setError(msg);
        throw err; // Re-throw so caller can handle (show toast, etc.)
      } finally {
        setIsLoading(false);
      }
    },
    [unitId, lessonIndex, lessonName, interests, gradeLevel, userId],
  );

  return { generate, isLoading, error };
}
