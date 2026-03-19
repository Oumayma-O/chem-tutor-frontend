import { useState, useCallback } from "react";
import { Problem, SolutionStep } from "@/types/chemistry";
import { apiGenerateProblemV2, ProblemDeliveryResponse, ProblemPagination } from "@/lib/api";
import {
  getCachedPromise,
  getResolvedResult,
  setPrefetchPromise,
} from "@/lib/problemPrefetchCache";

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
      forceRegenerate = false,
    ): Promise<GenerateResult> => {
      // Only use the module cache for fresh (non-retry, no exclusion, non-force) calls.
      // Retries, "See Another", and forced regenerations must always hit the API.
      const isCacheable = !isRetry && excludeIds.length === 0 && !forceRegenerate;

      if (isCacheable) {
        // ── Fast path: resolved result already in module cache ────────────────
        const cached = getResolvedResult(unitId, lessonIndex, level);
        if (cached) return cached;

        // ── In-flight path: a prefetch (from LessonOverview or triggerPrefetch)
        //    is already running. Attach to the SAME promise — no duplicate request.
        const inFlight = getCachedPromise(unitId, lessonIndex, level);
        if (inFlight) {
          setIsLoading(true);
          try {
            return await inFlight;
          } finally {
            setIsLoading(false);
          }
        }
      }

      setIsLoading(true);
      setError(null);

      // Wrap the full resolution (API call + duplicate check) in a single promise
      // so that cross-route attaches always get a clean, validated result.
      // NOTE: No AbortSignal is passed — the network request stays alive even
      // if the calling component unmounts (user navigates away mid-generation).
      const freshPromise: Promise<GenerateResult> = (async () => {
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
          force_regenerate: forceRegenerate || undefined,
        });

        if (!data?.problem?.id || !data?.problem?.steps?.length) {
          throw new Error("Invalid problem structure returned from API");
        }

        // When at the playlist cap the backend cycles through existing problems —
        // seeing a previously-excluded id is expected, so skip the duplicate check.
        if (!data.at_limit && excludeIds.includes(data.problem.id)) {
          if (!isRetry) {
            // Retry is a fresh call with isRetry=true — it won't enter the cache path.
            return generate(difficulty, [...excludeIds, data.problem.id], level, true);
          }
          throw new Error("Duplicate problem returned. Try again in a moment.");
        }

        return parseProblemOutput(data);
      })();

      // Register in module cache BEFORE awaiting so any concurrent caller
      // (e.g. user clicks "Start Practice" while prefetch is in-flight) attaches
      // to this promise rather than firing a second API request.
      if (isCacheable) {
        setPrefetchPromise(unitId, lessonIndex, level, freshPromise);
      }

      try {
        return await freshPromise;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error generating problem";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [unitId, lessonIndex, lessonName, interests, gradeLevel, userId],
  );

  return { generate, isLoading, error };
}
