import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  TrendingUp,
  AlertTriangle,
  BookOpen,
  BarChart2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  getAggregateAnalytics,
  type AggregateAnalyticsResponse,
  type AggregateGroupRow,
} from "@/services/api/admin";
import {
  masteryPercentBarColorHsl,
  scorePercentBadgeClassName,
} from "@/lib/teacherScoreStyles";

// ── Props ──────────────────────────────────────────────────────────────────────

interface AggregateAnalyticsTabProps {
  isSuperAdmin: boolean;
  filterDistrict: string;
  filterSchool: string;
  adminSchool?: string;
  onDrillDown: (name: string, groupId: string | null, grouping: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// ── Impact stat card ───────────────────────────────────────────────────────────

interface ImpactCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function ImpactCard({ label, value, icon: Icon, iconBg, iconColor }: ImpactCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────

function AggregateSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

// ── Comparison bar tooltip ─────────────────────────────────────────────────────

function MasteryTooltip({ active, payload, label, overallPct }: any) {
  if (!active || !payload?.length) return null;
  const row: AggregateGroupRow & { avg_mastery_pct: number; delta: number } = payload[0]?.payload;
  const delta = row?.delta ?? 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-slate-800 truncate max-w-[200px]">{label}</p>
      <p className="text-slate-600">
        Avg mastery:{" "}
        <span className="font-bold">{row?.avg_mastery_pct ?? 0}%</span>
        <span className={`ml-1.5 font-semibold ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
          {delta >= 0 ? "+" : ""}
          {delta}% vs avg
        </span>
      </p>
      <p className="text-slate-500">Students: {row?.student_count ?? 0}</p>
      <p className="text-slate-500">Classes: {row?.class_count ?? 0}</p>
      <p className="text-slate-500">At-risk: {row?.at_risk_count ?? 0}</p>
    </div>
  );
}

// ── Distribution tooltip ───────────────────────────────────────────────────────

function DistTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg text-xs">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="text-slate-600 mt-0.5">
        <span className="font-bold">{d?.count}</span> students ({d?.pct}%)
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AggregateAnalyticsTab({
  isSuperAdmin,
  filterDistrict,
  filterSchool,
  onDrillDown,
}: AggregateAnalyticsTabProps) {
  const { data, isLoading, isError } = useQuery<AggregateAnalyticsResponse>({
    queryKey: ["aggregate-analytics", filterDistrict, filterSchool],
    queryFn: () =>
      getAggregateAnalytics({
        district: filterDistrict || undefined,
        school: filterSchool || undefined,
      }),
    staleTime: 60_000,
  });

  // Sort DESC by mastery — explicit sort so top/bottom strip is always correct.
  const chartData = useMemo(() => {
    if (!data) return [];
    const overallMastery = data.overall_avg_mastery;
    return [...data.groups]
      .sort((a, b) => b.avg_mastery - a.avg_mastery)
      .map((g) => ({
        ...g,
        avg_mastery_pct: Math.round(g.avg_mastery * 100),
        delta: Math.round((g.avg_mastery - overallMastery) * 100),
      }));
  }, [data]);

  const distData = useMemo(() => {
    if (!data) return [];
    const total = data.total_students;
    const dist = data.mastery_distribution ?? {};
    const safe = (k: string) => dist[k] ?? 0;
    return [
      { label: "0–50%",   count: safe("0-50"),   pct: total > 0 ? Math.round(safe("0-50")   / total * 100) : 0, fill: masteryPercentBarColorHsl(25) },
      { label: "50–70%",  count: safe("50-70"),  pct: total > 0 ? Math.round(safe("50-70")  / total * 100) : 0, fill: masteryPercentBarColorHsl(60) },
      { label: "70–85%",  count: safe("70-85"),  pct: total > 0 ? Math.round(safe("70-85")  / total * 100) : 0, fill: masteryPercentBarColorHsl(77) },
      { label: "85–100%", count: safe("85-100"), pct: total > 0 ? Math.round(safe("85-100") / total * 100) : 0, fill: masteryPercentBarColorHsl(92) },
    ];
  }, [data]);

  if (isLoading) return <AggregateSkeleton />;

  if (isError) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Failed to load aggregate analytics.
      </div>
    );
  }

  if (!data || data.groups.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <BarChart2 className="mx-auto mb-3 h-7 w-7 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">No data yet</p>
        <p className="mt-1 text-sm text-slate-400">
          Analytics will appear once teachers have active classes with student data.
        </p>
      </div>
    );
  }

  const overallPct = Math.round(data.overall_avg_mastery * 100);
  const atRiskPct  = data.total_students > 0
    ? Math.round((data.overall_at_risk_count / data.total_students) * 100)
    : 0;

  const isClassLevel = data.grouping === "class";
  const canDrillDown = isSuperAdmin && !isClassLevel;
  const drillHint = isClassLevel
    ? "Click a bar to open class dashboard"
    : `Click a bar to view ${data.grouping === "district" ? "schools" : "classes"}`;

  // Top / bottom performers (chartData already sorted DESC)
  const top3    = chartData.slice(0, Math.min(3, chartData.length));
  const bottom3 = [...chartData].slice(-Math.min(3, chartData.length)).reverse();
  const showPerformers = chartData.length >= 2;

  return (
    <div className="space-y-6">

      {/* ── Impact row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <ImpactCard
          label="Avg Mastery"
          value={`${overallPct}%`}
          icon={TrendingUp}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <ImpactCard
          label="At-Risk Students"
          value={`${atRiskPct}%`}
          icon={AlertTriangle}
          iconBg="bg-rose-100"
          iconColor="text-rose-600"
        />
        <ImpactCard
          label="Problems Solved"
          value={data.total_problems_solved.toLocaleString()}
          icon={BookOpen}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
      </div>

      {/* ── Comparison bar chart ──────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            {data.grouping === "class" && filterSchool
              ? `Classes in ${filterSchool}`
              : data.grouping === "school" && filterDistrict
                ? `Schools in ${filterDistrict}`
                : "Performance by District"}
          </CardTitle>
          <p className="text-[11px] text-slate-400 mt-0.5">{drillHint}</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 16, left: 0, bottom: chartData.length > 4 ? 60 : 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748b" }}
                angle={chartData.length > 4 ? -30 : 0}
                textAnchor={chartData.length > 4 ? "end" : "middle"}
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: "#64748b" }}
                width={40}
              />
              <Tooltip content={<MasteryTooltip overallPct={overallPct} />} />
              <Bar
                dataKey="avg_mastery_pct"
                radius={[4, 4, 0, 0]}
                cursor={canDrillDown || isClassLevel ? "pointer" : "default"}
                onClick={(entry: any) =>
                  onDrillDown(entry.name, entry.group_id ?? null, data.grouping)
                }
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={masteryPercentBarColorHsl(entry.avg_mastery_pct)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Top / bottom performers ───────────────────────────────── */}
      {showPerformers && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <ArrowUp className="h-3.5 w-3.5" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {top3.map((g) => (
                <div key={g.name} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-700 truncate">{g.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className={`text-[10px] px-1.5 py-0 ${scorePercentBadgeClassName(g.avg_mastery_pct)}`}>
                      {g.avg_mastery_pct}%
                    </Badge>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      {g.delta >= 0 ? `+${g.delta}%` : `${g.delta}%`}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                <ArrowDown className="h-3.5 w-3.5" />
                Need Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bottom3.map((g) => (
                <div key={g.name} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-700 truncate">{g.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className={`text-[10px] px-1.5 py-0 ${scorePercentBadgeClassName(g.avg_mastery_pct)}`}>
                      {g.avg_mastery_pct}%
                    </Badge>
                    <span className="text-[10px] text-rose-600 font-medium">
                      {g.delta >= 0 ? `+${g.delta}%` : `${g.delta}%`}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Mastery distribution histogram ────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Student Mastery Distribution
          </CardTitle>
          <p className="text-[11px] text-slate-400 mt-0.5">
            How students are spread across mastery bands
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                width={36}
                allowDecimals={false}
              />
              <Tooltip content={<DistTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Weakest units ─────────────────────────────────────────── */}
      {data.weakest_units.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">
              Curriculum Gaps — Weakest Units
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Units where students across this scope are struggling most
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.weakest_units.map((unit) => {
              const pct = Math.round(unit.avg_mastery * 100);
              return (
                <div key={unit.unit_id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700 truncate">
                      {unit.unit_title ?? unit.unit_id}
                    </span>
                    <span
                      className={`text-[11px] font-semibold border rounded px-1.5 py-0.5 shrink-0 ${scorePercentBadgeClassName(pct)}`}
                    >
                      {pct}%
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-[10px] text-slate-400">
                    {unit.student_count} student{unit.student_count !== 1 ? "s" : ""}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
