import { get } from "./core";

export interface TopicOut {
  id: number;
  chapter_id: string;
  title: string;
  description: string;
  topic_index: number;
  key_equations: string[];
  standards: { code: string; framework: string; description: string }[];
  is_active: boolean;
}

export interface ChapterListItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient?: string | null;
  grade_id?: number | null;
  course_id?: number | null;
  course_name?: string | null;
  sort_order: number;
  is_active: boolean;
  is_coming_soon: boolean;
  topic_count: number;
  topic_titles: string[];
}

export interface ChapterOut {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient?: string | null;
  grade_id?: number | null;
  course_id?: number | null;
  course_name?: string | null;
  sort_order: number;
  is_active: boolean;
  is_coming_soon: boolean;
  topics: TopicOut[];
}

export async function apiGetChapters(): Promise<ChapterListItem[]> {
  return get<ChapterListItem[]>("/chapters");
}

export async function apiGetChapter(id: string): Promise<ChapterOut> {
  return get<ChapterOut>(`/chapters/${id}`);
}
