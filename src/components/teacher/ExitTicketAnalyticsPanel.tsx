import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, BookOpen, Check, Eye, Users, X } from "lucide-react";
import { getExitTicketResults, type ExitTicketsForClass } from "@/services/api/teacher";
import { ExitTicketMisconceptionPanel } from "@/components/teacher/ExitTicketMisconceptionPanel";
import { HistoryFilterBar } from "@/components/teacher/HistoryFilterBar";
import { HistoryPagination } from "@/components/teacher/HistoryPagination";
import { useUnits } from "@/hooks/useUnits";
import { useTeacherExitTicketsSSE } from "@/hooks/useTeacherDashboardSSE";
import {
  canGradeExitTicketRow,
  computeQuestionClassScore,
  exitTicketAnswerDisplayText,
  exitTicketQuestionCorrectForTeacher,
} from "@/lib/exitTicketAnalyticsUtils";
import { MathText } from "@/lib/mathDisplay";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { teacherQueryNoRetry } from "@/lib/teacherQueryOptions";
import { scorePercentBadgeClassName } from "@/lib/teacherScoreStyles";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveTab = "questions" | "submissions" | "misconceptions" | null;

interface ExitTicketAnalyticsPanelProps {
  classId: string;
  isActive?: boolean;
}

// ─── Per-card component ────────────────────────────────────────────────────────

type ExitTicketBundle = ExitTicketsForClass["items"][number];

interface HistoryCardProps {
  bundle: ExitTicketBundle;
  classId: string;
  units: { id: string; title: string; lesson_titles?: string[] }[];
}

