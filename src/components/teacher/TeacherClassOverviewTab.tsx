import { PredictiveInsights } from "@/components/tutor/progress";
import { ChapterSelector } from "@/components/teacher/ChapterSelector";
import { LiveSessionPanel } from "@/components/teacher/LiveSessionPanel";
import { SessionHistory } from "@/components/teacher/SessionHistory";
import { cn } from "@/lib/utils";
import { CourseLevel } from "@/data/units";
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle,
  Clock,
  Settings,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import type { StudentCognitiveProfile } from "@/types/cognitive";
import type { ClassSummaryStats } from "@/services/api/teacher";
import type { ClassStudentRow, TeacherClassRow } from "@/hooks/useTeacherDashboardData";

interface TeacherClassOverviewTabProps {
  chapterFilter: string;
  onChapterFilterChange: (v: string) => void;
  selectedClassId: string;
  selectedClass: TeacherClassRow | undefined;
  classStats: ClassSummaryStats | undefined;
  displayStudents: ClassStudentRow[];
  classMastery: number;
  masteredStudents: ClassStudentRow[];
  developingStudents: ClassStudentRow[];
  atRiskStudents: ClassStudentRow[];
  onStudentClick: (studentId: string) => void;
  profile: StudentCognitiveProfile;
  onOpenManageClasses: () => void;
}

export function TeacherClassOverviewTab({
  chapterFilter,
  onChapterFilterChange,
  selectedClassId,
  selectedClass,
  classStats,
  displayStudents,
  classMastery,
  masteredStudents,
  developingStudents,
  atRiskStudents,
  onStudentClick,
  profile,
  onOpenManageClasses,
}: TeacherClassOverviewTabProps) {
  return (
    <TabsContent value="class" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Class overview</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage your classes, then pick analytics by class in the header.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 gap-2"
          onClick={onOpenManageClasses}
        >
          <Settings className="w-4 h-4" />
          Manage classes
        </Button>
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
            totalStudents={classStats?.total_students ?? displayStudents.length}
            onStudentClick={onStudentClick}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Class Avg Mastery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(classStats || displayStudents.length > 0) ? `${classMastery}%` : "–"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {classStats?.total_students ?? displayStudents.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              Mastered (≥75%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{masteredStudents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              At Risk (&lt;50%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {classStats?.at_risk_count ?? atRiskStudents.length}
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
                      style={{ width: `${displayStudents.length > 0 ? (bucket.count / displayStudents.length) * 100 : 0}%` }}
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
              displayStudents={displayStudents}
            />
          </CardContent>
        </Card>
      </div>

      {selectedClassId !== "all" && (
        <SessionHistory classId={selectedClassId} />
      )}

      {displayStudents.length > 0 && (
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
                const readyCount = displayStudents.filter((s) => s.mastery >= 75).length;
                const readiness = Math.round((readyCount / displayStudents.length) * 100);
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
                      {readyCount}/{displayStudents.length} students at mastery ≥75%
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
        skillMap={profile.skillMap}
        recentAttempts={profile.recentAttempts}
        errorPatterns={profile.errorPatterns}
        studentName="Class Average"
      />
    </TabsContent>
  );
}

function WeakAreasBody({
  classStats,
  selectedClassId,
  displayStudents,
}: {
  classStats: ClassSummaryStats | undefined;
  selectedClassId: string;
  displayStudents: ClassStudentRow[];
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
  displayStudents.forEach((s) => s.weakTopics.forEach((t) => {
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
            <span className="text-muted-foreground">{count}/{displayStudents.length} students</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-warning transition-all"
              style={{ width: `${(count / displayStudents.length) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
