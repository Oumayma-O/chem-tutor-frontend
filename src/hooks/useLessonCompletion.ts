import { useState, useCallback, useEffect } from "react";
import { apiGetTopicProgress, apiSetTopicStatus } from "@/lib/api";

const STORAGE_PREFIX = "chemtutor_completion_";

type LessonStatus = "not-started" | "in-progress" | "completed";

/**
 * Tracks per-lesson completion for a unit.
 * Syncs with backend when userId is provided, falls back to localStorage for guests.
 */
export function useLessonCompletion(unitId: string, userId?: string) {
  const storageKey = `${STORAGE_PREFIX}${userId ?? "guest"}_${unitId}`;
  const [statusMap, setStatusMap] = useState<Record<number, LessonStatus>>({});

  const loadFromStorage = useCallback((): Record<number, LessonStatus> => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const result: Record<number, LessonStatus> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (value === true) result[Number(key)] = "completed";
        else if (value === "completed" || value === "in-progress" || value === "not-started")
          result[Number(key)] = value as LessonStatus;
      }
      return result;
    } catch {
      return {};
    }
  }, [storageKey]);

  const persistLocal = useCallback(
    (next: Record<number, LessonStatus>) => {
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
    },
    [storageKey],
  );

  const refetch = useCallback(() => {
    if (!unitId) return;
    if (userId) {
      apiGetTopicProgress(userId, unitId)
        .then((records) => {
          if (records.length === 0) {
            setStatusMap(loadFromStorage());
            return;
          }
          const dbMap: Record<number, LessonStatus> = {};
          for (const r of records) {
            dbMap[r.lesson_index] = r.status;
          }
          setStatusMap(dbMap);
          persistLocal(dbMap);
        })
        .catch(() => setStatusMap(loadFromStorage()));
    } else {
      setStatusMap(loadFromStorage());
    }
  }, [unitId, userId, loadFromStorage, persistLocal]);

  useEffect(() => {
    if (!unitId) return;
    refetch();
  }, [unitId, userId, refetch]);

  useEffect(() => {
    const handler = (e: CustomEvent<{ unitId: string }>) => {
      if (e.detail?.unitId === unitId) refetch();
    };
    window.addEventListener("lessonProgressInvalidate", handler as EventListener);
    return () => window.removeEventListener("lessonProgressInvalidate", handler as EventListener);
  }, [unitId, refetch]);

  const getStatus = useCallback(
    (lessonIdx: number): LessonStatus => statusMap[lessonIdx] || "not-started",
    [statusMap],
  );

  const isCompleted = useCallback(
    (lessonIdx: number) => getStatus(lessonIdx) === "completed",
    [getStatus],
  );

  const markCompleted = useCallback(
    (lessonIdx: number) => {
      setStatusMap((prev) => {
        const next = { ...prev, [lessonIdx]: "completed" as LessonStatus };
        persistLocal(next);
        return next;
      });
      if (userId) {
        apiSetTopicStatus(userId, unitId, lessonIdx, "completed").catch(() => {});
      }
      window.dispatchEvent(new CustomEvent("lessonProgressInvalidate", { detail: { unitId } }));
    },
    [userId, unitId, persistLocal],
  );

  const markInProgress = useCallback(
    (lessonIdx: number) => {
      setStatusMap((prev) => {
        if (prev[lessonIdx] === "completed") return prev;
        const next = { ...prev, [lessonIdx]: "in-progress" as LessonStatus };
        persistLocal(next);
        if (userId) {
          apiSetTopicStatus(userId, unitId, lessonIdx, "in-progress").catch(() => {});
        }
        return next;
      });
      window.dispatchEvent(new CustomEvent("lessonProgressInvalidate", { detail: { unitId } }));
    },
    [userId, unitId, persistLocal],
  );

  return { isCompleted, markCompleted, markInProgress, getStatus, completionMap: statusMap, refetch };
}
