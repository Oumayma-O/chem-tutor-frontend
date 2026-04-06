import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, Filter, Users } from "lucide-react";
import {
  getExitTicketResults,
  getMisconceptionAnalytics,
  type ExitTicketQuestion,
  type ExitTicketResponseItem,
  type MisconceptionAnalytics,
} from "@/services/api/teacher";
import { useUnits } from "@/hooks/useUnits";
import { MathText } from "@/lib/mathDisplay";

function computeQuestionClassScore(
  q: ExitTicketQuestion,
  responses: ExitTicketResponseItem[],
): number | null {
  if (!q.correct_answer || responses.length === 0) return null;
  let correct = 0;
  let total = 0;
  const normalizedCorrect = q.correct_answer.trim().toLowerCase();
  for (const r of responses) {
    const ans = (r.answers as Record<string, unknown>[]).find(
      (a) => String(a.question_id ?? a.id ?? "") === q.id,
    );
    if (!ans) continue;
    total++;
    const chosen = String(ans.answer ?? ans.value ?? "").trim().toLowerCase();
    if (chosen === normalizedCorrect) correct++;
  }
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

const PAGE_SIZE = 10;

// Colour palette for misconception bars — one colour per bar segment.
const BAR_COLOURS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
];

interface MisconceptionPanelProps {
  classId: string;
  ticketId: string;
}

function MisconceptionPanel({ classId, ticketId }: MisconceptionPanelProps) {
  const { data, isLoading } = useQuery<MisconceptionAnalytics>({
    queryKey: ["teacher", "misconceptions", classId, ticketId],
    queryFn: () => getMisconceptionAnalytics(classId, ticketId),
    retry: false,
  });

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading misconception data…</p>;
  }

  if (!data?.questions?.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No misconception data yet for this session.
      </p>
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
                    <Cell key={i} fill={BAR_COLOURS[i % BAR_COLOURS.length]} />
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

interface ExitTicketAnalyticsPanelProps {
  classId: string;
}

export function ExitTicketAnalyticsPanel({ classId }: ExitTicketAnalyticsPanelProps) {
  const [page, setPage] = useState(1);
  const [filterUnitId, setFilterUnitId] = useState<string>("");
  const [filterLessonId, setFilterLessonId] = useState<string>("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const { units } = useUnits();

  const unitTitle = useMemo(() => {
    const map = new Map(units.map((u) => [u.id, u]));
    return (uid: string, lessonIndex?: number) => {
      const unit = map.get(uid);
      const chapterName = unit?.title ?? uid;
      if (lessonIndex != null && unit?.lesson_titles?.[lessonIndex]) {
        return `${chapterName} — L${lessonIndex + 1}: ${unit.lesson_titles[lessonIndex]}`;
      }
      return chapterName;
    };
  }, [units]);

  const { data, isLoading } = useQuery({
    queryKey: ["teacher", "exit-tickets", classId, page, filterUnitId, filterLessonId],
    queryFn: () =>
      getExitTicketResults(classId, page, PAGE_SIZE, {
        unit_id: filterUnitId || undefined,
        lesson_id: filterLessonId || undefined,
      }),
    enabled: Boolean(classId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading exit tickets…</CardContent>
      </Card>
    );
  }

  // Derive unique unit IDs and lesson IDs from all loaded items for filter dropdowns.
  const allItems = data?.items ?? [];
  const unitIds = [...new Set(allItems.map((b) => b.ticket.unit_id).filter(Boolean))];
  const lessonIds = [
    ...new Set(
      allItems.map((b) => b.ticket.lesson_id).filter((l): l is string => Boolean(l))
    ),
  ];

  if (!allItems.length && page === 1 && !filterUnitId && !filterLessonId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No published exit tickets for this class yet.
        </CardContent>
      </Card>
    );
  }

  const { analytics, total_pages } = data!;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Exit Ticket History
        </CardTitle>
        <CardDescription>
          {analytics.total_sessions} session(s) · {analytics.total_submissions} submission(s)
          {analytics.average_score != null && (
            <> · class avg {Math.round(analytics.average_score)}%</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Curriculum filters */}
        {(unitIds.length > 1 || lessonIds.length > 1) && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Filter:</span>
            {unitIds.length > 1 && (
              <Select
                value={filterUnitId || "__all__"}
                onValueChange={(v) => {
                  setFilterUnitId(v === "__all__" ? "" : v);
                  setFilterLessonId("");
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-[160px] text-xs">
                  <SelectValue placeholder="All units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All units</SelectItem>
                  {unitIds.map((uid) => (
                    <SelectItem key={uid} value={uid}>
                      {uid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {lessonIds.length > 1 && (
              <Select
                value={filterLessonId || "__all__"}
                onValueChange={(v) => {
                  setFilterLessonId(v === "__all__" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-[180px] text-xs">
                  <SelectValue placeholder="All lessons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All lessons</SelectItem>
                  {lessonIds.map((lid) => (
                    <SelectItem key={lid} value={lid}>
                      {lid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(filterUnitId || filterLessonId) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setFilterUnitId("");
                  setFilterLessonId("");
                  setPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        )}

        {allItems.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No tickets match the current filter.
          </p>
        )}

        {allItems.map((bundle) => {
          const isSelected = selectedTicketId === bundle.ticket.id;
          return (
            <div key={bundle.ticket.id} className="space-y-3 border rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {unitTitle(bundle.ticket.unit_id, bundle.ticket.lesson_index)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(bundle.ticket.published_at ?? bundle.ticket.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{bundle.ticket.difficulty}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {bundle.ticket.time_limit_minutes} min
                  </span>
                  {bundle.responses.length > 0 && (
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px]"
                      onClick={() => setSelectedTicketId(isSelected ? null : bundle.ticket.id)}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      Misconceptions
                    </Button>
                  )}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="w-20">Type</TableHead>
                    <TableHead className="w-32">Correct Answer</TableHead>
                    <TableHead className="w-24 text-center">Class Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundle.ticket.questions.map((q, i) => {
                    const classPct = computeQuestionClassScore(q, bundle.responses);
                    return (
                      <TableRow key={q.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="text-sm">
                          <MathText>{q.prompt}</MathText>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {q.question_type}
                          {q.unit && (
                            <span className="ml-1 rounded bg-muted px-1 font-mono text-[10px]">
                              {q.unit}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {q.correct_answer ? <MathText>{q.correct_answer}</MathText> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {classPct != null ? (
                            <Badge
                              variant="outline"
                              className={
                                classPct >= 80
                                  ? "border-green-500 text-green-700 dark:text-green-400"
                                  : classPct >= 50
                                    ? "border-yellow-500 text-yellow-700 dark:text-yellow-400"
                                    : "border-red-500 text-red-700 dark:text-red-400"
                              }
                            >
                              {classPct}%
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {bundle.responses.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {bundle.responses.length} submission(s)
                  </span>
                  {bundle.responses.map((r) => (
                    <span key={r.id}>
                      {r.student_name ?? r.student_id.slice(0, 8)}:{" "}
                      <span className="font-medium text-foreground">
                        {r.score != null ? `${Math.round(r.score)}%` : "—"}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              {isSelected && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Common Misconceptions
                  </p>
                  <MisconceptionPanel classId={classId} ticketId={bundle.ticket.id} />
                </div>
              )}
            </div>
          );
        })}

        {(total_pages ?? 1) > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (total_pages ?? 1)}
              onClick={() => setPage((p) => Math.min(total_pages ?? 1, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
