import { type CurriculumUnit } from "@/lib/api/units";
import { Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCourseLevel } from "@/data/units";

export type UnitViewMode = "card" | "default" | "compact";

// Stable color theme per unit slot — cycles through a curated palette
const ICON_THEMES = [
  { bg: "bg-blue-100 dark:bg-blue-900/30",    fg: "text-blue-600 dark:text-blue-400",    bar: "bg-blue-500"    },
  { bg: "bg-violet-100 dark:bg-violet-900/30", fg: "text-violet-600 dark:text-violet-400", bar: "bg-violet-500"  },
  { bg: "bg-emerald-100 dark:bg-emerald-900/30", fg: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  { bg: "bg-amber-100 dark:bg-amber-900/30",   fg: "text-amber-600 dark:text-amber-400",   bar: "bg-amber-500"   },
  { bg: "bg-rose-100 dark:bg-rose-900/30",     fg: "text-rose-600 dark:text-rose-400",     bar: "bg-rose-500"    },
  { bg: "bg-cyan-100 dark:bg-cyan-900/30",     fg: "text-cyan-600 dark:text-cyan-400",     bar: "bg-cyan-500"    },
  { bg: "bg-orange-100 dark:bg-orange-900/30", fg: "text-orange-600 dark:text-orange-400", bar: "bg-orange-500"  },
  { bg: "bg-teal-100 dark:bg-teal-900/30",     fg: "text-teal-600 dark:text-teal-400",     bar: "bg-teal-500"    },
] as const;

function getTheme(sortOrder: number) {
  return ICON_THEMES[sortOrder % ICON_THEMES.length];
}

interface UnitRowProps {
  unit: CurriculumUnit;
  progress?: number;
  onClick: () => void;
  viewMode?: UnitViewMode;
}

export function UnitRow({ unit, progress = 0, onClick, viewMode = "default" }: UnitRowProps) {
  const available = unit.is_active && !unit.is_coming_soon;
  const theme = getTheme(unit.sort_order);

  // ── Card (boxed grid cell for "All" filter) ─────────────────
  if (viewMode === "card") {
    const displayTitles = unit.lesson_titles.slice(0, 3);
    const moreCount = unit.lesson_titles.length - displayTitles.length;
    const courseLevel = getCourseLevel(unit.course_name);
    const isAP = courseLevel === "ap";

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!available}
        className={cn(
          "w-full h-full text-left rounded-xl border bg-card transition-all duration-300 ease-out",
          "focus:outline-none focus:ring-2 focus:ring-primary/30",
          available
            ? "cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
            : "cursor-not-allowed opacity-60",
        )}
      >
        <div className="flex flex-col p-4 h-full gap-3">
          {/* Top row: icon + badges */}
          <div className="flex items-start justify-between gap-2">
            <div
              className={cn(
                "rounded-xl flex items-center justify-center text-xl shrink-0",
                available ? theme.bg : "bg-muted/40",
              )}
              style={{ width: 44, height: 44 }}
            >
              {unit.icon ?? "📚"}
            </div>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {available ? (
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    isAP
                      ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700"
                      : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
                  )}
                >
                  {isAP ? "AP" : "Standard"}
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border">
                  Coming Soon
                </span>
              )}
            </div>
          </div>

          {/* Title + description + tags */}
          <div className="flex-1 min-h-0">
            <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
              {unit.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {unit.description}
            </p>
            {available && displayTitles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {displayTitles.map((lesson) => (
                  <span
                    key={lesson}
                    className="inline-flex text-[10px] px-1.5 py-0.5 rounded-md bg-secondary/60 text-muted-foreground"
                  >
                    {lesson}
                  </span>
                ))}
                {moreCount > 0 && (
                  <span className="inline-flex text-[10px] px-1.5 py-0.5 rounded-md bg-secondary/40 text-muted-foreground/80">
                    +{moreCount}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stats + progress bar */}
          {available && (
            <div className="mt-auto pt-2 border-t border-border/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground">
                  {unit.lesson_count} Lessons · {unit.skill_count} Skills
                </span>
                <span className="text-[11px] font-medium tabular-nums text-foreground/70">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    progress > 0 ? theme.bar : "bg-transparent",
                  )}
                  style={{ width: `${Math.max(Math.min(progress, 100), 0)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </button>
    );
  }

  // ── Compact row ───────────────────────────────────────────
  if (viewMode === "compact") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!available}
        className={cn(
          "w-full text-left rounded-lg border transition-all duration-300 ease-out group",
          available
            ? "cursor-pointer bg-card hover:shadow-sm hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
            : "cursor-not-allowed opacity-50 bg-muted/30",
        )}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div
            className={cn(
              "rounded-lg flex items-center justify-center text-lg shrink-0 transition-colors",
              available ? theme.bg : "bg-muted/40",
            )}
            style={{ width: 36, height: 36 }}
          >
            {unit.icon ?? "📚"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-foreground truncate">
                {unit.title}
              </span>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {unit.lesson_count} lessons
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate leading-tight">
              {unit.description}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {available ? (
              <>
                <span className="text-[10px] font-medium tabular-nums text-foreground/60 min-w-[24px] text-right">
                  {Math.round(progress)}%
                </span>
                <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden border border-border/50">
                  <div
                    className={cn("h-full rounded-full transition-all", progress > 0 ? theme.bar : "bg-transparent")}
                    style={{ width: `${Math.max(Math.min(progress, 100), 0)}%` }}
                  />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border">
                <Lock className="w-2.5 h-2.5" />
                Soon
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }

  // ── Default (full) row ─────────────────────────────────────

  // Show max 4 lesson tags + "+N more" badge
  const displayTitles = unit.lesson_titles.slice(0, 4);
  const moreCount = unit.lesson_titles.length - displayTitles.length;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!available}
      className={cn(
        "w-full text-left rounded-xl border transition-all duration-300 ease-out group",
        available
          ? "cursor-pointer bg-card hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/30"
          : "cursor-not-allowed opacity-50 bg-muted/30",
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">

        {/* Icon */}
        <div className="shrink-0 self-start sm:self-center">
          <div
            className={cn(
              "w-13 h-13 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-colors",
              available ? theme.bg : "bg-muted/40",
            )}
            style={{ width: 52, height: 52 }}
          >
            {unit.icon ?? "📚"}
          </div>
        </div>

        {/* Title + Description + Tags */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-[15px] leading-tight">
            {unit.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {unit.description}
          </p>
          {available && displayTitles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {displayTitles.map((lesson) => (
                <span
                  key={lesson}
                  className="inline-flex items-center text-[10px] font-normal px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground"
                >
                  {lesson}
                </span>
              ))}
              {moreCount > 0 && (
                <span className="inline-flex items-center text-[10px] font-normal px-2 py-0.5 rounded-full bg-secondary/40 border border-transparent text-muted-foreground/70">
                  +{moreCount} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Stats Zone */}
        <div className="shrink-0 flex items-center gap-4 sm:gap-5">
          {available && (
            <div className="flex flex-col items-end gap-1.5 min-w-[140px]">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {unit.lesson_count} Lessons · {unit.skill_count} Skills
              </span>
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden border border-border/50">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      progress > 0 ? theme.bar : "bg-transparent",
                    )}
                    style={{ width: `${Math.max(Math.min(progress, 100), 0)}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium tabular-nums shrink-0 min-w-[28px] text-right text-foreground/70">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          )}

          {!available && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border">
              <Lock className="w-2.5 h-2.5" />
              Coming Soon
            </span>
          )}

          {available && (
            <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          )}
        </div>
      </div>
    </button>
  );
}
