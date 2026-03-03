import { useState, useEffect } from "react";
import { apiGetChapter, type ChapterOut } from "@/lib/api";

interface UseChapterResult {
  chapter: ChapterOut | null;
  /** Topics sorted by topic_index, titles only */
  topicTitles: string[];
  loading: boolean;
  error: string | null;
}

export function useChapter(chapterId: string | undefined): UseChapterResult {
  const [chapter, setChapter] = useState<ChapterOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiGetChapter(chapterId)
      .then(setChapter)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Chapter not found"),
      )
      .finally(() => setLoading(false));
  }, [chapterId]);

  const topicTitles = chapter
    ? [...chapter.topics]
        .sort((a, b) => a.topic_index - b.topic_index)
        .map((t) => t.title)
    : [];

  return { chapter, topicTitles, loading, error };
}
