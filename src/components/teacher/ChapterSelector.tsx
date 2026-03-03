import { useMemo } from "react";
import { CourseLevel, getCourseLevel } from "@/data/chapters";
import { useChapters } from "@/hooks/useChapters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";

interface ChapterSelectorProps {
  value: string;
  onValueChange: (chapterId: string) => void;
  courseLevel?: CourseLevel;
  label?: string;
  showAllOption?: boolean;
}

export function ChapterSelector({ value, onValueChange, courseLevel, label = "Chapter", showAllOption = false }: ChapterSelectorProps) {
  const { chapters } = useChapters();

  const available = useMemo(
    () => chapters.filter((c) => c.is_active && !c.is_coming_soon),
    [chapters],
  );

  const filtered = useMemo(() => {
    if (!courseLevel) return available;
    const lvl = available.filter((c) => getCourseLevel(c.course_name) === courseLevel);
    return lvl.length > 0 ? lvl : available;
  }, [available, courseLevel]);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5" />
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select chapter" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">All Chapters</SelectItem>}
          {filtered.map((ch) => (
            <SelectItem key={ch.id} value={ch.id}>
              {ch.icon} {ch.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
