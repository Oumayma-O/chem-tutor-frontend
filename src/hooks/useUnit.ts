import { useState, useEffect } from "react";
import { apiGetUnit, type UnitOut } from "@/lib/api";

interface UseUnitResult {
  unit: UnitOut | null;
  /** Lessons sorted by lesson_index, titles only */
  lessonTitles: string[];
  loading: boolean;
  error: string | null;
}

// Module-level FIFO cache — keyed by unitId.
// Capped at MAX_SIZE entries: when full, the oldest inserted key is evicted first.
const MAX_SIZE = 10;
const cache = new Map<string, UnitOut>();        // insertion-ordered → FIFO
const inFlight = new Map<string, Promise<UnitOut>>();

function getCached(id: string): UnitOut | undefined {
  return cache.get(id);
}

function setCached(id: string, unit: UnitOut): void {
  if (cache.has(id)) {
    // Refresh: remove then re-insert so it becomes the newest entry.
    cache.delete(id);
  } else if (cache.size >= MAX_SIZE) {
    // Evict the oldest entry (first key in insertion order).
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(id, unit);
}

export function useUnit(unitId: string | undefined): UseUnitResult {
  const cached = unitId ? getCached(unitId) : undefined;

  const [unit, setUnit] = useState<UnitOut | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached && !!unitId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) {
      setLoading(false);
      return;
    }
    // Already resolved — nothing to do.
    if (cache.has(unitId)) return;

    // Attach to an in-flight request if one already started.
    let promise = inFlight.get(unitId);
    if (!promise) {
      promise = apiGetUnit(unitId);
      inFlight.set(unitId, promise);
    }

    setLoading(true);
    setError(null);

    promise
      .then((result) => {
        setCached(unitId, result);
        setUnit(result);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Unit not found"),
      )
      .finally(() => {
        inFlight.delete(unitId);
        setLoading(false);
      });
  }, [unitId]);

  const lessonTitles = unit
    ? [...unit.lessons]
        .sort((a, b) => a.lesson_index - b.lesson_index)
        .map((l) => l.title)
    : [];

  return { unit, lessonTitles, loading, error };
}
