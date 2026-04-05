import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Users,
  TrendingUp,
  BookOpen,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ClassStudentRow } from "@/hooks/useTeacherDashboardData";
import type { ClassSummaryStats } from "@/services/api/teacher";

export interface AnalyticsDashboardProps {
  selectedClassId: string;
  loadingStudents: boolean;
  displayStudents: ClassStudentRow[];
  classStats?: ClassSummaryStats;
  classMastery: number;
  atRiskCount: number;
  masteredCount: number;
  developingCount: number;
}

function barColor(mastery: number) {
  if (mastery >= 75) return "hsl(152 60% 45%)";
  if (mastery >= 50) return "hsl(38 92% 55%)";
  return "hsl(0 72% 55%)";
}

export function AnalyticsDashboard({
  selectedClassId,
  loadingStudents,
  displayStudents,
  classStats,
  classMastery,
  atRiskCount,
  masteredCount,
  developingCount,
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"engagement" | "performance" | "misconceptions">("engagement");

  const categoryChartData = useMemo(() => {
    const c = classStats?.category_breakdown;
    if (!c) return [];
    return [
      { topic: "Conceptual", mastery: Math.round(c.conceptual * 100) },
      { topic: "Procedural", mastery: Math.round(c.procedural * 100) },
      { topic: "Computational", mastery: Math.round(c.computational * 100) },
    ];
  }, [classStats]);

  const weakTopicRows = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of displayStudents) {
      for (const t of s.weakTopics) {
        m.set(t, (m.get(t) ?? 0) + 1);
      }
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topic, count]) => ({ topic, count }));
  }, [displayStudents]);

  const totalStudents = classStats?.total_students ?? displayStudents.length;

  const kpis = useMemo(
    () => [
      {
        label: "Students in class",
        value: String(totalStudents),
        sub: classStats ? "From class summary" : "From roster",
        icon: Users,
        accent: "text-blue-600",
        bg: "bg-blue-50",
      },
      {
        label: "Avg mastery",
        value: `${classMastery}%`,
        sub: "Overall class average",
        icon: TrendingUp,
        accent: "text-emerald-600",
        bg: "bg-emerald-50",
      },
      {
        label: "At risk",
        value: String(atRiskCount),
        sub: "Below 50% mastery",
        icon: AlertTriangle,
        accent: "text-rose-600",
        bg: "bg-rose-50",
      },
      {
        label: "On track",
        value: String(masteredCount + developingCount),
        sub: `${masteredCount} mastered · ${developingCount} developing`,
        icon: BookOpen,
        accent: "text-violet-600",
        bg: "bg-violet-50",
      },
    ],
    [totalStudents, classMastery, atRiskCount, masteredCount, developingCount, classStats],
  );

  if (selectedClassId === "all") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-800">Select a class</p>
        <p className="mt-1 text-sm text-slate-500">
          Choose a class in the header to load roster and analytics from the server.
        </p>
      </div>
    );
  }

  if (loadingStudents && displayStudents.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-12 text-slate-500 shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading class analytics…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{kpi.label}</span>
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", kpi.bg)}>
                <kpi.icon className={cn("h-4 w-4", kpi.accent)} />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-slate-800">{kpi.value}</div>
            <span className="text-xs font-medium text-slate-500">{kpi.sub}</span>
          </div>
        ))}
      </div>

      <div className="flex w-fit gap-1 rounded-lg bg-slate-100 p-1">
        {(
          [
            { key: "engagement", label: "Engagement" },
            { key: "performance", label: "Performance" },
            { key: "misconceptions", label: "Misconceptions" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-all",
              activeTab === tab.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "engagement" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-800">Student roster</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Mastery and practice counts from the class roster API. Session time and last login are not exposed yet.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/60">
                <TableHead className="font-medium text-slate-500">Student</TableHead>
                <TableHead className="font-medium text-slate-500">Last login</TableHead>
                <TableHead className="text-right font-medium text-slate-500">Lessons w/ data</TableHead>
                <TableHead className="font-medium text-slate-500">Mastery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                    No students enrolled in this class.
                  </TableCell>
                </TableRow>
              ) : (
                displayStudents.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-800">{s.name}</TableCell>
                    <TableCell className="text-slate-500">—</TableCell>
                    <TableCell className="text-right tabular-nums text-slate-700">{s.problems}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Progress value={s.mastery} className="h-2 w-28 bg-slate-100" />
                        <span className="w-9 text-right text-xs font-medium tabular-nums text-slate-600">
                          {s.mastery}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h3 className="mb-1 text-base font-semibold text-slate-800">Class mastery by category</h3>
            <p className="mb-5 text-sm text-slate-500">Aggregated from the teacher class summary API.</p>
            {categoryChartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No category breakdown for this class yet.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} barSize={40} margin={{ top: 5, right: 5, bottom: 20, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="topic"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [`${value}%`, "Mastery"]}
                    />
                    <Bar dataKey="mastery" radius={[6, 6, 0, 0]}>
                      {categoryChartData.map((entry, i) => (
                        <Cell key={i} fill={barColor(entry.mastery)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-1 text-base font-semibold text-slate-800">Weak areas (roster)</h3>
            <p className="mb-5 text-sm text-slate-500">Categories below 50% for each student, aggregated.</p>
            <div className="flex flex-1 flex-col justify-center space-y-4">
              {weakTopicRows.length === 0 ? (
                <p className="text-center text-sm text-slate-500">No weak categories flagged.</p>
              ) : (
                weakTopicRows.map((row) => (
                  <div key={row.topic}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-medium capitalize text-slate-700">{row.topic}</span>
                      <span className="text-sm font-bold tabular-nums text-slate-800">{row.count}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{
                          width: `${Math.min(100, (row.count / Math.max(weakTopicRows[0].count, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "misconceptions" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-base font-semibold text-slate-800">Misconception analytics</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Hint-level misconception tagging is not available from the API yet. When it is, ranked patterns will
                appear here.
              </p>
            </div>
          </div>
          <div className="px-6 py-10 text-center text-sm text-slate-500">No misconception data for this class.</div>
        </div>
      )}
    </div>
  );
}
