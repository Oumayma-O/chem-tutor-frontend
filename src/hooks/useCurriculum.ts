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

// Module-level cache — survives route changes so navigating back to the Units
// page is instant (no spinner, no re-fetch) for the lifetime of the session.
const cache = new Map<string, CurriculumResponse>();
const inFlight = new Map<string, Promise<CurriculumResponse>>();

export function useCurriculum(courseId?: number): UseCurriculumResult {
  const cacheKey = String(courseId ?? "default");
  const cached = cache.get(cacheKey);

  const [data, setData] = useState<CurriculumResponse | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Already resolved — nothing to do.
    if (cache.has(cacheKey)) return;

    // Attach to an in-flight request if one already started.
    let promise = inFlight.get(cacheKey);
    if (!promise) {
      promise = apiGetCurriculum(courseId);
      inFlight.set(cacheKey, promise);
    }

    setLoading(true);
    setError(null);

    promise
      .then((result) => {
        cache.set(cacheKey, result);
        setData(result);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load curriculum"),
      )
      .finally(() => {
        inFlight.delete(cacheKey);
        setLoading(false);
      });
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { phases: data?.phases ?? [], loading, error };
}
