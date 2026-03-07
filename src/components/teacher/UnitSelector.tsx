import { useMemo } from "react";
import { CourseLevel, getCourseLevel } from "@/data/units";
import { useUnits } from "@/hooks/useUnits";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen } from "lucide-react";

interface UnitSelectorProps {
  value: string;
  onValueChange: (unitId: string) => void;
  courseLevel?: CourseLevel;
  label?: string;
  showAllOption?: boolean;
}

export function UnitSelector({ value, onValueChange, courseLevel, label = "Unit", showAllOption = false }: UnitSelectorProps) {
  const { units } = useUnits();

  const available = useMemo(
    () => units.filter((u) => u.is_active && !u.is_coming_soon),
    [units],
  );

  const filtered = useMemo(() => {
    if (!courseLevel) return available;
    const lvl = available.filter((u) => getCourseLevel(u.course_name) === courseLevel);
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
          <SelectValue placeholder="Select unit" />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && <SelectItem value="all">All Units</SelectItem>}
          {filtered.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.icon} {u.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
