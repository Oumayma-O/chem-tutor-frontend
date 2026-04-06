import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import { getAggregateMisconceptions } from "@/services/api/teacher";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { teacherQueryNoRetry, refetchIntervalUnlessError } from "@/lib/teacherQueryOptions";
import { TEACHER_MISCONCEPTION_BAR_COLORS } from "@/lib/teacherChartPalette";

interface MisconceptionSummaryCardProps {
  classId: string;
}

export function MisconceptionSummaryCard({ classId }: MisconceptionSummaryCardProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: teacherQueryKeys.exitTickets.aggregate(classId),
    queryFn: () => getAggregateMisconceptions(classId),
    enabled: Boolean(classId),
    staleTime: 60_000,
    refetchInterval: refetchIntervalUnlessError(90_000),
    ...teacherQueryNoRetry,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Loading misconception data…
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : "Request failed";
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <p className="font-medium text-destructive">Could not load misconception analytics</p>
          <p className="mt-1 text-xs">{msg}</p>
          <p className="mt-2 text-xs">
            Ensure the API exposes{" "}
            <code className="rounded bg-muted px-1">GET /teacher/exit-tickets/{"{classId}"}/misconceptions/aggregate</code>.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.items.length === 0) {
    return null;
  }

  const chartData = data.items.slice(0, 12).map((item) => ({
    tag: item.tag.replace(/_/g, " "),
    count: item.count,
    pct: item.pct,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4.5 w-4.5 text-destructive" />
          Top Misconceptions
        </CardTitle>
        <CardDescription>
          Across all exit tickets · {data.total_wrong} wrong answer{data.total_wrong !== 1 ? "s" : ""} tagged
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(100, chartData.length * 34)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
          >
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="tag"
              width={200}
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <Tooltip
              formatter={(v: number, _name: string, props: { payload: { pct: number } }) => [
                `${v} hit${v !== 1 ? "s" : ""} (${props.payload.pct}%)`,
                "Count",
              ]}
              labelFormatter={(l) => String(l)}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={TEACHER_MISCONCEPTION_BAR_COLORS[i % TEACHER_MISCONCEPTION_BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
