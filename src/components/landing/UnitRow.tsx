import { type CurriculumUnit } from "@/lib/api/units";
import { Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type UnitViewMode = "default" | "compact";

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

  // ── Compact row ───────────────────────────────────────────
  if (viewMode === "compact") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!available}
        className={cn(
          "w-full text-left rounded-lg border transition-all duration-150 group",
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
        "w-full text-left rounded-xl border transition-all duration-200 group",
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
