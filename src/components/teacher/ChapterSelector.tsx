import { useMemo } from "react";
import { useUnits } from "@/hooks/useUnits";
import { CourseLevel } from "@/data/units";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";

interface ChapterSelectorProps {
  value: string;
  onValueChange: (unitId: string) => void;
  courseLevel?: CourseLevel;
  label?: string;
  showAllOption?: boolean;
}

export function ChapterSelector({ value, onValueChange, courseLevel, label = "Chapter", showAllOption = false }: ChapterSelectorProps) {
  const { units } = useUnits();

  const filtered = useMemo(() => {
    const active = units.filter((u) => u.is_active && !u.is_coming_soon);
    if (!courseLevel) return active;
    return active.filter((u) => {
      const name = (u.course_name ?? "").toLowerCase();
      if (courseLevel === "ap") return name.includes("ap") || name.includes("advanced");
      return !name.includes("ap") && !name.includes("advanced");
    });
  }, [units, courseLevel]);

  const options = filtered.length > 0 ? filtered : units.filter((u) => u.is_active);

  if (!label) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-8 text-xs w-[160px]">
          <SelectValue placeholder="Select chapter" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">All Chapters</SelectItem>}
          {options.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.icon} {u.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

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
          {options.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.icon} {u.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
