import { format } from "date-fns";
import { CheckCircle2, XCircle, Layers, ClipboardCheck, Timer, Lightbulb, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { isAssessmentPassingPercent } from "@/lib/teacherScoreStyles";
import type { GroupedActivityRow } from "@/lib/studentActivityFeedGrouping";

interface StudentActivityRowProps {
  groupedRow: GroupedActivityRow;
  unitTitle: (unitId: string) => string;
  formatDuration: (seconds: number | null | undefined) => string;
}

export function StudentActivityRow({ groupedRow, unitTitle, formatDuration }: StudentActivityRowProps) {
  const { row, globalIndex, date, group, showGroup } = groupedRow;

  if (row.kind === "practice") {
    const a = row.attempt;
    const scorePct = a.score != null ? Math.round(a.score * 100) : null;
    const passed = scorePct != null && isAssessmentPassingPercent(scorePct);
    return (
      <div key={a.id}>
        {showGroup && (
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-2 border-b pb-1 first:mt-0">{group}</div>
        )}
        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 text-xs">
          <span className="text-muted-foreground w-4 shrink-0">{globalIndex + 1}</span>
          {passed
            ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
            : <XCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
          <div className="flex-1 min-w-0">
            <span className="text-foreground font-medium truncate block">{unitTitle(a.unit_id)}</span>
            <span className="text-muted-foreground">
              Practice · Lesson {a.lesson_index + 1} · {format(date, "MMM d")}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500">
            <span className="flex items-center gap-1" title="Time spent">
              <Timer className="w-3 h-3" />
              {formatDuration(a.time_spent_s)}
            </span>
            <span className="flex items-center gap-1" title="Hints used">
              <Lightbulb className="w-3 h-3" />{a.hints_used ?? 0}
            </span>
            <span className="flex items-center gap-1" title="Reveals used">
              <Eye className="w-3 h-3" />{a.reveals_used ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Layers className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">L{a.level}</span>
          </div>
          <span className={cn("font-semibold w-10 text-right", scorePct == null ? "text-muted-foreground" : passed ? "text-success" : "text-yellow-600")}>
            {scorePct != null ? `${scorePct}%` : "—"}
          </span>
        </div>
      </div>
    );
  }

  const { response, ticket } = row;
  const scorePct = response.score != null ? Math.round(response.score) : null;
  const passed = scorePct != null && isAssessmentPassingPercent(scorePct);
  return (
    <div key={response.id}>
      {showGroup && (
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-2 border-b pb-1 first:mt-0">{group}</div>
      )}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 text-xs">
        <span className="text-muted-foreground w-4 shrink-0">{globalIndex + 1}</span>
        {passed
          ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
          : <XCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
        <div className="flex-1 min-w-0">
          <span className="text-foreground font-medium truncate block">{unitTitle(ticket.unit_id)}</span>
          <span className="text-muted-foreground">
            Exit ticket · Lesson {ticket.lesson_index + 1} · {format(date, "MMM d")}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500">
          <span className="flex items-center gap-1" title="Time spent">
            <Timer className="w-3 h-3" />
            {formatDuration(response.time_spent_s)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ClipboardCheck className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">ET</span>
        </div>
        <span className={cn("font-semibold w-10 text-right", scorePct == null ? "text-muted-foreground" : passed ? "text-success" : "text-yellow-600")}>
          {scorePct != null ? `${scorePct}%` : "—"}
        </span>
      </div>
    </div>
  );
}