function HistoryCard({ bundle, classId, units }: HistoryCardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);

  function toggle(tab: Exclude<ActiveTab, null>) {
    setActiveTab((prev) => (prev === tab ? null : tab));
  }

  // Compute overall class score as mean of per-question scores
  const overallScore = useMemo(() => {
    const scores = bundle.ticket.questions
      .map((q) => computeQuestionClassScore(q, bundle.responses))
      .filter((s): s is number => s !== null);
    if (!scores.length) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [bundle]);

  const ticketDate = new Date(
    bundle.ticket.published_at ?? bundle.ticket.created_at,
  ).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const unit = units.find((u) => u.id === bundle.ticket.unit_id);
  const unitName = unit?.title ?? bundle.ticket.unit_id ?? "—";
  const lessonName = (() => {
    const idx = bundle.ticket.lesson_index;
    if (idx != null && unit?.lesson_titles?.[idx]) {
      return `L${idx + 1}: ${unit.lesson_titles[idx]}`;
    }
    return unitName;
  })();

  const tabBaseClass =
    "flex items-center gap-1.5 font-medium text-sm px-3 py-1.5 rounded-md transition-all cursor-pointer border-0 bg-transparent";
  const tabActiveClass = `${tabBaseClass} bg-white text-blue-600 shadow-sm ring-1 ring-black/5 font-semibold`;
  const tabInactiveClass = `${tabBaseClass} text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden mb-4">
      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-3">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
          {unitName}
        </div>
        <h3 className="text-base font-semibold text-slate-800 leading-tight">{lessonName}</h3>
        {/* Metadata row: left = date · difficulty · duration, right = class avg badge */}
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="text-sm text-slate-500 flex flex-wrap items-center gap-2">
            <span>{ticketDate}</span>
            <span className="text-slate-300">•</span>
            <span className="capitalize">{bundle.ticket.difficulty}</span>
            <span className="text-slate-300">•</span>
            <span>{bundle.ticket.time_limit_minutes} min</span>
          </div>
          {overallScore !== null && (
            <Badge
              variant="outline"
              className={`text-[11px] px-2 py-0.5 shrink-0 ${scorePercentBadgeClassName(overallScore)}`}
            >
              Class avg {overallScore}%
            </Badge>
          )}
        </div>
      </div>

      {/* ── Soft tab bar ── */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-lg border border-slate-200 w-fit">
          <button
            className={activeTab === "questions" ? tabActiveClass : tabInactiveClass}
            onClick={() => toggle("questions")}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Questions
          </button>
          <button
            className={activeTab === "submissions" ? tabActiveClass : tabInactiveClass}
            onClick={() => toggle("submissions")}
          >
            <Users className="h-3.5 w-3.5" />
            Submissions ({bundle.responses.length})
          </button>
          <button
            className={activeTab === "misconceptions" ? tabActiveClass : tabInactiveClass}
            onClick={() => toggle("misconceptions")}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Misconceptions
          </button>
        </div>
      </div>

      {/* ── Expanding drawer ── */}
      <AnimatePresence initial={false}>
        {activeTab !== null && (
          <motion.div
            key={activeTab}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50/50 border-t border-gray-100 p-5">
              {/* Questions tab */}
              {activeTab === "questions" && (
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
                            {q.correct_answer ? (
                              <MathText>{q.correct_answer}</MathText>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {classPct != null ? (
                              <Badge
                                variant="outline"
                                className={scorePercentBadgeClassName(classPct)}
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
              )}

              {/* Submissions tab */}
              {activeTab === "submissions" && (
                bundle.responses.length > 0 ? (
                <div className="space-y-2">
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
                        {bundle.responses.map((r) => {
                          const gradable = r.answers.filter((a) => a.is_correct != null);
          const derivedScore =
            gradable.length > 0
              ? Math.round((gradable.filter((a) => a.is_correct).length / gradable.length) * 100)
              : null;
          const displayScore =
            r.score != null && r.score > 0 ? Math.round(r.score) : derivedScore;

                          return (
                            <TableRow key={r.id}>
                              <TableCell className="text-sm font-medium">
                                {r.student_name ?? r.student_id.slice(0, 8)}
                              </TableCell>
                              {bundle.ticket.questions.map((q) => {
                                const ans = r.answers.find(
                                  (a) => String(a.question_id ?? a.id ?? "") === q.id,
                                );
                                if (!ans) {
                                  return (
                                    <TableCell
                                      key={q.id}
                                      className="text-center text-xs text-muted-foreground"
                                    >
                                      —
                                    </TableCell>
                                  );
                                }
                                const chosen = exitTicketAnswerDisplayText(ans);
                                const isCorrect = exitTicketQuestionCorrectForTeacher(q, ans);
                                const showGrade = canGradeExitTicketRow(q, ans);
                                return (
                                  <TableCell key={q.id} className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      {showGrade ? (
                                        isCorrect ? (
                                          <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                                        ) : (
                                          <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                        )
                                      ) : null}
                                      <span
                                        className={`text-xs max-w-[100px] truncate ${
                                          !showGrade
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
                                {displayScore !== null ? (
                                  <Badge
                                    variant="outline"
                                    className={scorePercentBadgeClassName(displayScore)}
                                  >
                                    {displayScore}%
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
                  </div>
                </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">No submissions yet.</p>
                )
              )}

              {/* Misconceptions tab */}
              {activeTab === "misconceptions" && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Common Misconceptions
                  </p>
                  <ExitTicketMisconceptionPanel classId={classId} ticketId={bundle.ticket.id} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function ExitTicketAnalyticsPanel({ classId, isActive = false }: ExitTicketAnalyticsPanelProps) {
  const [filterLessonId, setFilterLessonId] = useState<string>("");
  const [dateRangeDays, setDateRangeDays] = useState<string>("all");
  const [lessonLabelById, setLessonLabelById] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 5;

  const { units } = useUnits();

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filterLessonId, dateRangeDays]);

  useTeacherExitTicketsSSE({
    classId,
    page,
    limit: PAGE_SIZE,
    unitId: "",
    lessonId: filterLessonId,
    days: dateRangeDays,
    enabled: Boolean(classId) && isActive,
  });

  const { data, isLoading } = useQuery<ExitTicketsForClass>({
    queryKey: teacherQueryKeys.exitTickets.list(classId, page, PAGE_SIZE, "", filterLessonId, dateRangeDays),
    queryFn: () =>
      getExitTicketResults(classId, page, PAGE_SIZE, {
        lesson_id: filterLessonId || undefined,
        days: dateRangeDays !== "all" ? Number(dateRangeDays) : undefined,
      }),
    enabled: Boolean(classId),
    staleTime: 15_000,
    refetchInterval: false,
    placeholderData: keepPreviousData,
    ...teacherQueryNoRetry,
  });

  // Reset on class change
  useEffect(() => {
    setFilterLessonId("");
    setDateRangeDays("all");
    setLessonLabelById({});
    setPage(1);
  }, [classId]);

  // Accumulate lesson label map
  useEffect(() => {
    if (!data?.items?.length) return;
    setLessonLabelById((prev) => {
      const next = { ...prev };
      for (const b of data.items) {
        const lid = b.ticket.lesson_id;
        if (!lid) continue;
        const unit = units.find((u) => u.id === b.ticket.unit_id);
        const idx = b.ticket.lesson_index;
        next[lid] =
          idx != null && unit?.lesson_titles?.[idx]
            ? `L${idx + 1}: ${unit.lesson_titles[idx]}`
            : unit?.title ?? lid;
      }
      return next;
    });
  }, [data, units]);

  // Scroll to top of panel when page changes
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [page]);

  const allItems = useMemo(() => data?.items ?? [], [data?.items]);
  const totalPages = Math.max(1, data?.total_pages ?? 1);

  const lessonOptions = useMemo(() => {
    const ids = new Set(Object.keys(lessonLabelById));
    for (const b of allItems) { if (b.ticket.lesson_id) ids.add(b.ticket.lesson_id); }
    if (filterLessonId) ids.add(filterLessonId);
    return [...ids].sort().map((lid) => ({ value: lid, label: lessonLabelById[lid] ?? lid }));
  }, [lessonLabelById, allItems, filterLessonId]);

  const analytics = data?.analytics;

  const isEmptyClass =
    !isLoading &&
    data &&
    !allItems.length &&
    !filterLessonId &&
    dateRangeDays === "all" &&
    (analytics?.total_sessions ?? 0) === 0;

  return (
    <div ref={scrollRef} className="scroll-mt-32 flex flex-col w-full border bg-white dark:bg-card rounded-xl shadow-sm overflow-hidden">
      {/* ── Header — always visible ── */}
      <div className="px-6 pt-5 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">Exit Ticket History</h3>
        </div>
        <p className="text-sm text-slate-500 mt-1 mb-3">
          {analytics
            ? `${analytics.total_sessions} session(s) · ${analytics.total_submissions} submission(s)${
                analytics.average_score != null
                  ? ` · class avg ${Math.round(analytics.average_score)}%`
                  : ""
              }`
            : isLoading ? "Loading summary…" : "No sessions yet."}
        </p>
        {!isEmptyClass && (
          <HistoryFilterBar
            dateRange={dateRangeDays}
            onDateRangeChange={(v) => setDateRangeDays(v)}
            lessonOptions={lessonOptions}
            lessonFilter={filterLessonId}
            onLessonFilterChange={setFilterLessonId}
            hasActiveFilter={Boolean(filterLessonId) || dateRangeDays !== "all"}
            onClear={() => { setFilterLessonId(""); setDateRangeDays("all"); }}
          />
        )}
      </div>

      {/* ── Content ── */}
      {isEmptyClass ? (
        <div className="flex flex-col items-center py-12 text-slate-400">
          <Eye className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm">No published exit tickets for this class yet.</p>
        </div>
      ) : (
        <>
          <div className="p-4 space-y-3">
            {isLoading && !data ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading exit tickets…</p>
            ) : allItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No tickets match the current filter.
              </p>
            ) : (
              allItems.map((bundle) => (
                <HistoryCard
                  key={bundle.ticket.id}
                  bundle={bundle}
                  classId={classId}
                  units={units}
                />
              ))
            )}
          </div>
          <HistoryPagination
            page={page}
            totalPages={totalPages}
            isLoading={isLoading}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
