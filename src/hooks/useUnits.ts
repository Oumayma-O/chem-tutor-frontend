import { useState, useEffect } from "react";
import { apiGetUnits, type UnitListItem } from "@/lib/api";

interface UseUnitsResult {
  units: UnitListItem[];
  loading: boolean;
  error: string | null;
}

export function useUnits(): UseUnitsResult {
  const [units, setUnits] = useState<UnitListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGetUnits()
      .then(setUnits)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load units"),
      )
      .finally(() => setLoading(false));
  }, []);

  return { units, loading, error };
}
