import { useState, useEffect } from "react";
import {
  apiGetCurriculum,
  type CurriculumResponse,
  type PhaseCurriculumGroup,
} from "@/lib/api/units";

interface UseCurriculumResult {
  phases: PhaseCurriculumGroup[];
  loading: boolean;
  error: string | null;
}

export function useCurriculum(courseId?: number): UseCurriculumResult {
  const [data, setData] = useState<CurriculumResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGetCurriculum(courseId)
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load curriculum"),
      )
      .finally(() => setLoading(false));
  }, [courseId]);

  return { phases: data?.phases ?? [], loading, error };
}
