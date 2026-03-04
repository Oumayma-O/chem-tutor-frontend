import { useState, useEffect } from "react";
import { apiGetUnit, type UnitOut } from "@/lib/api";

interface UseChapterResult {
  chapter: UnitOut | null;
  /** Lessons sorted by lesson_index, titles only */
  topicTitles: string[];
  loading: boolean;
  error: string | null;
}

export function useChapter(chapterId: string | undefined): UseChapterResult {
  const [chapter, setChapter] = useState<UnitOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiGetUnit(chapterId)
      .then(setChapter)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Unit not found"),
      )
      .finally(() => setLoading(false));
  }, [chapterId]);

  const topicTitles = chapter
    ? [...chapter.lessons]
        .sort((a, b) => a.lesson_index - b.lesson_index)
        .map((l) => l.title)
    : [];

  return { chapter, topicTitles, loading, error };
}
