import { type UnitListItem } from "@/lib/api";
import { type CourseLevel } from "@/data/units";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUnitDisplay } from "./unitDisplay";

interface UnitCardProps {
  unit: UnitListItem;
  courseLevel: CourseLevel;
  onClick: () => void;
}

export function UnitCard({ unit, courseLevel, onClick }: UnitCardProps) {
  const available = unit.is_active && !unit.is_coming_soon;
  const { lessonCount, skillCount, lessonTitles, badgeLabel } = getUnitDisplay(unit, courseLevel);
  const displayTitles = lessonTitles.slice(0, 3);
  const moreCount = lessonTitles.length - displayTitles.length;
  const isApMastery = unit.is_ap_mastery ?? false;

  return (
    <Card
      className={cn(
        "transition-all group relative overflow-hidden border-2",
        available
          ? "cursor-pointer hover:shadow-card-elevated hover:border-primary/40 hover:-translate-y-1"
          : "opacity-40 cursor-not-allowed border-border",
        isApMastery && "border-amber-400/60 bg-amber-50/30 dark:border-amber-950/20",
      )}
      onClick={onClick}
    >
      {available && (
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-primary/80 to-accent/60" />
      )}
      <CardHeader className="pb-3 pt-6">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0",
              isApMastery ? "bg-amber-200/60 dark:bg-amber-900/40" : "bg-primary/10",
              available && "group-hover:bg-primary/15 transition-colors",
            )}
          >
            {unit.icon}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-medium",
                isApMastery && "border-amber-400 text-amber-800 dark:border-amber-500 dark:text-amber-300",
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
          </div>
        </div>
        <CardTitle className="text-base mt-3">{unit.title}</CardTitle>
        <CardDescription className="text-xs leading-relaxed line-clamp-2">
          {unit.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 pb-5">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {displayTitles.map((lesson) => (
            <Badge key={lesson} variant="outline" className="text-[10px] bg-secondary/40">
              {lesson}
            </Badge>
          ))}
          {moreCount > 0 && (
            <Badge variant="outline" className="text-[10px] bg-secondary/40">
              +{moreCount} more
            </Badge>
          )}
        </div>
        {available && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground">
              {lessonCount} lessons · {skillCount} skills
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
