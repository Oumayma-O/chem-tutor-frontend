import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getMisconceptionAnalytics, type MisconceptionAnalytics } from "@/services/api/teacher";
import { MathText } from "@/lib/mathDisplay";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { teacherQueryNoRetry } from "@/lib/teacherQueryOptions";
import { TEACHER_MISCONCEPTION_BAR_COLORS } from "@/lib/teacherChartPalette";

interface ExitTicketMisconceptionPanelProps {
  classId: string;
  ticketId: string;
}

export function ExitTicketMisconceptionPanel({ classId, ticketId }: ExitTicketMisconceptionPanelProps) {
  const { data, isLoading, isError, error } = useQuery<MisconceptionAnalytics>({
    queryKey: teacherQueryKeys.exitTickets.misconceptions(classId, ticketId),
    queryFn: () => getMisconceptionAnalytics(classId, ticketId),
    ...teacherQueryNoRetry,
  });

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading misconception data…</p>;
  }

  if (isError) {
    const msg = error instanceof Error ? error.message : "Request failed";
    return (
      <p className="text-xs text-destructive">
        Could not load misconceptions ({msg}).
      </p>
    );
  }

  if (!data?.questions?.length) {
    return (
      <p className="text-xs text-muted-foreground">No misconception data yet for this ticket.</p>
    );
  }

  return (
    <div className="space-y-5">
      {data.questions.map((q) => {
        if (!q.hits.length) return null;

        const chartData = q.hits.map((h) => ({
          name: h.tag.replace(/_/g, " "),
          value: h.count,
        }));

        const total = chartData.reduce((s, d) => s + d.value, 0);

        return (
          <div key={q.question_id} className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="mb-3 text-xs font-semibold text-foreground line-clamp-2">
              <MathText>{q.prompt}</MathText>
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={TEACHER_MISCONCEPTION_BAR_COLORS[i % TEACHER_MISCONCEPTION_BAR_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [
                    `${v} student${v !== 1 ? "s" : ""} (${Math.round((v / total) * 100)}%)`,
                    "Count",
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-slate-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
