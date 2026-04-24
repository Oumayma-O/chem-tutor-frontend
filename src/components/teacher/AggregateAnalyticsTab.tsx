import { useMemo, useState } from "react";
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
import type { TooltipProps } from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  BookOpen,
  BarChart2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Info,
  Users,
  Clock,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getAggregateAnalytics,
  type AggregateAnalyticsResponse,
  type AggregateGroupRow,
} from "@/services/api/admin";
import {
  masteryPercentBarColorHsl,
  scorePercentBadgeClassName,
} from "@/lib/teacherScoreStyles";
import { adminQueryKeys } from "@/lib/teacherQueryKeys";

// ── Props ──────────────────────────────────────────────────────────────────────

interface AggregateAnalyticsTabProps {
  isSuperAdmin: boolean;
  filterDistrict: string;
  filterSchool: string;
  onDrillDown: (name: string, groupId: string | null, grouping: string) => void;
}

// ── Impact stat card ───────────────────────────────────────────────────────────

interface ImpactCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  sub?: string;
}

function ImpactCard({ label, value, icon: Icon, iconBg, iconColor, sub }: ImpactCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
          {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────

function AggregateSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
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
      <Skeleton className="h-36 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

// ── Scoring guide sheet ────────────────────────────────────────────────────────

function ScoringGuideSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const levels = [
    {
      label: "L1 — Foundation",
      color: "bg-sky-50 border-sky-200",
      headerColor: "text-sky-700",
      steps: [
        { examples: "1 example viewed", pct: 10 },
        { examples: "2 examples viewed", pct: 20 },
        { examples: "3 examples viewed", pct: 30 },
      ],
      note: "Max 30% from this level. Viewing examples is passive — no problem solving yet.",
      entryNote: "Enter L2 with 20% (saw 2 examples) or 30% (saw 3 examples).",
    },
    {
      label: "L2 — Practice",
      color: "bg-violet-50 border-violet-200",
      headerColor: "text-violet-700",
      steps: [
        { examples: "1 perfect problem (1st attempt)", pct: 10 },
        { examples: "2 perfect problems", pct: 20 },
        { examples: "3 perfect problems", pct: 30 },
      ],
      note: "Max 30% from this level. Only first-attempt correct answers score.",
      entryNote: "Enter L3 with 10% (1 perfect), 20% (2 perfect), or 30% (3 perfect).",
    },
    {
      label: "L3 — Mastery",
      color: "bg-emerald-50 border-emerald-200",
      headerColor: "text-emerald-700",
      steps: [
        { examples: "1 perfect problem", pct: 20 },
        { examples: "2 perfect problems", pct: 40 },
        { examples: "3 perfect problems", pct: 60 },
        { examples: "4 perfect problems", pct: 80 },
      ],
      note: "Max 80% from this level. Needs 4 perfect problems to reach maximum.",
      entryNote: "At-risk if score < 40% after unlock.",
    },
  ];

  const riskTiers = [
    { score: "≥ 0.7", label: "High Risk", color: "bg-rose-100 text-rose-700 border-rose-200", desc: "High mastery deficit + many failed attempts" },
    { score: "0.4 – 0.7", label: "Moderate Risk", color: "bg-amber-100 text-amber-700 border-amber-200", desc: "Moderate mastery deficit or elevated attempts" },
    { score: "< 0.4", label: "On Track", color: "bg-emerald-100 text-emerald-700 border-emerald-200", desc: "Strong mastery trajectory" },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="text-base font-semibold text-slate-900">
            How Mastery Scoring Works
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 text-sm">
          <p className="text-slate-500 text-xs leading-relaxed">
            Total Mastery = L1 contribution + L2 contribution + L3 contribution (capped at 100%).
            Each level unlocks sequentially.
          </p>

          {levels.map((lvl) => (
            <div key={lvl.label} className={`rounded-lg border p-4 space-y-3 ${lvl.color}`}>
              <p className={`font-semibold text-sm ${lvl.headerColor}`}>{lvl.label}</p>
              <div className="space-y-2">
                {lvl.steps.map((s) => (
                  <div key={s.pct} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-44 shrink-0">{s.examples}</span>
                    <Progress value={s.pct} className="h-1.5 flex-1" />
                    <span className="text-xs font-semibold text-slate-700 w-8 text-right">{s.pct}%</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">{lvl.note}</p>
              <p className="text-[11px] text-slate-400 italic">{lvl.entryNote}</p>
            </div>
          ))}

          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <p className="font-semibold text-sm text-slate-700">Risk Score Formula</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <code className="bg-slate-100 px-1 rounded text-xs">risk = 0.7 × mastery_deficit + 0.3 × attempt_load</code>
              <br />where <code className="bg-slate-100 px-1 rounded text-xs">attempt_load = min(total_attempts / 10, 1.0)</code>
            </p>
            <div className="space-y-1.5">
              {riskTiers.map((t) => (
                <div key={t.score} className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 shrink-0 ${t.color}`}>{t.label}</span>
                  <span className="text-[11px] text-slate-500">{t.desc} (score {t.score})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Comparison bar tooltip ─────────────────────────────────────────────────────

type ChartDataRow = AggregateGroupRow & { avg_mastery_pct: number; delta: number };
type DistDataRow = { label: string; count: number; pct: number; fill: string };

function MasteryTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as ChartDataRow;
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
      {row?.high_risk_count != null ? (
        <>
          <p className="text-rose-600 font-medium">High Risk: {row.high_risk_count}</p>
          <p className="text-amber-600 font-medium">Moderate Risk: {row.moderate_risk_count ?? 0}</p>
        </>
      ) : row?.at_risk_l2_count != null ? (
        <>
          <p className="text-slate-500">At-risk L2: {row.at_risk_l2_count}</p>
          <p className="text-slate-500">At-risk L3: {row.at_risk_l3_count ?? 0}</p>
        </>
      ) : (
        <p className="text-slate-500">At-risk: {row?.at_risk_count ?? 0}</p>
      )}
    </div>
  );
}

// ── Distribution tooltip ───────────────────────────────────────────────────────

function DistTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as DistDataRow;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-lg text-xs">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="text-slate-600 mt-0.5">
        <span className="font-bold">{d?.count}</span> students ({d?.pct}%)
      </p>
    </div>
  );
}

// ── L1→L2→L3 Funnel ───────────────────────────────────────────────────────────

interface FunnelProps {
  l1: number;
  l2: number;
  l3: number;
}

function LevelFunnel({ l1, l2, l3 }: FunnelProps) {
  const bands = [
    { label: "L1 Foundation", pct: Math.round(l1 * 100), color: "bg-sky-400", textColor: "text-sky-700", desc: "Examples viewed" },
    { label: "L2 Practice",   pct: Math.round(l2 * 100), color: "bg-violet-400", textColor: "text-violet-700", desc: "Problems practiced" },
    { label: "L3 Mastery",    pct: Math.round(l3 * 100), color: "bg-emerald-500", textColor: "text-emerald-700", desc: "Advanced problems" },
  ];
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Zap className="h-4 w-4 text-violet-500" />
          Learning Funnel — Where Students Are
        </CardTitle>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Average fill across all students at each level
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {bands.map((b) => (
          <div key={b.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${b.textColor}`}>{b.label}</span>
              <span className="text-xs font-semibold tabular-nums text-slate-700">{b.pct}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${b.color}`}
                style={{ width: `${b.pct}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">{b.desc}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AggregateAnalyticsTab({
  isSuperAdmin,
  filterDistrict,
  filterSchool,
  onDrillDown,
}: AggregateAnalyticsTabProps) {
  const [showScoringGuide, setShowScoringGuide] = useState(false);

  const { data, isLoading, isError } = useQuery<AggregateAnalyticsResponse>({
    queryKey: adminQueryKeys.aggregateAnalytics(filterDistrict, filterSchool),
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

  const overallPct      = Math.round(data.overall_avg_mastery * 100);
  const adoptionPct     = data.adoption_rate != null ? Math.round(data.adoption_rate * 100) : null;
  const highRiskCount   = data.overall_high_risk ?? null;
  const modRiskCount    = data.overall_moderate_risk ?? null;

  const isClassLevel = data.grouping === "class";
  const canDrillDown = isSuperAdmin && !isClassLevel;
  const drillHint = isClassLevel
    ? "Click a bar to open class dashboard"
    : `Click a bar to view ${data.grouping === "district" ? "schools" : "classes"}`;

  const chartTitle = !isSuperAdmin
    ? "Classes in Your School"
    : data.grouping === "class" && filterSchool
      ? `Classes in ${filterSchool}`
      : data.grouping === "school" && filterDistrict
        ? `Schools in ${filterDistrict}`
        : "Performance by District";

  const half        = Math.min(3, Math.floor(chartData.length / 2));
  const top3        = chartData.slice(0, half);
  const bottom3     = [...chartData].slice(-half).reverse();
  const showPerformers = half >= 1;

  const showFunnel = data.overall_avg_l1_score != null;

  return (
    <div className="space-y-6">
      <ScoringGuideSheet open={showScoringGuide} onClose={() => setShowScoringGuide(false)} />

      {/* ── Row 1: Core KPIs ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Performance Overview</p>
          <button
            onClick={() => setShowScoringGuide(true)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            <Info className="h-3.5 w-3.5" />
            How scoring works
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <ImpactCard
            label="Avg Mastery"
            value={`${overallPct}%`}
            icon={TrendingUp}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
          />
          {adoptionPct !== null && (
            <ImpactCard
              label="L2 Adoption Rate"
              value={`${adoptionPct}%`}
              icon={Users}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              sub="Students who started practicing"
            />
          )}
          {highRiskCount !== null ? (
            <>
              <ImpactCard
                label="High Risk 🔴"
                value={highRiskCount}
                icon={AlertTriangle}
                iconBg="bg-rose-100"
                iconColor="text-rose-600"
                sub="Risk score ≥ 0.7"
              />
              <ImpactCard
                label="Moderate Risk 🟡"
                value={modRiskCount ?? 0}
                icon={AlertTriangle}
                iconBg="bg-amber-100"
                iconColor="text-amber-600"
                sub="Risk score 0.4–0.7"
              />
            </>
          ) : (
            <ImpactCard
              label="At-Risk Students"
              value={`${data.total_students > 0 ? Math.round((data.overall_at_risk_count / data.total_students) * 100) : 0}%`}
              icon={AlertTriangle}
              iconBg="bg-rose-100"
              iconColor="text-rose-600"
            />
          )}
        </div>
      </div>

      {/* ── Row 2: Volume metrics ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <ImpactCard
          label="Problems Solved"
          value={data.total_problems_solved.toLocaleString()}
          icon={BookOpen}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <ImpactCard
          label="Hours Active"
          value={data.total_hours_active.toLocaleString()}
          icon={Clock}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
      </div>

      {/* ── Learning funnel (L1→L2→L3) ───────────────────────────── */}
      {showFunnel && (
        <LevelFunnel
          l1={data.overall_avg_l1_score ?? 0}
          l2={data.overall_avg_l2_score ?? 0}
          l3={data.overall_avg_l3_score ?? 0}
        />
      )}
      {showFunnel && (
        <p className="text-[10px] text-slate-400 -mt-4">
          At-risk thresholds — L2: mastery &lt; 30% with ≥3 attempts · L3: mastery &lt; 40% after unlock
        </p>
      )}

      {/* ── Comparison bar chart ──────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            {chartTitle}
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
              <Tooltip content={<MasteryTooltip />} />
              <Bar
                dataKey="avg_mastery_pct"
                radius={[4, 4, 0, 0]}
                cursor={canDrillDown || isClassLevel ? "pointer" : "default"}
                onClick={(entry: any) =>
                  onDrillDown(entry.name, entry.group_id ?? null, data.grouping)
                }
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
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
                {distData.map((entry) => (
                  <Cell key={entry.label} fill={entry.fill} />
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
