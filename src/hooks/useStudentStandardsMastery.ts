import { useQuery } from "@tanstack/react-query";
import {
  apiGetStudentStandardsMastery,
  studentStandardsQueryKey,
  type StudentStandardsMasteryResponse,
} from "@/lib/api/analytics";

export function useStudentStandardsMastery(
  studentId: string | null | undefined,
  classId?: string | null,
): {
  data: StudentStandardsMasteryResponse | undefined;
  loading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useQuery({
    queryKey: studentStandardsQueryKey(studentId ?? ""),
    queryFn: () => apiGetStudentStandardsMastery(studentId!, classId),
    enabled: Boolean(studentId),
    staleTime: 60_000,
  });

  return { data, loading: isLoading, error: error as Error | null };
}
