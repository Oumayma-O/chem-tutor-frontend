import { type UnitListItem } from "@/lib/api";
import { type CourseLevel } from "@/data/units";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUnitDisplay } from "./unitDisplay";

interface UnitRowProps {
  unit: UnitListItem;
  courseLevel: CourseLevel;
  progress?: number;
  onClick: () => void;
}

export function UnitRow({ unit, courseLevel, progress = 0, onClick }: UnitRowProps) {
  const available = unit.is_active && !unit.is_coming_soon;
  const { lessonCount, skillCount, lessonTitles, badgeLabel } = getUnitDisplay(unit, courseLevel);
  const displayTitles = lessonTitles.slice(0, 4);
  const moreCount = lessonTitles.length - displayTitles.length;
  const isApMastery = unit.is_ap_mastery ?? false;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border-2 transition-all group overflow-hidden",
        available
          ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
          : "cursor-not-allowed opacity-60",
        isApMastery
          ? "border-amber-400/60 bg-amber-50/30 dark:border-amber-500/50 dark:bg-amber-950/20"
          : "border-border bg-card hover:border-primary/40",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5">
        {/* Anchor (Left): Icon + Unit Number */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0",
              isApMastery ? "bg-amber-200/60 dark:bg-amber-900/40" : "bg-primary/10",
              available && "group-hover:bg-primary/15",
            )}
          >
            {unit.icon}
          </div>
          <div>
            <span className="text-sm font-semibold text-muted-foreground">
              Unit {unit.sort_order}
            </span>
          </div>
        </div>

        {/* Content (Middle): Title + Lesson pills */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-2">{unit.title}</h3>
          <div className="flex flex-wrap gap-1.5">
            {displayTitles.map((lesson) => (
              <Badge
                key={lesson}
                variant="secondary"
                className="text-[10px] font-normal bg-secondary/50"
              >
                {lesson}
              </Badge>
            ))}
            {moreCount > 0 && (
              <Badge variant="secondary" className="text-[10px] font-normal bg-secondary/50">
                +{moreCount} more
              </Badge>
            )}
          </div>
        </div>

        {/* Stats (Right-Center) + Badge (Right) */}
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {lessonCount} Lessons · {skillCount} Skills
          </span>
          <div className="flex items-center gap-2">
            {unit.ap_prerequisite && isApMastery && (
              <span className="text-[10px] text-amber-700 dark:text-amber-400">
                {unit.ap_prerequisite}
              </span>
            )}
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-medium",
                isApMastery
                  ? "border-amber-400 text-amber-800 dark:border-amber-500 dark:text-amber-300"
                  : "border-border",
              )}
            >
              {badgeLabel}
            </Badge>
            {!available && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Lock className="w-2.5 h-2.5" />
                Coming Soon
              </Badge>
            )}
            {available && (
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            )}
          </div>
        </div>
      </div>

      {/* Progress (Bottom): Full-width bar */}
      {available && (
        <div className="px-4 sm:px-5 pb-4">
          <Progress value={progress} className="h-1.5" />
          <span className="text-[10px] text-muted-foreground mt-1 block">
            {Math.round(progress)}% complete
          </span>
        </div>
      )}
    </button>
  );
}
