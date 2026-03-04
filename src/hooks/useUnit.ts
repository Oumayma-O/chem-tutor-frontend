import { useState, useEffect } from "react";
import { apiGetUnit, type UnitOut } from "@/lib/api";

interface UseUnitResult {
  unit: UnitOut | null;
  /** Lessons sorted by lesson_index, titles only */
  lessonTitles: string[];
  loading: boolean;
  error: string | null;
}

export function useUnit(unitId: string | undefined): UseUnitResult {
  const [unit, setUnit] = useState<UnitOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiGetUnit(unitId)
      .then(setUnit)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Unit not found"),
      )
      .finally(() => setLoading(false));
  }, [unitId]);

  const lessonTitles = unit
    ? [...unit.lessons]
        .sort((a, b) => a.lesson_index - b.lesson_index)
        .map((l) => l.title)
    : [];

  return { unit, lessonTitles, loading, error };
}
