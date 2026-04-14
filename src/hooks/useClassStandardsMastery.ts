import { useQuery } from "@tanstack/react-query";
import {
  apiGetClassStandardsMastery,
  classStandardsQueryKey,
  type ClassStandardsMasteryResponse,
} from "@/lib/api/analytics";

export function useClassStandardsMastery(
  classId: string | null | undefined,
  unitId?: string | null,
): {
  data: ClassStandardsMasteryResponse | undefined;
  loading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: classStandardsQueryKey(classId ?? "", unitId),
    queryFn: () => apiGetClassStandardsMastery(classId!, unitId),
    enabled: Boolean(classId),
    staleTime: 60_000,
  });

  return { data, loading: isLoading, error: error as Error | null };
}
