import { useQuery } from "@tanstack/react-query";
import { apiGetUnit, unitQueryKey, type UnitOut } from "@/lib/api/units";
import { staticQueryOptions } from "@/lib/api/queryOptions";

interface UseUnitResult {
  unit: UnitOut | null;
  /** Lessons sorted by lesson_index, titles only */
  lessonTitles: string[];
  loading: boolean;
  error: string | null;
}

export function useUnit(unitId: string | undefined): UseUnitResult {
  const { data, isLoading, error } = useQuery({
    queryKey: unitQueryKey(unitId ?? ""),
    queryFn: () => apiGetUnit(unitId!),
    enabled: !!unitId,
    ...staticQueryOptions,
  });

  const lessonTitles = data
    ? [...data.lessons]
        .sort((a, b) => a.lesson_index - b.lesson_index)
        .map((l) => l.title)
    : [];

  return {
    unit: data ?? null,
    lessonTitles,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Unit not found") : null,
  };
}
