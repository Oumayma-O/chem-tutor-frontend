import { useState, useEffect } from "react";
import { apiGetUnits, type UnitListItem } from "@/lib/api";

interface UseChaptersResult {
  chapters: UnitListItem[];
  loading: boolean;
  error: string | null;
}

export function useChapters(): UseChaptersResult {
  const [chapters, setChapters] = useState<UnitListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGetUnits()
      .then(setChapters)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load units"),
      )
      .finally(() => setLoading(false));
  }, []);

  return { chapters, loading, error };
}
