import { useQuery } from "@tanstack/react-query";
import { apiGetUnits, unitsQueryKey, type UnitListItem } from "@/lib/api/units";
import { staticQueryOptions } from "@/lib/api/queryOptions";

interface UseUnitsResult {
  units: UnitListItem[];
  loading: boolean;
  error: string | null;
}

export function useUnits(): UseUnitsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: unitsQueryKey(),
    queryFn: apiGetUnits,
    ...staticQueryOptions,
  });

  return {
    units: data ?? [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to load units") : null,
  };
}
