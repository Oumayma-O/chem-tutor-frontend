import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export interface HistoryFilterBarProps {
  /** Date range value: "1" | "7" | "30" | "all" */
  dateRange: string;
  onDateRangeChange: (v: string) => void;
  /** Optional lesson filter — key is lesson id/label, value is display label */
  lessonOptions?: { value: string; label: string }[];
  lessonFilter?: string;
  onLessonFilterChange?: (v: string) => void;
  /** Show a Clear button when any non-default filter is active */
  onClear?: () => void;
  hasActiveFilter?: boolean;
}

export function HistoryFilterBar({
  dateRange,
  onDateRangeChange,
  lessonOptions,
  lessonFilter,
  onLessonFilterChange,
  onClear,
  hasActiveFilter,
}: HistoryFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
      <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">Filter:</span>

      {/* Date range */}
      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="h-7 w-[130px] text-xs">
          <SelectValue placeholder="Date range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Today</SelectItem>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="all">All time</SelectItem>
        </SelectContent>
      </Select>

      {/* Lesson filter (optional) */}
      {lessonOptions && lessonOptions.length > 1 && onLessonFilterChange && (
        <Select
          value={lessonFilter || "__all__"}
          onValueChange={(v) => onLessonFilterChange(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="h-7 min-w-[160px] max-w-[240px] text-xs">
            <SelectValue placeholder="All lessons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All lessons</SelectItem>
            {lessonOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear */}
      {hasActiveFilter && onClear && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
}
