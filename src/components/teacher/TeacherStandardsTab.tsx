import { Award, BookOpen, Loader2 } from "lucide-react";
import { TabsContent } from "@/components/ui/tabs";
import { useUnit } from "@/hooks/useUnit";
import { cn } from "@/lib/utils";

interface TeacherStandardsTabProps {
  unitId: string | null;
}

const FRAMEWORK_COLORS: Record<string, string> = {
  AP: "bg-violet-50 text-violet-700 ring-violet-200",
  NGSS: "bg-blue-50 text-blue-700 ring-blue-200",
  "Common Core": "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

function frameworkBadgeClass(framework: string) {
  return FRAMEWORK_COLORS[framework] ?? "bg-slate-50 text-slate-600 ring-slate-200";
}

export function TeacherStandardsTab({ unitId }: TeacherStandardsTabProps) {
  const { unit, loading } = useUnit(unitId ?? undefined);

  const sortedLessons = unit
    ? [...unit.lessons]
        .sort((a, b) => a.lesson_index - b.lesson_index)
        .filter((l) => l.standards.length > 0)
    : [];

  // Deduplicated list of all standards across the unit
  const allStandards = unit
    ? Array.from(
        new Map(
          unit.lessons
            .flatMap((l) => l.standards)
            .map((s) => [s.code, s]),
        ).values(),
      ).sort((a, b) => a.code.localeCompare(b.code))
    : [];

  return (
    <TabsContent value="standards" className="space-y-6">
      {/* Header summary */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold text-slate-800">Standards alignment</h3>
            <p className="text-sm text-slate-500">
              {unit
                ? `${allStandards.length} standard${allStandards.length !== 1 ? "s" : ""} covered across ${unit.lessons.length} lesson${unit.lessons.length !== 1 ? "s" : ""} in ${unit.title}`
                : "Standards linked to this class's unit."}
            </p>
          </div>
        </div>
        {unit && allStandards.length > 0 && (
          <div className="flex gap-2">
            {Array.from(new Set(allStandards.map((s) => s.framework))).map((fw) => (
              <span
                key={fw}
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                  frameworkBadgeClass(fw),
                )}
              >
                {fw}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* States */}
      {!unitId && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <Award className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No unit assigned to this class</p>
          <p className="mt-1 text-sm text-slate-400">
            Assign a unit to the class in Settings to see standards coverage.
          </p>
        </div>
      )}

      {unitId && loading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-12 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          <span className="text-sm text-slate-500">Loading standards…</span>
        </div>
      )}

      {unitId && !loading && unit && allStandards.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No standards linked yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Standards will appear here once they are mapped to lessons in the curriculum.
          </p>
        </div>
      )}

      {/* Standards by lesson */}
      {sortedLessons.length > 0 && (
        <div className="space-y-4">
          {sortedLessons.map((lesson) => (
            <div
              key={lesson.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {lesson.lesson_index + 1}
                </span>
                <span className="text-sm font-semibold text-slate-800">{lesson.title}</span>
                <span className="ml-auto text-xs text-slate-400">
                  {lesson.standards.length} standard{lesson.standards.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ul className="divide-y divide-slate-50">
                {lesson.standards.map((std) => (
                  <li key={std.code} className="flex items-start gap-3 px-5 py-3">
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-semibold ring-1 ring-inset",
                        frameworkBadgeClass(std.framework),
                      )}
                    >
                      {std.code}
                    </span>
                    <span className="text-sm text-slate-600">{std.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </TabsContent>
  );
}
