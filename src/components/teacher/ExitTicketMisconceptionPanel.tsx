import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
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
        Could not load misconceptions ({msg}). Expected GET /teacher/exit-tickets/[classId]/misconceptions with
        ticket_id.
      </p>
    );
  }

  if (!data?.questions?.length) {
    return (
      <p className="text-xs text-muted-foreground">No misconception data yet for this session.</p>
    );
  }

  return (
    <div className="space-y-4">
      {data.questions.map((q) => {
        const chartData = q.hits.map((h) => ({
          tag: h.tag.replace(/_/g, " "),
          count: h.count,
        }));
        return (
          <div key={q.question_id} className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold text-foreground line-clamp-2">
              <MathText>{q.prompt}</MathText>
            </p>
            <ResponsiveContainer width="100%" height={Math.max(60, chartData.length * 32)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="tag"
                  width={180}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [`${v} student${Number(v) !== 1 ? "s" : ""}`, "Count"]}
                  labelFormatter={(l) => String(l)}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={TEACHER_MISCONCEPTION_BAR_COLORS[i % TEACHER_MISCONCEPTION_BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
