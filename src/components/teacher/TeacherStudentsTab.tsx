import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PredictiveInsights, SkillRadarChart } from "@/components/tutor/progress";
import { skillMapFromCategoryBreakdown, studentAttemptsToPredictiveShape } from "@/lib/predictiveFromMastery";
import { ChapterSelector } from "@/components/teacher/ChapterSelector";
import { cn } from "@/lib/utils";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { CourseLevel } from "@/data/units";
import { useUnits } from "@/hooks/useUnits";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Award,
  BookOpen,
  CheckCircle,
  User,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Ban,
  UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SkillMastery } from "@/types/cognitive";
import type { ClassStudentRow, TeacherClassRow } from "@/hooks/useTeacherDashboardData";
import {
  TEACHER_SCORE_MODERATE_MIN,
  TEACHER_SCORE_STRONG_MIN,
} from "@/lib/teacherScoreStyles";
import {
  getStudentAnalytics,
  getAllExitTicketResults,
  blockStudent,
  removeStudentFromClass,
  type ExitTicketConfig,
  type ExitTicketResponseItem,
} from "@/services/api/teacher";
import {
  computeStudentActivityAggregates,
  deriveStrengthsAndWeakTopics,
} from "@/lib/studentAnalyticsAggregations";
import { buildGroupedActivityRows } from "@/lib/studentActivityFeedGrouping";
import { StudentActivityRow } from "@/components/teacher/StudentActivityRow";
import {
  getActivityCardDescription,
  getActivityCardTitle,
  getActivityEmptyStateCopy,
} from "@/lib/studentActivityCopy";
import {
  buildStudentScopeText,
  getSuggestedActionSpecs,
  type StudentAnalyticsMode,
} from "@/lib/studentAnalyticsPresentation";

interface TeacherStudentsTabProps {
  selectedClassId: string;
  selectedClass: TeacherClassRow | undefined;
  loadingStudents: boolean;
  enrolledStudents: ClassStudentRow[];
  selectedStudent: string | null;
  onSelectStudent: (id: string) => void;
  onClearStudent: () => void;
  analyticsDate: Date | undefined;
  onAnalyticsDateChange: (d: Date | undefined) => void;
  analyticsChapter: string;
  onAnalyticsChapterChange: (v: string) => void;
  analyticsLesson: number | "all";
  onAnalyticsLessonChange: (v: number | "all") => void;
  analyticsMode: "all" | "practice" | "exit-ticket";
  onAnalyticsModeChange: (v: "all" | "practice" | "exit-ticket") => void;
}

