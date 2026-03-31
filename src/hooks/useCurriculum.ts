import { useQuery } from "@tanstack/react-query";
import { apiGetCurriculum, curriculumQueryKey, type PhaseCurriculumGroup } from "@/lib/api/units";
import { staticQueryOptions } from "@/lib/api/queryOptions";

interface UseCurriculumResult {
  phases: PhaseCurriculumGroup[];
  loading: boolean;
  error: string | null;
}

export function useCurriculum(courseId?: number): UseCurriculumResult {
  const { data, isLoading, error } = useQuery({
    queryKey: curriculumQueryKey(courseId),
    queryFn: () => apiGetCurriculum(courseId),
    ...staticQueryOptions,
  });

  return {
    phases: data?.phases ?? [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to load curriculum") : null,
  };
}
