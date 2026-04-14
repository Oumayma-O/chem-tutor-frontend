import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingUp, Clock, BookOpen, Users } from "lucide-react";
import {
  getEngagementAnalytics,
  type EngagementAnalytics,
} from "@/services/api/admin";

interface Props {
  isSuperAdmin: boolean;
  /** Pre-fill the school name for school-admin (no scope choice needed). */
  defaultSchool?: string | null;
  /** Pre-fill the district name for superadmin default view. */
  defaultDistrict?: string | null;
}

type Scope = "teacher" | "school" | "district";
type Timeframe = "last_7_days" | "last_30_days" | "last_90_days";

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  last_90_days: "Last 90 days",
};

function StatBadge({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border/60">
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function EngagementAnalyticsPanel({
  isSuperAdmin,
  defaultSchool,
  defaultDistrict,
}: Props) {
  const initialScope: Scope = isSuperAdmin ? "district" : "school";
  const initialTarget = isSuperAdmin
    ? (defaultDistrict ?? "")
    : (defaultSchool ?? "");

  const [scope, setScope] = useState<Scope>(initialScope);
  const [target, setTarget] = useState(initialTarget);
  const [timeframe, setTimeframe] = useState<Timeframe>("last_30_days");
  const [pendingTarget, setPendingTarget] = useState(initialTarget);

  const queryKey = ["engagement-analytics", scope, target, timeframe, isSuperAdmin];

  const { data, isLoading, isError } = useQuery<EngagementAnalytics>({
    queryKey,
    queryFn: () =>
      getEngagementAnalytics({ scope, target, timeframe, isSuperAdmin }),
    enabled: !!target,
    staleTime: 60_000,
  });

  // Build daily line-chart data: aggregate across all teachers by date
  const dailyMap = new Map<string, { date: string; logins: number; hours: number }>();
  for (const teacher of data?.teachers ?? []) {
    for (const d of teacher.daily) {
      const prev = dailyMap.get(d.date) ?? { date: d.date, logins: 0, hours: 0 };
      dailyMap.set(d.date, {
        date: d.date,
        logins: prev.logins + d.logins,
        hours: +(prev.hours + d.minutes / 60).toFixed(1),
      });
    }
  }
  const dailyData = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // Build bar chart data: questions per class
  const classData = (data?.questions_by_class ?? []).map((q) => ({
    name: q.class_name,
    teacher: q.teacher_name,
    questions: q.question_count,
  }));

  const handleApply = () => setTarget(pendingTarget.trim());

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        {isSuperAdmin && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Scope</Label>
            <Select
              value={scope}
              onValueChange={(v) => {
                setScope(v as Scope);
                setPendingTarget("");
                setTarget("");
              }}
            >
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="district">Entire District</SelectItem>
                <SelectItem value="school">Entire School</SelectItem>
                <SelectItem value="teacher">Specific Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1 flex-1 min-w-[180px]">
          <Label className="text-xs text-muted-foreground">
            {scope === "teacher"
              ? "Teacher UUID"
              : scope === "school"
              ? "School name"
              : "District name"}
          </Label>
          <div className="flex gap-2">
            <Input
              className="h-8 text-xs"
              value={pendingTarget}
              onChange={(e) => setPendingTarget(e.target.value)}
              placeholder={
                scope === "teacher"
                  ? "Paste teacher UUID…"
                  : scope === "school"
                  ? "e.g. Lincoln High School"
                  : "e.g. Dallas ISD"
              }
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
            />
            <Button size="sm" className="h-8 text-xs" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Timeframe</Label>
          <Select
            value={timeframe}
            onValueChange={(v) => setTimeframe(v as Timeframe)}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TIMEFRAME_LABELS) as Timeframe[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {TIMEFRAME_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading / empty state */}
      {!target && (
        <p className="text-sm text-muted-foreground">
          Enter a {scope === "teacher" ? "teacher UUID" : scope === "school" ? "school name" : "district name"} above to load engagement data.
        </p>
      )}
      {isLoading && (
        <p className="text-sm text-muted-foreground animate-pulse">Loading analytics…</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">Failed to load engagement analytics.</p>
      )}

      {data && (
        <>
          {/* Summary badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBadge icon={Users} label="Teachers active" value={data.teachers.length} />
            <StatBadge icon={TrendingUp} label="Total logins" value={data.total_logins} />
            <StatBadge
              icon={Clock}
              label="Total hours active"
              value={`${(data.total_minutes / 60).toFixed(1)} h`}
            />
            <StatBadge icon={BookOpen} label="Questions assigned" value={data.total_questions_assigned} />
          </div>

          {/* Line chart: Logins & Hours per day */}
          {dailyData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Daily Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) =>
                        new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                      }
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={(v: string) =>
                        new Date(v).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="logins"
                      name="Logins"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      name="Hours active"
                      stroke="hsl(var(--chart-2, 217 91% 60%))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Bar chart: Questions assigned per class */}
          {classData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Questions Assigned per Class</CardTitle>
                  <Badge variant="secondary" className="text-xs">Published exit tickets</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={classData}
                    margin={{ top: 4, right: 8, left: -20, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value: number) => [value, "Questions"]}
                      labelFormatter={(name: string) => `Class: ${name}`}
                    />
                    <Bar dataKey="questions" name="Questions" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Teacher breakdown table */}
          {data.teachers.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Teacher Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Teacher</th>
                        {isSuperAdmin && (
                          <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">School</th>
                        )}
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Logins</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.teachers
                        .slice()
                        .sort((a, b) => b.total_logins - a.total_logins)
                        .map((t) => (
                          <tr key={t.teacher_id} className="border-b border-border/40 hover:bg-muted/30">
                            <td className="px-4 py-2">
                              <div className="font-medium">{t.teacher_name}</div>
                              <div className="text-xs text-muted-foreground">{t.email}</div>
                            </td>
                            {isSuperAdmin && (
                              <td className="px-4 py-2 text-xs text-muted-foreground">{t.school ?? "—"}</td>
                            )}
                            <td className="px-4 py-2 text-right tabular-nums">{t.total_logins}</td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {(t.total_minutes / 60).toFixed(1)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {dailyData.length === 0 && classData.length === 0 && data.teachers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No engagement data found for the selected {scope} and timeframe.
            </p>
          )}
        </>
      )}
    </div>
  );
}
