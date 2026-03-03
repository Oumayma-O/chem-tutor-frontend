import { useState, useEffect } from "react";
import { apiGetChapters, type ChapterListItem } from "@/lib/api";

interface UseChaptersResult {
  chapters: ChapterListItem[];
  loading: boolean;
  error: string | null;
}

export function useChapters(): UseChaptersResult {
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGetChapters()
      .then(setChapters)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load chapters"),
      )
      .finally(() => setLoading(false));
  }, []);

  return { chapters, loading, error };
}