export function TeacherStudentsTab({
  selectedClassId,
  selectedClass,
  loadingStudents,
  enrolledStudents,
  selectedStudent,
  onSelectStudent,
  onClearStudent,
  analyticsDate,
  onAnalyticsDateChange,
  analyticsChapter,
  onAnalyticsChapterChange,
  analyticsLesson,
  onAnalyticsLessonChange,
  analyticsMode,
  onAnalyticsModeChange,
}: TeacherStudentsTabProps) {
  const queryClient = useQueryClient();
  const { units } = useUnits();
  const selectedChapterForFilter = analyticsChapter !== "all" ? units.find((u) => u.id === analyticsChapter) : undefined;
  const lessonTitles = selectedChapterForFilter?.lesson_titles ?? [];

  return (
    <TabsContent value="students" className="space-y-6">
      {selectedStudent && (
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2 h-9 text-muted-foreground hover:text-foreground"
            onClick={onClearStudent}
          >
            <ArrowLeft className="w-4 h-4 shrink-0" />
            Back to all students
          </Button>
        </div>
      )}

      {selectedClassId !== "all" && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-secondary/30 rounded-lg">
          <ChapterSelector
            value={analyticsChapter}
            onValueChange={onAnalyticsChapterChange}
            courseLevel={selectedClass?.grade_level as CourseLevel | undefined}
            label=""
            showAllOption
          />

          {lessonTitles.length > 0 && (
            <Select
              value={analyticsLesson === "all" ? "all" : String(analyticsLesson)}
              onValueChange={(v) => onAnalyticsLessonChange(v === "all" ? "all" : Number(v))}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All Lessons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lessons</SelectItem>
                {lessonTitles.map((title, i) => (
                  <SelectItem key={i} value={String(i)}>
                    L{i + 1} · {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={analyticsMode} onValueChange={(v) => onAnalyticsModeChange(v as "all" | "practice" | "exit-ticket")}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="practice">Practice</SelectItem>
              <SelectItem value="exit-ticket">Exit Ticket</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", !analyticsDate && "text-muted-foreground")}>
                <CalendarIcon className="w-3.5 h-3.5" />
                {analyticsDate ? format(analyticsDate, "MMM d, yyyy") : "All dates"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={analyticsDate}
                onSelect={onAnalyticsDateChange}
                className={cn("p-3 pointer-events-auto")}
              />
              {analyticsDate && (
                <div className="px-3 pb-3">
                  <Button variant="ghost" size="sm" onClick={() => onAnalyticsDateChange(undefined)} className="w-full text-xs">
                    Clear date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Students ({enrolledStudents.length})
          </h3>
          {loadingStudents && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loadingStudents && enrolledStudents.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              {selectedClassId === "all" ? "Select a class to view students." : "No students enrolled yet."}
            </p>
          )}
          {enrolledStudents.map((student) => {
            const isActive = selectedStudent === student.id;
            return (
              <button
                key={student.id}
                type="button"
                onClick={() => onSelectStudent(student.id)}
                className={cn(
                  "group w-full p-3 rounded-lg border text-left transition-all",
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/30",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground text-sm">{student.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {student.trend === "up" && <TrendingUp className="w-3 h-3 text-success" />}
                    {student.trend === "down" && <TrendingDown className="w-3 h-3 text-destructive" />}
                    {student.trend === "stable" && <Minus className="w-3 h-3 text-muted-foreground" />}
                    <Badge
                      variant={student.mastery >= 75 ? "default" : student.mastery >= 50 ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {student.mastery}%
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!confirm(`Remove ${student.name} from this class?`)) return;
                            removeStudentFromClass(selectedClassId, student.id)
                              .then(() => {
                                toast.success(`${student.name} removed from class.`);
                                queryClient.invalidateQueries({ queryKey: teacherQueryKeys.roster(selectedClassId) });
                              })
                              .catch(() => toast.error("Failed to remove student."));
                          }}
                        >
                          <UserX className="h-3.5 w-3.5 mr-2" />
                          Remove from class
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {student.weakTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {student.weakTopics.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
                {student.lastActive > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Last active{" "}
                    {formatDistanceToNow(new Date(student.lastActive), { addSuffix: true })}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selectedStudent ? (
            <Card className="h-64 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Select a student to view detailed analytics</p>
              </div>
            </Card>
          ) : (
            <StudentDetailPanel
              studentId={selectedStudent}
              classroomId={selectedClassId}
              enrolledStudents={enrolledStudents}
              analyticsChapter={analyticsChapter}
              analyticsLesson={analyticsLesson}
              analyticsDate={analyticsDate}
              analyticsMode={analyticsMode}
            />
          )}
        </div>
      </div>
    </TabsContent>
  );
}

function formatDuration(s: number | null | undefined): string {
  if (!s || s <= 0) return "—";
  return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

function sameCalendarDay(d: Date, iso: string): boolean {
  const t = new Date(iso);
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

function StudentDetailPanel({
  studentId,
  classroomId,
  enrolledStudents,
  analyticsChapter,
  analyticsLesson,
  analyticsDate,
  analyticsMode,
}: {
  studentId: string;
  classroomId: string;
  enrolledStudents: ClassStudentRow[];
  analyticsChapter: string;
  analyticsLesson: number | "all";
  analyticsDate: Date | undefined;
  analyticsMode: StudentAnalyticsMode;
}) {
  const student = enrolledStudents.find((s) => s.id === studentId);
  const { units } = useUnits();
  const chapterFilter = analyticsChapter !== "all" ? analyticsChapter : undefined;

  const [historyPage, setHistoryPage] = useState(1);

  const needPractice = analyticsMode === "practice" || analyticsMode === "all";
  const needExit = analyticsMode === "exit-ticket" || analyticsMode === "all";

  const lessonFilter = analyticsLesson !== "all" ? analyticsLesson : undefined;

  const { data: analytics, isLoading: practiceLoading } = useQuery({
    queryKey: teacherQueryKeys.studentAnalytics(
      classroomId,
      studentId,
      chapterFilter,
      lessonFilter,
    ),
    queryFn: () => getStudentAnalytics(classroomId, studentId, chapterFilter, lessonFilter),
    enabled: Boolean(classroomId && studentId && classroomId !== "all" && needPractice),
    staleTime: 2 * 60_000,
    refetchInterval: 60_000,
  });

  const { data: exitData, isLoading: exitLoading } = useQuery({
    queryKey: teacherQueryKeys.exitTickets.studentPanel(classroomId),
    queryFn: async () => ({ items: await getAllExitTicketResults(classroomId) }),
    enabled: Boolean(classroomId && classroomId !== "all" && needExit),
    staleTime: 2 * 60_000,
    refetchInterval: 60_000,
  });

  const isLoading = (needPractice && practiceLoading) || (needExit && exitLoading);


  const unitTitle = useCallback((uid: string) => units.find((u) => u.id === uid)?.title ?? uid, [units]);

  const skillMap: SkillMastery[] = analytics
    ? skillMapFromCategoryBreakdown(analytics.category_scores, analytics.lessons_with_data)
    : [];

  const masteryPct = analytics ? Math.round(analytics.overall_mastery * 100) : (student?.mastery ?? 0);

  const attempts = analytics?.recent_attempts ?? [];
  // Backend already filters by unit_id and lesson_index — only date is a UI-only filter.
  const finishedPractice = useMemo(() => {
    let f = attempts.filter((a) => a.is_complete && a.score != null);
    if (analyticsDate) {
      f = f.filter((a) => sameCalendarDay(analyticsDate, a.started_at));
    }
    return f;
  }, [attempts, analyticsDate]);

  const exitForStudent = useMemo(() => {
    const bundles = exitData?.items ?? [];
    const rows: { response: ExitTicketResponseItem; ticket: ExitTicketConfig }[] = [];
    for (const bundle of bundles) {
      for (const r of bundle.responses) {
        if (String(r.student_id) !== String(studentId)) continue;
        if (chapterFilter && bundle.ticket.unit_id !== chapterFilter) continue;
        if (analyticsDate && !sameCalendarDay(analyticsDate, r.submitted_at)) continue;
        if (analyticsLesson !== "all" && bundle.ticket.lesson_index !== analyticsLesson) continue;
        rows.push({ response: r, ticket: bundle.ticket });
      }
    }
    return rows;
  }, [exitData?.items, studentId, chapterFilter, analyticsDate, analyticsLesson]);

  const { chapterSummary, headlineScorePct, finishedCount, unifiedRows } = useMemo(
    () =>
      computeStudentActivityAggregates({
        analyticsMode,
        finishedPractice,
        exitForStudent,
        chapterFilter,
        masteryPct,
        studentMastery: student?.mastery,
        unitTitle,
      }),
    [analyticsMode, finishedPractice, exitForStudent, chapterFilter, masteryPct, student?.mastery, unitTitle],
  );

  // Reset to page 1 whenever the activity feed changes
  useEffect(() => { setHistoryPage(1); }, [studentId, analyticsMode, chapterFilter, analyticsLesson, analyticsDate]);

  const HISTORY_PAGE_SIZE = 10;
  const historyTotalPages = Math.max(1, Math.ceil(unifiedRows.length / HISTORY_PAGE_SIZE));
  const pagedRows = unifiedRows.slice((historyPage - 1) * HISTORY_PAGE_SIZE, historyPage * HISTORY_PAGE_SIZE);
  const groupedRows = useMemo(
    () =>
      buildGroupedActivityRows({
        pagedRows,
        unifiedRows,
        historyPage,
        pageSize: HISTORY_PAGE_SIZE,
      }),
    [pagedRows, unifiedRows, historyPage],
  );

  const { weakTopics: filteredWeakTopics, strengths: filteredStrengths } = useMemo(
    () =>
      deriveStrengthsAndWeakTopics({
        categoryScores: analytics?.category_scores,
        analyticsLesson,
        headlineScorePct,
      }),
    [analytics?.category_scores, analyticsLesson, headlineScorePct],
  );

  const predictiveAttempts = useMemo(
    () =>
      studentAttemptsToPredictiveShape(
        [...finishedPractice].sort(
          (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
        ),
      ),
    [finishedPractice],
  );

  const actionMastery = headlineScorePct;
  const suggestedActions = getSuggestedActionSpecs(actionMastery);

  if (!student) return null;

  const scoreLabel =
    analyticsLesson !== "all" ? "Lesson Mastery" : chapterFilter ? "Chapter Mastery" : "Overall Mastery";

  const scopeText = buildStudentScopeText({
    analyticsMode,
    chapterFilter,
    analyticsLesson,
    analyticsDate,
    unitTitle,
    lessonTitle:
      chapterFilter && analyticsLesson !== "all"
        ? units.find((u) => u.id === chapterFilter)?.lesson_titles?.[analyticsLesson]
        : undefined,
  });

  const iconForAction = (label: string): ReactNode => {
    if (label === "Assign Worked Examples") return <BookOpen className="w-3.5 h-3.5" />;
    if (label === "Recommend Simulation") return <Target className="w-3.5 h-3.5" />;
    if (label === "Targeted Practice") return <Target className="w-3.5 h-3.5" />;
    if (label === "Challenge Problems") return <Award className="w-3.5 h-3.5" />;
    return <CheckCircle className="w-3.5 h-3.5" />;
  };

  const activityCardTitle = getActivityCardTitle({ analyticsMode, chapterFilter, unitTitle });
  const activityCardDescription = getActivityCardDescription({ analyticsMode, chapterFilter });
  const activityEmptyStateCopy = getActivityEmptyStateCopy({ analyticsMode, chapterFilter });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {student.name}
          </CardTitle>
          <CardDescription>
            {scopeText}
            {student.lastActive > 0 && (
              <span className="block mt-1 text-muted-foreground">
                Last active: {format(new Date(student.lastActive), "MMM d, yyyy 'at' h:mm a")}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading analytics…</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-xs text-muted-foreground">{scoreLabel}</span>
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      headlineScorePct >= TEACHER_SCORE_STRONG_MIN
                        ? "text-success"
                        : headlineScorePct >= TEACHER_SCORE_MODERATE_MIN
                          ? "text-warning"
                          : "text-destructive",
                    )}
                  >
                    {headlineScorePct}%
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    {analyticsMode === "exit-ticket" ? "Submissions" : analyticsMode === "all" ? "Scored Items" : "Attempts"}
                  </span>
                  <div className="text-2xl font-bold">{finishedCount}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Trend</span>
                  <div className="text-lg font-bold capitalize flex items-center gap-1">
                    {student.trend === "up" && <TrendingUp className="w-4 h-4 text-success" />}
                    {student.trend === "down" && <TrendingDown className="w-4 h-4 text-destructive" />}
                    {student.trend === "stable" && <Minus className="w-4 h-4 text-muted-foreground" />}
                    {student.trend}
                  </div>
                </div>
              </div>

              {/* Chapter-level score breakdown (only in "all" mode) */}
              {!chapterFilter && chapterSummary.length > 0 && (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    By chapter (recent sample)
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-1 mb-2">
                    {analyticsMode === "exit-ticket"
                      ? "Per-chapter averages from exit ticket scores. Headline uses the mean of these chapter averages."
                      : analyticsMode === "all"
                        ? "Per-chapter averages mix practice (%) and exit tickets (%). Headline uses the mean of chapter averages."
                        : "Averages include only attempts with a score. Headline uses the mean of these chapter averages."}
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {chapterSummary.map((ch) => (
                      <div key={ch.unitId} className="flex items-center gap-3">
                        <span className="text-xs text-foreground truncate flex-1">{ch.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {ch.count}{" "}
                          {analyticsMode === "exit-ticket" ? "submission(s)" : analyticsMode === "all" ? "item(s)" : "attempts"}
                        </span>
                        <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              ch.avg >= TEACHER_SCORE_STRONG_MIN
                                ? "bg-success"
                                : ch.avg >= TEACHER_SCORE_MODERATE_MIN
                                  ? "bg-yellow-400"
                                  : "bg-destructive",
                            )}
                            style={{ width: `${ch.avg}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-xs font-semibold w-9 text-right",
                            ch.avg >= TEACHER_SCORE_STRONG_MIN
                              ? "text-success"
                              : ch.avg >= TEACHER_SCORE_MODERATE_MIN
                                ? "text-warning"
                                : "text-destructive",
                          )}
                        >
                          {ch.avg}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
                  <span className="text-xs font-medium text-success">Strengths</span>
                  <p className="text-sm text-foreground mt-1">
                    {filteredStrengths.length > 0
                      ? filteredStrengths.join(", ")
                      : filteredWeakTopics.length === 0
                        ? "All areas strong"
                        : "Building foundations"}
                  </p>
                </div>
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <span className="text-xs font-medium text-destructive">Weak Areas</span>
                  <p className="text-sm text-foreground mt-1">
                    {filteredWeakTopics.length > 0 ? filteredWeakTopics.join(", ") : "None identified"}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Actions</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {suggestedActions.map((action, i) => (
                    <Button key={i} variant={action.variant} size="sm" className="gap-1.5 text-xs h-8">
                      {iconForAction(action.label)}
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {analyticsMode !== "exit-ticket" && skillMap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Skill Mastery Map</CardTitle>
            <CardDescription className="text-xs">Based on practice activity (not exit tickets).</CardDescription>
          </CardHeader>
          <CardContent>
            <SkillRadarChart skills={skillMap} size={280} />
          </CardContent>
        </Card>
      )}

      {needPractice &&
        !isLoading &&
        (skillMap.length > 0 || predictiveAttempts.length > 0) && (
          <PredictiveInsights
            masteryScore={headlineScorePct}
            skillMap={skillMap}
            recentAttempts={predictiveAttempts}
            errorPatterns={[]}
            studentName={student.name}
          />
        )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{activityCardTitle}</CardTitle>
          {activityCardDescription && (
            <CardDescription className="text-xs">{activityCardDescription}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {unifiedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{activityEmptyStateCopy}</p>
          ) : (
            <>
              <div className="space-y-1">
                {groupedRows.map(({ row, globalIndex, date: d, group, showGroup }) => {
                  return (
                    <StudentActivityRow
                      key={row.kind === "practice" ? row.attempt.id : row.response.id}
                      groupedRow={{ row, globalIndex, date: d, group, showGroup }}
                      unitTitle={unitTitle}
                      formatDuration={formatDuration}
                    />
                  );
                })}
              </div>

              {/* Pagination */}
              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">
                    Page {historyPage} of {historyTotalPages} · {unifiedRows.length} total
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage((p) => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={historyPage === historyTotalPages}
                      onClick={() => setHistoryPage((p) => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
