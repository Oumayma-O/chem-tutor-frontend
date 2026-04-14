import { useMemo } from "react";
import { Loader2, CheckCircle2, Circle, FlaskConical } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useStudentStandardsMastery } from "@/hooks/useStudentStandardsMastery";
import type { StudentStandardMasteryItem } from "@/lib/api/analytics";

interface StudentSkillTreeProps {
  studentId: string | null | undefined;
  classId?: string | null;
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function masteryBarColor(score: number): string {
  if (score >= 0.75) return "bg-emerald-500";
  if (score >= 0.55) return "bg-amber-400";
  return "bg-red-400";
}

function masteryBadgeClass(score: number): string {
  if (score >= 0.75) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (score >= 0.55) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-red-50 text-red-600 ring-red-200";
}

function masteryVerb(score: number): string {
  if (score >= 0.75) return "I can";
  if (score >= 0.55) return "Learning to";
  return "Still working on";
}

function frameworkLabel(fw: string): string {
  if (fw === "NGSS") return "NGSS — Disciplinary Core Ideas";
  if (fw === "AP")   return "AP Chemistry";
  return fw;
}

function frameworkHeaderColor(fw: string): string {
  if (fw === "NGSS") return "text-blue-700 border-blue-200 bg-blue-50";
  if (fw === "AP")   return "text-violet-700 border-violet-200 bg-violet-50";
  return "text-slate-600 border-slate-200 bg-slate-50";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StudentSkillTree({ studentId, classId }: StudentSkillTreeProps) {
  const { data, loading, error } = useStudentStandardsMastery(studentId, classId);

  // Group by framework
  const grouped = useMemo(() => {
    if (!data?.standards.length) return new Map<string, StudentStandardMasteryItem[]>();
    const map = new Map<string, StudentStandardMasteryItem[]>();
    for (const std of data.standards) {
      const list = map.get(std.framework) ?? [];
      list.push(std);
      map.set(std.framework, list);
    }
    return map;
  }, [data]);

  const totalMastered = data?.standards.filter((s) => s.is_mastered).length ?? 0;
  const total = data?.standards.length ?? 0;

  if (!studentId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your standards…
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Could not load standards. Try again later.
      </p>
    );
  }

  if (!data || total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <FlaskConical className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">
          No standards tracked yet
        </p>
        <p className="text-xs text-muted-foreground/70">
          Start practicing lessons to see which science standards you're mastering.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress summary */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex-1 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Standards mastered
          </p>
          <Progress
            value={(totalMastered / total) * 100}
            className="h-2"
          />
        </div>
        <span className="shrink-0 text-lg font-bold tabular-nums text-foreground">
          {totalMastered}
          <span className="text-sm font-normal text-muted-foreground">/{total}</span>
        </span>
      </div>

      {/* Grouped standard rows */}
      {[...grouped.entries()].map(([fw, stds]) => (
        <div key={fw} className="space-y-2">
          {/* Framework header */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold",
              frameworkHeaderColor(fw),
            )}
          >
            {frameworkLabel(fw)}
            <span className="ml-auto font-normal opacity-70">
              {stds.filter((s) => s.is_mastered).length}/{stds.length} mastered
            </span>
          </div>

          {/* Standard rows */}
          <div className="space-y-1.5">
            {stds.map((std) => {
              const pct = Math.round(std.mastery_score * 100);
              return (
                <div
                  key={std.standard_code}
                  className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                >
                  {/* Check / circle icon */}
                  <div className="mt-0.5 shrink-0">
                    {std.is_mastered ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Text + bar */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs leading-snug text-foreground">
                      <span className="font-semibold text-muted-foreground">
                        {masteryVerb(std.mastery_score)}{" "}
                      </span>
                      {std.standard_title ?? std.standard_code}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full transition-all", masteryBarColor(std.mastery_score))}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                          masteryBadgeClass(std.mastery_score),
                        )}
                      >
                        {pct}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60">
                      {std.standard_code} · {std.lesson_count} lesson{std.lesson_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
