import type { ReactNode } from "react";
import { useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { SkillRadarChart } from "@/components/tutor/progress";
import { ChapterSelector } from "@/components/teacher/ChapterSelector";
import { cn } from "@/lib/utils";
import { CourseLevel } from "@/data/units";
import { useUnits } from "@/hooks/useUnits";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Award,
  BookOpen,
  CheckCircle,
  User,
  CalendarIcon,
  CheckCircle2,
  XCircle,
  Layers,
  ClipboardCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  getStudentAnalytics,
  getExitTicketResults,
  type StudentAttemptOut,
  type ExitTicketConfig,
  type ExitTicketResponseItem,
} from "@/services/api/teacher";

interface TeacherStudentsTabProps {
  selectedClassId: string;
  selectedClass: TeacherClassRow | undefined;
  loadingStudents: boolean;
  displayStudents: ClassStudentRow[];
  selectedStudent: string | null;
  onSelectStudent: (id: string) => void;
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
  displayStudents,
  selectedStudent,
  onSelectStudent,
  analyticsDate,
  onAnalyticsDateChange,
  analyticsChapter,
  onAnalyticsChapterChange,
  analyticsLesson,
  onAnalyticsLessonChange,
  analyticsMode,
  onAnalyticsModeChange,
}: TeacherStudentsTabProps) {
  const { units } = useUnits();
  const selectedChapterForFilter = analyticsChapter !== "all" ? units.find((u) => u.id === analyticsChapter) : undefined;
  const lessonTitles = selectedChapterForFilter?.lesson_titles ?? [];

  return (
    <TabsContent value="students" className="space-y-6">
      {selectedClassId !== "all" && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-secondary/30 rounded-lg">
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

          <ChapterSelector
            value={analyticsChapter}
            onValueChange={onAnalyticsChapterChange}
            courseLevel={selectedClass?.grade_level as CourseLevel | undefined}
            label=""
            showAllOption
          />

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

          {lessonTitles.length > 0 && (
            <Select
              value={analyticsLesson === "all" ? "all" : String(analyticsLesson)}
              onValueChange={(v) => onAnalyticsLessonChange(v === "all" ? "all" : Number(v))}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
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
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Students ({displayStudents.length})
          </h3>
          {loadingStudents && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loadingStudents && displayStudents.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">
              {selectedClassId === "all" ? "Select a class to view students." : "No students enrolled yet."}
            </p>
          )}
          {displayStudents.map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => onSelectStudent(student.id)}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-all",
                selectedStudent === student.id
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
            </button>
          ))}
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
              displayStudents={displayStudents}
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

function sameCalendarDay(d: Date, iso: string): boolean {
  const t = new Date(iso);
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

type StudentAnalyticsMode = "all" | "practice" | "exit-ticket";

function StudentDetailPanel({
  studentId,
  classroomId,
  displayStudents,
  analyticsChapter,
  analyticsLesson,
  analyticsDate,
  analyticsMode,
}: {
  studentId: string;
  classroomId: string;
  displayStudents: ClassStudentRow[];
  analyticsChapter: string;
  analyticsLesson: number | "all";
  analyticsDate: Date | undefined;
  analyticsMode: StudentAnalyticsMode;
}) {
  const student = displayStudents.find((s) => s.id === studentId);
  const { units } = useUnits();
  const chapterFilter = analyticsChapter !== "all" ? analyticsChapter : undefined;

  const needPractice = analyticsMode === "practice" || analyticsMode === "all";
  const needExit = analyticsMode === "exit-ticket" || analyticsMode === "all";

  const { data: analytics, isLoading: practiceLoading } = useQuery({
    queryKey: [
      "teacher",
      "student-analytics",
      classroomId,
      studentId,
      chapterFilter ?? "all",
      analyticsLesson,
    ],
    queryFn: () => getStudentAnalytics(classroomId, studentId, chapterFilter),
    enabled: Boolean(classroomId && studentId && classroomId !== "all" && needPractice),
    staleTime: 30_000,
  });

  const { data: exitData, isLoading: exitLoading } = useQuery({
    queryKey: ["teacher", "exit-tickets", classroomId, "student-panel"],
    queryFn: () => getExitTicketResults(classroomId, 1, 50),
    enabled: Boolean(classroomId && classroomId !== "all" && needExit),
    staleTime: 30_000,
  });

  const isLoading = (needPractice && practiceLoading) || (needExit && exitLoading);

  const unitTitle = (uid: string) => units.find((u) => u.id === uid)?.title ?? uid;

  const skillMap: SkillMastery[] = analytics
    ? [
        { skillId: "conceptual", skillName: "Conceptual", category: "reaction_concepts" as const, score: Math.round((analytics.category_scores.conceptual ?? 0) * 100), status: analytics.category_scores.conceptual >= 0.75 ? "mastered" as const : analytics.category_scores.conceptual >= 0.5 ? "developing" as const : "at_risk" as const, lastUpdated: Date.now(), problemCount: analytics.lessons_with_data },
        { skillId: "procedural", skillName: "Procedural", category: "rate_laws" as const, score: Math.round((analytics.category_scores.procedural ?? 0) * 100), status: analytics.category_scores.procedural >= 0.75 ? "mastered" as const : analytics.category_scores.procedural >= 0.5 ? "developing" as const : "at_risk" as const, lastUpdated: Date.now(), problemCount: analytics.lessons_with_data },
        { skillId: "computational", skillName: "Computational", category: "unit_conversion" as const, score: Math.round((analytics.category_scores.computational ?? 0) * 100), status: analytics.category_scores.computational >= 0.75 ? "mastered" as const : analytics.category_scores.computational >= 0.5 ? "developing" as const : "at_risk" as const, lastUpdated: Date.now(), problemCount: analytics.lessons_with_data },
      ]
    : [];

  const masteryPct = analytics ? Math.round(analytics.overall_mastery * 100) : (student?.mastery ?? 0);

  const attempts = analytics?.recent_attempts ?? [];
  const finishedPractice = useMemo(() => {
    let f = attempts.filter((a) => a.is_complete && a.score != null);
    if (analyticsDate) {
      f = f.filter((a) => sameCalendarDay(analyticsDate, a.started_at));
    }
    if (analyticsLesson !== "all") {
      f = f.filter((a) => a.lesson_index === analyticsLesson);
    }
    return f;
  }, [attempts, analyticsDate, analyticsLesson]);

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

  /** Per-chapter averages + headline depend on mode (practice vs exit ticket vs both). */
  const { chapterSummary, headlineScorePct, finishedCount, unifiedRows } = useMemo(() => {
    if (analyticsMode === "practice") {
      const byUnit: Record<string, number[]> = {};
      for (const a of finishedPractice) {
        (byUnit[a.unit_id] ??= []).push(a.score!);
      }
      const summary: { unitId: string; title: string; avg: number; count: number }[] = [];
      for (const [uid, scores] of Object.entries(byUnit)) {
        if (scores.length > 0) {
          summary.push({
            unitId: uid,
            title: unitTitle(uid),
            avg: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100),
            count: scores.length,
          });
        }
      }
      summary.sort((a, b) => b.avg - a.avg);
      const avgAcross =
        !chapterFilter && summary.length > 0
          ? Math.round(summary.reduce((s, ch) => s + ch.avg, 0) / summary.length)
          : null;
      const headline = chapterFilter ? masteryPct : (avgAcross ?? masteryPct);
      const sorted = [...finishedPractice].sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
      );
      const rows = sorted.map((a) => ({ kind: "practice" as const, attempt: a }));
      return {
        chapterSummary: !chapterFilter ? summary : [],
        headlineScorePct: headline,
        finishedCount: finishedPractice.length,
        unifiedRows: chapterFilter ? rows : rows.slice(0, 5),
      };
    }

    if (analyticsMode === "exit-ticket") {
      const byUnit: Record<string, number[]> = {};
      for (const { response, ticket } of exitForStudent) {
        if (response.score == null) continue;
        (byUnit[ticket.unit_id] ??= []).push(response.score);
      }
      const summary: { unitId: string; title: string; avg: number; count: number }[] = [];
      for (const [uid, scores] of Object.entries(byUnit)) {
        summary.push({
          unitId: uid,
          title: unitTitle(uid),
          avg: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
          count: scores.length,
        });
      }
      summary.sort((a, b) => b.avg - a.avg);
      const scores = exitForStudent.map((x) => x.response.score).filter((s): s is number => s != null);
      const headline =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : (student?.mastery ?? 0);
      const avgAcross =
        !chapterFilter && summary.length > 0
          ? Math.round(summary.reduce((s, ch) => s + ch.avg, 0) / summary.length)
          : null;
      const headlineFinal = chapterFilter ? headline : (avgAcross ?? headline);
      const sorted = [...exitForStudent].sort(
        (a, b) =>
          new Date(b.response.submitted_at).getTime() - new Date(a.response.submitted_at).getTime(),
      );
      const rows = sorted.map((x) => ({ kind: "exit" as const, ...x }));
      return {
        chapterSummary: !chapterFilter ? summary : [],
        headlineScorePct: headlineFinal,
        finishedCount: exitForStudent.filter((x) => x.response.score != null).length,
        unifiedRows: chapterFilter ? rows : rows.slice(0, 5),
      };
    }

    // all — merge practice + exit ticket submissions
    const byUnit: Record<string, number[]> = {};
    for (const a of finishedPractice) {
      (byUnit[a.unit_id] ??= []).push(a.score! * 100);
    }
    for (const { response, ticket } of exitForStudent) {
      if (response.score != null) {
        (byUnit[ticket.unit_id] ??= []).push(response.score);
      }
    }
    const summary: { unitId: string; title: string; avg: number; count: number }[] = [];
    for (const [uid, vals] of Object.entries(byUnit)) {
      if (vals.length > 0) {
        summary.push({
          unitId: uid,
          title: unitTitle(uid),
          avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
          count: vals.length,
        });
      }
    }
    summary.sort((a, b) => b.avg - a.avg);
    const allScores: number[] = [
      ...finishedPractice.map((a) => a.score! * 100),
      ...exitForStudent.map((x) => x.response.score).filter((s): s is number => s != null),
    ];
    const avgAcross =
      !chapterFilter && summary.length > 0
        ? Math.round(summary.reduce((s, ch) => s + ch.avg, 0) / summary.length)
        : null;
    const headlineFlat =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : masteryPct;
    const headline =
      chapterFilter && allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : chapterFilter
          ? headlineFlat
          : (avgAcross ?? headlineFlat);

    const merged: (
      | { kind: "practice"; attempt: StudentAttemptOut }
      | { kind: "exit"; response: ExitTicketResponseItem; ticket: ExitTicketConfig }
    )[] = [
      ...finishedPractice.map((attempt) => ({ kind: "practice" as const, attempt })),
      ...exitForStudent.map(({ response, ticket }) => ({ kind: "exit" as const, response, ticket })),
    ];
    merged.sort((x, y) => {
      const tx = x.kind === "practice" ? x.attempt.started_at : x.response.submitted_at;
      const ty = y.kind === "practice" ? y.attempt.started_at : y.response.submitted_at;
      return new Date(ty).getTime() - new Date(tx).getTime();
    });
    const rowsOut = chapterFilter ? merged : merged.slice(0, 5);
    return {
      chapterSummary: !chapterFilter ? summary : [],
      headlineScorePct: headline,
      finishedCount: finishedPractice.length + exitForStudent.filter((x) => x.response.score != null).length,
      unifiedRows: rowsOut,
    };
  }, [
    analyticsMode,
    finishedPractice,
    exitForStudent,
    chapterFilter,
    masteryPct,
    student?.mastery,
    units,
  ]);

  const actionMastery = headlineScorePct;
  const suggestedActions: { label: string; icon: ReactNode; variant: "default" | "secondary" | "outline" }[] = [];
  if (actionMastery < 50) {
    suggestedActions.push(
      { label: "Assign Worked Examples", icon: <BookOpen className="w-3.5 h-3.5" />, variant: "default" },
      { label: "Recommend Simulation", icon: <Target className="w-3.5 h-3.5" />, variant: "secondary" },
    );
  } else if (actionMastery < 75) {
    suggestedActions.push(
      { label: "Targeted Practice", icon: <Target className="w-3.5 h-3.5" />, variant: "default" },
      { label: "Issue Exit Ticket", icon: <CheckCircle className="w-3.5 h-3.5" />, variant: "secondary" },
    );
  } else {
    suggestedActions.push(
      { label: "Challenge Problems", icon: <Award className="w-3.5 h-3.5" />, variant: "default" },
      { label: "Issue Exit Ticket", icon: <CheckCircle className="w-3.5 h-3.5" />, variant: "outline" },
    );
  }

  if (!student) return null;

  const modeLabel =
    analyticsMode === "all" ? "All Modes" : analyticsMode === "practice" ? "Practice" : "Exit Ticket";
  const chapterLabel = chapterFilter ? unitTitle(chapterFilter) : "All Chapters";
  const lessonLabel =
    analyticsLesson === "all"
      ? "All Lessons"
      : (() => {
          const chapter = chapterFilter ? units.find((u) => u.id === chapterFilter) : undefined;
          const title = chapter?.lesson_titles?.[analyticsLesson];
          return title ? `L${analyticsLesson + 1} ${title}` : `L${analyticsLesson + 1}`;
        })();
  const dateLabel = analyticsDate ? format(analyticsDate, "MMM d, yyyy") : "All Dates";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {student.name}
          </CardTitle>
          <CardDescription>
            {(() => {
              const parts = [
                chapterFilter ? `Scope: ${unitTitle(chapterFilter)}.` : null,
                analyticsMode === "practice" && "Practice problems only.",
                analyticsMode === "exit-ticket" && "Exit ticket submissions only.",
                analyticsMode === "all" && "Practice + exit tickets combined.",
                analyticsDate && `Date: ${format(analyticsDate, "MMM d, yyyy")}.`,
              ].filter(Boolean) as string[];
              return parts.length > 0 ? parts.join(" ") : "Overview for the selected class and filters.";
            })()}
          </CardDescription>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <Badge variant="outline" className="text-[10px]">Mode: {modeLabel}</Badge>
            <Badge variant="outline" className="text-[10px]">Chapter: {chapterLabel}</Badge>
            <Badge variant="outline" className="text-[10px]">Lesson: {lessonLabel}</Badge>
            <Badge variant="outline" className="text-[10px]">Date: {dateLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading analytics…</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-xs text-muted-foreground">
                    {chapterFilter
                      ? "Chapter score"
                      : analyticsMode === "exit-ticket"
                        ? "Avg score (units w/ submissions)"
                        : "Avg score (chapters w/ attempts)"}
                  </span>
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      headlineScorePct >= 75 ? "text-success" : headlineScorePct >= 50 ? "text-warning" : "text-destructive",
                    )}
                  >
                    {headlineScorePct}%
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    {analyticsMode === "exit-ticket"
                      ? chapterFilter
                        ? "Submissions (chapter)"
                        : "Submissions in scope"
                      : analyticsMode === "all"
                        ? chapterFilter
                          ? "Scored items (chapter)"
                          : "Scored items in scope"
                        : chapterFilter
                          ? "Attempts (chapter)"
                          : "Attempts in sample"}
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
                            className={cn("h-full rounded-full", ch.avg >= 75 ? "bg-success" : ch.avg >= 50 ? "bg-yellow-400" : "bg-destructive")}
                            style={{ width: `${ch.avg}%` }}
                          />
                        </div>
                        <span className={cn("text-xs font-semibold w-9 text-right", ch.avg >= 75 ? "text-success" : ch.avg >= 50 ? "text-warning" : "text-destructive")}>
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
                  {student.weakTopics.length === 0 ? (
                    <p className="text-sm text-foreground mt-1">All areas strong</p>
                  ) : (
                    <p className="text-sm text-foreground mt-1">
                      {["conceptual", "procedural", "computational"]
                        .filter((s) => !student.weakTopics.includes(s))
                        .slice(0, 2)
                        .join(", ") || "Building foundations"}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <span className="text-xs font-medium text-destructive">Weak Areas</span>
                  <p className="text-sm text-foreground mt-1">
                    {student.weakTopics.length > 0 ? student.weakTopics.join(", ") : "None identified"}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Actions</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {suggestedActions.map((action, i) => (
                    <Button key={i} variant={action.variant} size="sm" className="gap-1.5 text-xs h-8">
                      {action.icon}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {analyticsMode === "exit-ticket"
              ? chapterFilter
                ? `Exit ticket submissions — ${unitTitle(chapterFilter)}`
                : "Recent exit ticket submissions"
              : analyticsMode === "all"
                ? chapterFilter
                  ? `Activity — ${unitTitle(chapterFilter)}`
                  : "Recent activity (practice + exit tickets)"
                : chapterFilter
                  ? `Attempts — ${unitTitle(chapterFilter)}`
                  : "Last 5 attempts (all chapters)"}
          </CardTitle>
          {!chapterFilter && (
            <CardDescription className="text-xs">
              {analyticsMode === "exit-ticket"
                ? "Newest first; scores from class exit tickets."
                : analyticsMode === "all"
                  ? "Newest first; practice and exit ticket rows mixed. Unfinished practice is omitted."
                  : "Newest first; chapter on each row. Unfinished practice (not submitted) is omitted."}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {unifiedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {analyticsMode === "exit-ticket"
                ? chapterFilter
                  ? "No exit ticket submissions for this chapter in this class yet."
                  : "No exit ticket submissions for this class yet."
                : analyticsMode === "all"
                  ? "No scored practice or exit ticket activity in scope yet."
                  : chapterFilter
                    ? "No submitted attempts for this chapter yet."
                    : "No submitted attempts in the recent sample yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {unifiedRows.map((row, i) => {
                if (row.kind === "practice") {
                  const a = row.attempt;
                  const scorePct = a.score != null ? Math.round(a.score * 100) : null;
                  const passed = scorePct != null && scorePct >= 80;
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 text-xs">
                      <span className="text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      {passed
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                        : <XCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground font-medium truncate block">{unitTitle(a.unit_id)}</span>
                        <span className="text-muted-foreground">
                          Practice · Lesson {a.lesson_index + 1} · {format(new Date(a.started_at), "MMM d")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Layers className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">L{a.level}</span>
                      </div>
                      <span className={cn("font-semibold w-10 text-right", scorePct == null ? "text-muted-foreground" : passed ? "text-success" : "text-yellow-600")}>
                        {scorePct != null ? `${scorePct}%` : "—"}
                      </span>
                    </div>
                  );
                }
                const { response, ticket } = row;
                const scorePct = response.score != null ? Math.round(response.score) : null;
                const passed = scorePct != null && scorePct >= 80;
                return (
                  <div key={response.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 text-xs">
                    <span className="text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    {passed
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground font-medium truncate block">{unitTitle(ticket.unit_id)}</span>
                      <span className="text-muted-foreground">
                        Exit ticket · Lesson {ticket.lesson_index + 1} · {format(new Date(response.submitted_at), "MMM d")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ClipboardCheck className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">ET</span>
                    </div>
                    <span className={cn("font-semibold w-10 text-right", scorePct == null ? "text-muted-foreground" : passed ? "text-success" : "text-yellow-600")}>
                      {scorePct != null ? `${scorePct}%` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
