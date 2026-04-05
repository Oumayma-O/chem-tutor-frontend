import type { ReactNode } from "react";
import { format } from "date-fns";
import { SkillRadarChart, LearningTimeline, PredictiveInsights } from "@/components/tutor/progress";
import { ChapterSelector } from "@/components/teacher/ChapterSelector";
import { cn } from "@/lib/utils";
import { CourseLevel } from "@/data/units";
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
import type { StudentCognitiveProfile } from "@/types/cognitive";
import type { ClassStudentRow, TeacherClassRow } from "@/hooks/useTeacherDashboardData";

interface TeacherStudentsTabProps {
  selectedClassId: string;
  selectedClass: TeacherClassRow | undefined;
  loadingStudents: boolean;
  displayStudents: ClassStudentRow[];
  selectedStudent: string | null;
  onSelectStudent: (id: string) => void;
  profile: StudentCognitiveProfile;
  analyticsDate: Date | undefined;
  onAnalyticsDateChange: (d: Date | undefined) => void;
  analyticsChapter: string;
  onAnalyticsChapterChange: (v: string) => void;
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
  profile,
  analyticsDate,
  onAnalyticsDateChange,
  analyticsChapter,
  onAnalyticsChapterChange,
  analyticsMode,
  onAnalyticsModeChange,
}: TeacherStudentsTabProps) {
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
              displayStudents={displayStudents}
              profile={profile}
            />
          )}
        </div>
      </div>
    </TabsContent>
  );
}

function StudentDetailPanel({
  studentId,
  displayStudents,
  profile,
}: {
  studentId: string;
  displayStudents: ClassStudentRow[];
  profile: StudentCognitiveProfile;
}) {
  const student = displayStudents.find((s) => s.id === studentId);
  if (!student) return null;

  const suggestedActions: { label: string; icon: ReactNode; variant: "default" | "secondary" | "outline" }[] = [];
  if (student.mastery < 50) {
    suggestedActions.push(
      { label: "Assign Worked Examples", icon: <BookOpen className="w-3.5 h-3.5" />, variant: "default" },
      { label: "Recommend Simulation", icon: <Target className="w-3.5 h-3.5" />, variant: "secondary" },
    );
  } else if (student.mastery < 75) {
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {student.name}
          </CardTitle>
          <CardDescription>Individual performance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <span className="text-xs text-muted-foreground">Mastery</span>
              <div className={cn(
                "text-2xl font-bold",
                student.mastery >= 75 ? "text-success" : student.mastery >= 50 ? "text-warning" : "text-destructive",
              )}
              >
                {student.mastery}%
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Topics</span>
              <div className="text-2xl font-bold">{student.problems}</div>
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

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
              <span className="text-xs font-medium text-success">Strengths</span>
              {student.weakTopics.length === 0 ? (
                <p className="text-sm text-foreground mt-1">All areas strong</p>
              ) : (
                <p className="text-sm text-foreground mt-1">
                  {["formula_selection", "substitution", "calculation"]
                    .filter((s) => !student.weakTopics.includes(s))
                    .slice(0, 2)
                    .map((s) => s.replace(/_/g, " "))
                    .join(", ") || "Building foundations"}
                </p>
              )}
            </div>
            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <span className="text-xs font-medium text-destructive">Weak Areas</span>
              <p className="text-sm text-foreground mt-1">
                {student.weakTopics.length > 0
                  ? student.weakTopics.map((t) => t.replace(/_/g, " ")).join(", ")
                  : "None identified"}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Skill Mastery Map</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillRadarChart skills={profile.skillMap} size={280} />
        </CardContent>
      </Card>

      <PredictiveInsights
        masteryScore={student.mastery}
        skillMap={profile.skillMap}
        recentAttempts={profile.recentAttempts}
        errorPatterns={profile.errorPatterns}
        studentName={student.name}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Problems</CardTitle>
        </CardHeader>
        <CardContent>
          <LearningTimeline attempts={profile.recentAttempts} />
        </CardContent>
      </Card>
    </>
  );
}
