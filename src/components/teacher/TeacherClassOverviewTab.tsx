import { useMemo } from "react";
import { PredictiveInsights } from "@/components/tutor/progress";
import { ChapterSelector } from "@/components/teacher/ChapterSelector";
import { skillMapFromCategoryBreakdown } from "@/lib/predictiveFromMastery";
import { LiveSessionPanel } from "@/components/teacher/LiveSessionPanel";
import { cn } from "@/lib/utils";
import { CourseLevel } from "@/data/units";
import {
  AlertTriangle,
  Award,
  CheckCircle,
  Clock,
  Target,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import type { ClassSummaryStats } from "@/services/api/teacher";
import type { ClassStudentRow, TeacherClassRow } from "@/hooks/useTeacherDashboardData";

interface TeacherClassOverviewTabProps {
  chapterFilter: string;
  onChapterFilterChange: (v: string) => void;
  selectedClassId: string;
  selectedClass: TeacherClassRow | undefined;
  classStats: ClassSummaryStats | undefined;
  enrolledStudents: ClassStudentRow[];
  classMastery: number;
  masteredStudents: ClassStudentRow[];
  developingStudents: ClassStudentRow[];
  atRiskStudents: ClassStudentRow[];
  onStudentClick: (studentId: string) => void;
}

export function TeacherClassOverviewTab({
  chapterFilter,
  onChapterFilterChange,
  selectedClassId,
  selectedClass,
  classStats,
  enrolledStudents,
  classMastery,
  masteredStudents,
  developingStudents,
  atRiskStudents,
  onStudentClick,
}: TeacherClassOverviewTabProps) {
  const classInsightSkillMap = useMemo(() => {
    const cb = classStats?.category_breakdown;
    const n = classStats?.total_students ?? enrolledStudents.length;
    if (!cb && enrolledStudents.length === 0) return [];
    if (cb) return skillMapFromCategoryBreakdown(cb, n);
    return skillMapFromCategoryBreakdown(
      {
        conceptual: 0,
        procedural: 0,
        computational: 0,
      },
      n,
    );
  }, [classStats, enrolledStudents.length]);

  return (
    <TabsContent value="class" className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Class overview</h2>
        <p className="text-sm text-muted-foreground">
          Create and manage your classes, then pick analytics by class in the header.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="max-w-xs">
            <ChapterSelector
              value={chapterFilter}
              onValueChange={onChapterFilterChange}
              courseLevel={selectedClass?.grade_level as CourseLevel | undefined}
              label="Filter by Chapter"
              showAllOption
            />
          </div>
        </div>
        {selectedClassId !== "all" && (
          <LiveSessionPanel
            classId={selectedClassId}
            totalStudents={classStats?.total_students ?? enrolledStudents.length}
            onStudentClick={onStudentClick}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 shadow-sm">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Class Avg Mastery</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900">
                {(classStats || enrolledStudents.length > 0) ? `${classMastery}%` : "–"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 shadow-sm">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900">
                {classStats?.total_students ?? enrolledStudents.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Mastered (≥75%)</p>
              <p className="text-2xl font-bold tabular-nums text-emerald-600">{masteredStudents.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">At Risk (&lt;50%)</p>
              <p className="text-2xl font-bold tabular-nums text-red-600">
                {classStats?.at_risk_count ?? atRiskStudents.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mastery Distribution</CardTitle>
            <CardDescription>Where your class stands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Mastered (75–100%)", count: masteredStudents.length, color: "bg-success" },
                { label: "Developing (50–74%)", count: developingStudents.length, color: "bg-warning" },
                { label: "At Risk (0–49%)", count: atRiskStudents.length, color: "bg-destructive" },
              ].map((bucket) => (
                <div key={bucket.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground font-medium">{bucket.label}</span>
                    <span className="text-muted-foreground">{bucket.count} students</span>
                  </div>
                  <div className="h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", bucket.color)}
                      style={{ width: `${enrolledStudents.length > 0 ? (bucket.count / enrolledStudents.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Common Weak Areas
            </CardTitle>
            <CardDescription>Topics where multiple students struggle</CardDescription>
          </CardHeader>
          <CardContent>
            <WeakAreasBody
              classStats={classStats}
              selectedClassId={selectedClassId}
              enrolledStudents={enrolledStudents}
            />
          </CardContent>
        </Card>
      </div>

      {enrolledStudents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Predicted AP Readiness
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const readyCount = enrolledStudents.filter((s) => s.mastery >= 75).length;
                const readiness = Math.round((readyCount / enrolledStudents.length) * 100);
                return (
                  <div>
                    <div className={cn(
                      "text-3xl font-bold",
                      readiness >= 70 ? "text-success" : readiness >= 40 ? "text-warning" : "text-destructive",
                    )}
                    >
                      {readiness}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {readyCount}/{enrolledStudents.length} students at mastery ≥75%
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Est. Time-to-Mastery
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const gap = Math.max(0, 75 - classMastery);
                const sessionsNeeded = gap > 0 ? Math.ceil(gap / 5) : 0;
                return (
                  <div>
                    <div className="text-3xl font-bold text-foreground">
                      {sessionsNeeded === 0 ? "✓" : `~${sessionsNeeded}`}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sessionsNeeded === 0
                        ? "Class average already at mastery"
                        : "sessions to reach 75% avg mastery"}
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      <PredictiveInsights
        masteryScore={classMastery}
        skillMap={classInsightSkillMap}
        recentAttempts={[]}
        errorPatterns={[]}
        studentName="Class average"
      />
    </TabsContent>
  );
}

function WeakAreasBody({
  classStats,
  selectedClassId,
  enrolledStudents,
}: {
  classStats: ClassSummaryStats | undefined;
  selectedClassId: string;
  enrolledStudents: ClassStudentRow[];
}) {
  if (classStats && selectedClassId !== "all") {
    const cb = classStats.category_breakdown;
    const rows = [
      { key: "conceptual", label: "Conceptual", v: cb.conceptual },
      { key: "procedural", label: "Procedural", v: cb.procedural },
      { key: "computational", label: "Computational", v: cb.computational },
    ].filter((r) => r.v < 0.5);
    if (rows.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No sub-category below 50% — strong class-wide understanding.
        </p>
      );
    }
    return (
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-foreground font-medium">{r.label}</span>
              <span className="text-muted-foreground">{Math.round(r.v * 100)}% avg</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-warning transition-all"
                style={{ width: `${r.v * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const topicCounts: Record<string, number> = {};
  enrolledStudents.forEach((s) => s.weakTopics.forEach((t) => {
    topicCounts[t] = (topicCounts[t] || 0) + 1;
  }));
  const sorted = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">No weak areas detected.</p>;
  }
  return (
    <div className="space-y-3">
      {sorted.map(([topic, count]) => (
        <div key={topic}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="capitalize text-foreground font-medium">{topic.replace(/_/g, " ")}</span>
            <span className="text-muted-foreground">{count}/{enrolledStudents.length} students</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-warning transition-all"
              style={{ width: `${(count / enrolledStudents.length) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
