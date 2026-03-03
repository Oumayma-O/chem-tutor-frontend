import { useState, useCallback, useEffect } from "react";
import { apiGetTopicProgress, apiSetTopicStatus } from "@/lib/api";

const STORAGE_PREFIX = "chemtutor_completion_";

type TopicStatus = "not-started" | "in-progress" | "completed";

/**
 * Tracks per-topic completion for a chapter.
 * Syncs with backend when userId is provided, falls back to localStorage for guests.
 */
export function useTopicCompletion(chapterId: string, userId?: string) {
  // Include userId in the key so different users never share localStorage data
  const storageKey = `${STORAGE_PREFIX}${userId ?? "guest"}_${chapterId}`;
  const [statusMap, setStatusMap] = useState<Record<number, TopicStatus>>({});

  // Load from localStorage as initial fallback
  const loadFromStorage = useCallback((): Record<number, TopicStatus> => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const result: Record<number, TopicStatus> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (value === true) result[Number(key)] = "completed";
        else if (value === "completed" || value === "in-progress" || value === "not-started")
          result[Number(key)] = value as TopicStatus;
      }
      return result;
    } catch {
      return {};
    }
  }, [storageKey]);

  const persistLocal = useCallback(
    (next: Record<number, TopicStatus>) => {
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
    },
    [storageKey],
  );

  const refetch = useCallback(() => {
    if (!chapterId) return;
    if (userId) {
      apiGetTopicProgress(userId, chapterId)
        .then((records) => {
          if (records.length === 0) {
            setStatusMap(loadFromStorage());
            return;
          }
          const dbMap: Record<number, TopicStatus> = {};
          for (const r of records) {
            dbMap[r.topic_index] = r.status;
          }
          setStatusMap(dbMap);
          persistLocal(dbMap);
        })
        .catch(() => setStatusMap(loadFromStorage()));
    } else {
      setStatusMap(loadFromStorage());
    }
  }, [chapterId, userId, loadFromStorage, persistLocal]);

  // Load from backend on mount / when userId or chapterId changes
  useEffect(() => {
    if (!chapterId) return;
    refetch();
  }, [chapterId, userId, refetch]);

  // When any consumer marks a topic completed, refetch so sidebar/progress bar stay in sync
  useEffect(() => {
    const handler = (e: CustomEvent<{ chapterId: string }>) => {
      if (e.detail?.chapterId === chapterId) refetch();
    };
    window.addEventListener("topicProgressInvalidate", handler as EventListener);
    return () => window.removeEventListener("topicProgressInvalidate", handler as EventListener);
  }, [chapterId, refetch]);

  const getStatus = useCallback(
    (topicIdx: number): TopicStatus => statusMap[topicIdx] || "not-started",
    [statusMap],
  );

  const isCompleted = useCallback(
    (topicIdx: number) => getStatus(topicIdx) === "completed",
    [getStatus],
  );

  const markCompleted = useCallback(
    (topicIdx: number) => {
      setStatusMap((prev) => {
        const next = { ...prev, [topicIdx]: "completed" as TopicStatus };
        persistLocal(next);
        return next;
      });
      if (userId) {
        apiSetTopicStatus(userId, chapterId, topicIdx, "completed").catch(() => {});
      }
      window.dispatchEvent(new CustomEvent("topicProgressInvalidate", { detail: { chapterId } }));
    },
    [userId, chapterId, persistLocal],
  );

  const markInProgress = useCallback(
    (topicIdx: number) => {
      setStatusMap((prev) => {
        if (prev[topicIdx] === "completed") return prev;
        const next = { ...prev, [topicIdx]: "in-progress" as TopicStatus };
        persistLocal(next);
        if (userId) {
          apiSetTopicStatus(userId, chapterId, topicIdx, "in-progress").catch(() => {});
        }
        return next;
      });
      window.dispatchEvent(new CustomEvent("topicProgressInvalidate", { detail: { chapterId } }));
    },
    [userId, chapterId, persistLocal],
  );

  return { isCompleted, markCompleted, markInProgress, getStatus, completionMap: statusMap, refetch };
}
