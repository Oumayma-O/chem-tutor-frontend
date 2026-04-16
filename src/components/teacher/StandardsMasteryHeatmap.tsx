import { useMemo } from "react";
import { Loader2, LayoutGrid, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClassStandardsMastery } from "@/hooks/useClassStandardsMastery";
import type { ClassStudentRow } from "@/hooks/useTeacherDashboardData";
import { TEACHER_SCORE_MODERATE_MIN, TEACHER_SCORE_STRONG_MIN } from "@/lib/teacherScoreStyles";

interface StandardsMasteryHeatmapProps {
  classId: string | null;
  enrolledStudents: ClassStudentRow[];
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function masteryColor(score: number | undefined): string {
  if (score === undefined) return "bg-slate-100 border-slate-200 text-slate-400";
  if (score >= TEACHER_SCORE_STRONG_MIN / 100) return "bg-emerald-100 border-emerald-300 text-emerald-800";
  if (score >= TEACHER_SCORE_MODERATE_MIN / 100) return "bg-amber-100 border-amber-300 text-amber-800";
  return                          "bg-red-100 border-red-300 text-red-700";
}

function masteryLabel(score: number | undefined): string {
  if (score === undefined) return "—";
  return `${Math.round(score * 100)}%`;
}

function frameworkColor(fw: string): string {
  if (fw === "NGSS") return "text-blue-600 bg-blue-50 ring-blue-200";
  if (fw === "AP")   return "text-violet-600 bg-violet-50 ring-violet-200";
  return                    "text-slate-500 bg-slate-50 ring-slate-200";
}

function standardKey(framework: string, standardCode: string): string {
  return `${framework}:${standardCode}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StandardsMasteryHeatmap({
  classId,
  enrolledStudents,
}: StandardsMasteryHeatmapProps) {
  const { data, loading, error } = useClassStandardsMastery(classId);

  // Build a name lookup from enrolled students
  const nameLookup = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of enrolledStudents) {
      map[s.id] = s.name;
    }
    return map;
  }, [enrolledStudents]);

  // Collect ordered student ids — only those who appear in any standard score
  const studentIds = useMemo(() => {
    if (!data?.standards.length) return [];
    const seen = new Set<string>();
    for (const std of data.standards) {
      for (const score of std.student_scores) {
        seen.add(score.student_id);
      }
    }
    // Sort by name for stable display
    return [...seen].sort((a, b) =>
      (nameLookup[a] ?? a).localeCompare(nameLookup[b] ?? b),
    );
  }, [data, nameLookup]);

  // Build O(1) lookup: standard_code → student_id → mastery_score
  const scoreLookup = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    if (!data) return map;
    for (const std of data.standards) {
      const key = standardKey(std.framework, std.standard_code);
      map[key] = {};
      for (const s of std.student_scores) {
        map[key][s.student_id] = s.mastery_score;
      }
    }
    return map;
  }, [data]);

  // ── Render states ──────────────────────────────────────────────────────────

  if (!classId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-10 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        <span className="text-sm text-slate-500">Loading standards coverage…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Failed to load standards coverage data.
      </div>
    );
  }

  if (!data || data.standards.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <LayoutGrid className="mx-auto mb-3 h-7 w-7 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">No standards data yet</p>
        <p className="mt-1 text-sm text-slate-400">
          Standards will appear here once students in this class start completing problems or exit tickets.
        </p>
      </div>
    );
  }

  if (studentIds.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <LayoutGrid className="mx-auto mb-3 h-7 w-7 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">No student data yet</p>
        <p className="mt-1 text-sm text-slate-400">
          Students need to attempt lessons before their scores appear here.
        </p>
      </div>
    );
  }

  const standards = data.standards;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
        <LayoutGrid className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-slate-800">Student × Standard Coverage</h3>
        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          {standards.length} standards · {studentIds.length} students
        </span>
      </div>

      {/* ── Scrollable grid ── */}
      <div className="overflow-x-auto">
        <table className="min-w-max border-collapse text-xs">
          {/* Column headers = standard codes */}
          <thead>
            <tr>
              {/* Student name column */}
              <th className="sticky left-0 z-10 min-w-[140px] border-b border-r border-slate-100 bg-slate-50/90 px-4 py-2.5 text-left font-medium text-slate-500">
                Student
              </th>
              {standards.map((std) => (
                <th
                  key={standardKey(std.framework, std.standard_code)}
                  className="border-b border-r border-slate-100 bg-slate-50/90 px-2 py-2.5 text-center"
                >
                  <span
                    title={
                      std.standard_description
                        ? `${std.standard_code}: ${std.standard_description}`
                        : std.standard_title
                          ? `${std.standard_code}: ${std.standard_title}`
                          : std.standard_code
                    }
                    className={cn(
                      "inline-flex cursor-default items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset",
                      frameworkColor(std.framework),
                    )}
                  >
                    {std.standard_code}
                  </span>
                </th>
              ))}
              {/* Class avg column */}
              <th className="border-b border-slate-100 bg-slate-50/90 px-3 py-2.5 text-center font-medium text-slate-500">
                Avg
              </th>
            </tr>
          </thead>

          <tbody>
            {studentIds.map((sid, rowIdx) => {
              const studentScores = standards.map(
                (std) => scoreLookup[standardKey(std.framework, std.standard_code)]?.[sid],
              );
              const defined = studentScores.filter((s) => s !== undefined) as number[];
              const studentAvg = defined.length
                ? defined.reduce((a, b) => a + b, 0) / defined.length
                : undefined;

              return (
                <tr
                  key={sid}
                  className={cn(rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
                >
                  {/* Name cell */}
                  <td className="sticky left-0 z-10 border-b border-r border-slate-100 px-4 py-2 font-medium text-slate-700 shadow-[1px_0_0_0_theme(colors.slate.100)]">
                    {nameLookup[sid] ?? sid.slice(0, 8)}
                  </td>

                  {/* Score cells */}
                  {studentScores.map((score, ci) => (
                    <td
                      key={standardKey(standards[ci].framework, standards[ci].standard_code)}
                      className="border-b border-r border-slate-100 px-2 py-1.5 text-center"
                    >
                      <span
                        title={
                          score !== undefined
                            ? `${standards[ci].standard_code}: ${Math.round(score * 100)}%`
                            : "No data"
                        }
                        className={cn(
                          "inline-flex h-8 w-14 items-center justify-center rounded border text-[11px] font-semibold",
                          masteryColor(score),
                        )}
                      >
                        {masteryLabel(score)}
                      </span>
                    </td>
                  ))}

                  {/* Row avg */}
                  <td className="border-b border-slate-100 px-3 py-1.5 text-center">
                    <span
                      className={cn(
                        "inline-flex h-8 w-14 items-center justify-center rounded border text-[11px] font-semibold",
                        masteryColor(studentAvg),
                      )}
                    >
                      {masteryLabel(studentAvg)}
                    </span>
                  </td>
                </tr>
              );
            })}

            {/* Class average footer row */}
            <tr className="bg-slate-50/80 font-medium">
              <td className="sticky left-0 z-10 border-t border-r border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 shadow-[1px_0_0_0_theme(colors.slate.200)]">
                Class avg
              </td>
              {standards.map((std) => (
                <td
                  key={standardKey(std.framework, std.standard_code)}
                  className="border-t border-r border-slate-200 px-2 py-1.5 text-center"
                >
                  <span
                    className={cn(
                      "inline-flex h-8 w-14 items-center justify-center rounded border text-[11px] font-semibold",
                      masteryColor(std.class_avg),
                    )}
                  >
                    {masteryLabel(std.class_avg)}
                    {std.at_risk_count > 0 && (
                      <span
                        title={`${std.at_risk_count} student${std.at_risk_count !== 1 ? "s" : ""} struggling`}
                        className="ml-0.5 text-red-500"
                      >
                        *
                      </span>
                    )}
                  </span>
                </td>
              ))}
              <td className="border-t border-slate-200 px-3 py-1.5" />
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-3">
        <span className="text-xs font-medium text-slate-500">Legend</span>
        {[
          { label: `Mastered ≥ ${TEACHER_SCORE_STRONG_MIN}%`, cls: "bg-emerald-100 border-emerald-300 text-emerald-800" },
          { label: `Progressing ${TEACHER_SCORE_MODERATE_MIN}–${TEACHER_SCORE_STRONG_MIN - 1}%`, cls: "bg-amber-100 border-amber-300 text-amber-800" },
          { label: `Struggling < ${TEACHER_SCORE_MODERATE_MIN}%`, cls: "bg-red-100 border-red-300 text-red-700" },
          { label: "No data", cls: "bg-slate-100 border-slate-200 text-slate-400" },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn("inline-block h-4 w-4 rounded border", cls)} />
            <span className="text-xs text-slate-500">{label}</span>
          </span>
        ))}
        {standards.some((s) => s.at_risk_count > 0) && (
          <span className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-red-500">*</span>
            <span className="text-xs text-slate-500">has struggling students</span>
          </span>
        )}
      </div>
    </div>
  );
}
