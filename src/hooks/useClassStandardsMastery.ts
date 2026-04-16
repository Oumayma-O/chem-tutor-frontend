import { useQuery } from "@tanstack/react-query";
import {
  apiGetClassStandardsMastery,
  classStandardsQueryKey,
  type ClassStandardsMasteryResponse,
} from "@/lib/api/analytics";

export function useClassStandardsMastery(
  classId: string | null | undefined,
): {
  data: ClassStandardsMasteryResponse | undefined;
  loading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: classStandardsQueryKey(classId ?? ""),
    queryFn: () => apiGetClassStandardsMastery(classId!),
    enabled: Boolean(classId),
    staleTime: 60_000,
  });

  return { data, loading: isLoading, error: error as Error | null };
}
