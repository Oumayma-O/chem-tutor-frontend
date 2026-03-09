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
  const pd = data.problem; // nested problem object
  const steps: SolutionStep[] = pd.steps.map((s) => {
    // Backend serialises as snake_case (FastAPI default) but Pydantic aliases
    // may produce camelCase depending on the version/config. Handle both.
    const r = s as unknown as Record<string, unknown>;

    const id = (r["id"] as string | undefined);
    const stepNumber = (r["step_number"] ?? r["stepNumber"]) as number;
    const type = r["type"] as string;
    const label = r["label"] as string;
    const instruction = r["instruction"] as string;
    const content = (r["content"] as string | null | undefined) ?? undefined;
    const placeholder = (r["placeholder"] as string | null | undefined) ?? undefined;
    const equationParts = (r["equation_parts"] ?? r["equationParts"]) as string[] | null | undefined;
    const labeledValues = (r["labeled_values"] ?? r["labeledValues"]) as { variable: string; value: string; unit: string }[] | null | undefined;
    const comparisonParts = (r["comparison_parts"] ?? r["comparisonParts"]) as string[] | null | undefined;
    const correctAnswer = (r["correct_answer"] ?? r["correctAnswer"]) as string | null | undefined;
    const hint = (r["hint"] as string | null | undefined) ?? undefined;
    const explanation = (r["explanation"] as string | null | undefined) ?? undefined;

    return {
      id: id || `${pd.id}-step-${stepNumber}`,
      stepNumber,
      type: type as SolutionStep["type"],
      label,
      instruction,
      content,
      placeholder,
      explanation: explanation || undefined,
      equationParts: equationParts ?? undefined,
      // correctEquation is the correct answer for drag_drop steps
      correctEquation: type === "drag_drop" ? (correctAnswer ?? undefined) : undefined,
      labeledValues: labeledValues ?? undefined,
      comparisonParts: comparisonParts ?? undefined,
      correctAnswer: correctAnswer ?? undefined,
      hint,
    };
  });

  const problem: Problem = {
    id: pd.id,
    title: pd.title,
    description: pd.statement,
    topic: pd.topic,
    difficulty: pd.difficulty as Problem["difficulty"],
    steps,
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
          topic_name: lessonName,
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
