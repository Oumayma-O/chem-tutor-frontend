import { useState } from "react";
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
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Eye, Filter, Users, X } from "lucide-react";
import { getExitTicketResults } from "@/services/api/teacher";
import { ExitTicketMisconceptionPanel } from "@/components/teacher/ExitTicketMisconceptionPanel";
import { useUnits } from "@/hooks/useUnits";
import { useUnitLessonTitle } from "@/hooks/useUnitLessonTitle";
import { useTeacherExitTicketsSSE } from "@/hooks/useTeacherDashboardSSE";
import { computeQuestionClassScore } from "@/lib/exitTicketAnalyticsUtils";
import { MathText } from "@/lib/mathDisplay";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { teacherQueryNoRetry, refetchIntervalUnlessError } from "@/lib/teacherQueryOptions";
import { scorePercentBadgeClassName } from "@/lib/teacherScoreStyles";

const PAGE_SIZE = 10;

interface ExitTicketAnalyticsPanelProps {
  classId: string;
  isActive?: boolean;
}

export function ExitTicketAnalyticsPanel({ classId, isActive = false }: ExitTicketAnalyticsPanelProps) {
  const [page, setPage] = useState(1);
  const [filterUnitId, setFilterUnitId] = useState<string>("");
  const [filterLessonId, setFilterLessonId] = useState<string>("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [expandedSubmissionsId, setExpandedSubmissionsId] = useState<string | null>(null);
  const { units } = useUnits();
  const unitTitle = useUnitLessonTitle(units);

  useTeacherExitTicketsSSE({
    classId,
    page,
    limit: PAGE_SIZE,
    unitId: filterUnitId,
    lessonId: filterLessonId,
    enabled: Boolean(classId) && isActive,
  });

  const { data, isLoading } = useQuery({
    queryKey: teacherQueryKeys.exitTickets.list(classId, page, PAGE_SIZE, filterUnitId, filterLessonId),
    queryFn: () =>
      getExitTicketResults(classId, page, PAGE_SIZE, {
        unit_id: filterUnitId || undefined,
        lesson_id: filterLessonId || undefined,
      }),
    enabled: Boolean(classId),
    staleTime: 15_000,
    refetchInterval: refetchIntervalUnlessError(12_000),
    ...teacherQueryNoRetry,
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
                  <Button
                    variant={expandedSubmissionsId === bundle.ticket.id ? "default" : "outline"}
                    size="sm"
                    className="h-6 gap-1 px-2 text-[10px]"
                    disabled={bundle.responses.length === 0}
                    onClick={() => setExpandedSubmissionsId(expandedSubmissionsId === bundle.ticket.id ? null : bundle.ticket.id)}
                  >
                    <Users className="h-3 w-3" />
                    Submissions ({bundle.responses.length})
                  </Button>
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="h-6 gap-1 px-2 text-[10px]"
                    disabled={bundle.responses.length === 0}
                    onClick={() => setSelectedTicketId(isSelected ? null : bundle.ticket.id)}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Misconceptions
                  </Button>
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
                            <Badge variant="outline" className={scorePercentBadgeClassName(classPct)}>
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
              {expandedSubmissionsId === bundle.ticket.id && bundle.responses.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Student Submissions ({bundle.responses.length})
                  </p>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">Student</TableHead>
                          {bundle.ticket.questions.map((q, qi) => (
                            <TableHead key={q.id} className="text-center min-w-[80px]">
                              Q{qi + 1}
                            </TableHead>
                          ))}
                          <TableHead className="text-center min-w-[70px]">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bundle.responses.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm font-medium">
                              {r.student_name ?? r.student_id.slice(0, 8)}
                            </TableCell>
                            {bundle.ticket.questions.map((q) => {
                              const ans = (r.answers as Record<string, unknown>[]).find(
                                (a) => String(a.question_id ?? a.id ?? "") === q.id,
                              );
                              if (!ans) {
                                return (
                                  <TableCell key={q.id} className="text-center text-xs text-muted-foreground">
                                    —
                                  </TableCell>
                                );
                              }
                              const chosen = String(ans.answer ?? ans.value ?? "");
                              const isCorrect =
                                q.correct_answer != null &&
                                chosen.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
                              return (
                                <TableCell key={q.id} className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {q.correct_answer != null ? (
                                      isCorrect ? (
                                        <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                      ) : (
                                        <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                      )
                                    ) : null}
                                    <span
                                      className={`text-xs max-w-[100px] truncate ${
                                        q.correct_answer == null
                                          ? "text-foreground"
                                          : isCorrect
                                            ? "text-green-700 dark:text-green-400"
                                            : "text-red-600 dark:text-red-400"
                                      }`}
                                      title={chosen}
                                    >
                                      {chosen || "—"}
                                    </span>
                                  </div>
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center">
                              {r.score != null ? (
                                <Badge
                                  variant="outline"
                                  className={scorePercentBadgeClassName(Math.round(r.score))}
                                >
                                  {Math.round(r.score)}%
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              {isSelected && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Common Misconceptions
                  </p>
                  <ExitTicketMisconceptionPanel classId={classId} ticketId={bundle.ticket.id} />
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
