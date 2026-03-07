import { useState, useEffect, useCallback } from "react";
import { StudentCognitiveProfile, ExitTicketResult } from "@/types/cognitive";
import { SkillRadarChart } from "./SkillRadarChart";
import { LearningTimeline } from "./LearningTimeline";
import { PredictiveInsights } from "./PredictiveInsights";
import { ExitTicketConfigPanel } from "@/components/teacher/ExitTicketConfigPanel";
import { ExitTicketAnalyticsPanel } from "@/components/teacher/ExitTicketAnalyticsPanel";
import { TimedModeControls } from "@/components/teacher/TimedModeControls";
import { LiveSessionPanel } from "@/components/teacher/LiveSessionPanel";
import { UnitSelector } from "@/components/teacher/UnitSelector";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { CourseLevel } from "@/data/units";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Brain, 
  Target, 
  AlertTriangle,
  BookOpen,
  Award,
  ArrowLeft,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  User,
  BarChart3,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProblemAttempt } from "@/types/cognitive";

interface TeacherDashboardPageProps {
  profile: StudentCognitiveProfile;
  exitTicketResults: ExitTicketResult[];
  onBack: () => void;
}

// Mock class data for demonstration (used as fallback when no real data)
const MOCK_STUDENTS = [
  { id: "s1", name: "Alex Chen", mastery: 82, trend: "up" as const, problems: 12, weakTopics: ["unit_conversion"], lastActive: Date.now() - 3600000 },
  { id: "s2", name: "Maria Santos", mastery: 65, trend: "stable" as const, problems: 8, weakTopics: ["rate_laws", "variable_isolation"], lastActive: Date.now() - 7200000 },
  { id: "s3", name: "James Wilson", mastery: 45, trend: "down" as const, problems: 15, weakTopics: ["reaction_concepts", "rate_laws", "unit_conversion"], lastActive: Date.now() - 86400000 },
  { id: "s4", name: "Priya Patel", mastery: 91, trend: "up" as const, problems: 10, weakTopics: [], lastActive: Date.now() - 1800000 },
  { id: "s5", name: "Ethan Brown", mastery: 58, trend: "up" as const, problems: 6, weakTopics: ["variable_isolation"], lastActive: Date.now() - 43200000 },
  { id: "s6", name: "Sofia Lopez", mastery: 73, trend: "stable" as const, problems: 9, weakTopics: ["unit_conversion"], lastActive: Date.now() - 14400000 },
];

const STANDARDS = [
  { id: "ngss-hs-ps1-5", name: "NGSS HS-PS1-5", description: "Apply scientific principles to explain reaction rates", category: "NGSS" },
  { id: "ngss-hs-ps1-6", name: "NGSS HS-PS1-6", description: "Design and refine systems using reaction kinetics", category: "NGSS" },
  { id: "ca-chem-8a", name: "CA Chem 8a", description: "Reaction rates and rate laws", category: "California" },
  { id: "ca-chem-8b", name: "CA Chem 8b", description: "Factors affecting reaction rates", category: "California" },
];

interface TeacherClass {
  id: string;
  name: string;
  grade_level: string | null;
  subject: string;
  class_code: string;
  timed_mode_active: boolean;
  timed_practice_minutes: number | null;
  timed_started_at: string | null;
  active_unit_id: string | null;
}

interface ClassStudent {
  id: string;
  name: string;
  mastery: number;
  trend: "up" | "down" | "stable";
  problems: number;
  weakTopics: string[];
  lastActive: number;
}

export function TeacherDashboardPage({ profile, exitTicketResults, onBack }: TeacherDashboardPageProps) {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [enrolledStudents, setEnrolledStudents] = useState<ClassStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [unitFilter, setUnitFilter] = useState("all");
  const growthTrend = calculateGrowthTrend(profile.recentAttempts);
  
  const fetchClasses = useCallback(async () => {
    const { data } = await supabase
      .from("classes")
      .select("id, name, grade_level, subject, class_code, timed_mode_active, timed_practice_minutes, timed_started_at, active_unit_id")
      .order("created_at", { ascending: false });
    if (data) setClasses(data as any);
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Fetch enrolled students when class changes
  useEffect(() => {
    if (selectedClassId === "all") {
      setEnrolledStudents([]);
      return;
    }
    setLoadingStudents(true);
    (async () => {
      const { data: enrollments } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("class_id", selectedClassId);

      if (enrollments && enrollments.length > 0) {
        const studentIds = enrollments.map((e) => e.student_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", studentIds);

        if (profiles) {
          setEnrolledStudents(
            profiles.map((p) => ({
              id: p.user_id,
              name: p.display_name,
              mastery: Math.round(Math.random() * 60 + 30), // placeholder until real mastery tracking
              trend: (["up", "stable", "down"] as const)[Math.floor(Math.random() * 3)],
              problems: Math.floor(Math.random() * 15 + 1),
              weakTopics: [],
              lastActive: Date.now() - Math.random() * 86400000,
            }))
          );
        }
      } else {
        setEnrolledStudents([]);
      }
      setLoadingStudents(false);
    })();
  }, [selectedClassId]);

  const errorDistribution = profile.errorPatterns.reduce((acc, pattern) => {
    acc[pattern.category] = pattern.count;
    return acc;
  }, {} as Record<string, number>);

  const standardsByCategory = STANDARDS.reduce((acc, std) => {
    if (!acc[std.category]) acc[std.category] = [];
    acc[std.category].push(std);
    return acc;
  }, {} as Record<string, typeof STANDARDS>);

  // Use real students when available, fallback to mock
  const displayStudents: ClassStudent[] = enrolledStudents.length > 0 ? enrolledStudents : MOCK_STUDENTS;
  const classMastery = Math.round(displayStudents.reduce((a, s) => a + s.mastery, 0) / displayStudents.length);
  const atRiskStudents = displayStudents.filter(s => s.mastery < 50);
  const masteredStudents = displayStudents.filter(s => s.mastery >= 75);
  const developingStudents = displayStudents.filter(s => s.mastery >= 50 && s.mastery < 75);

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">Teacher Analytics</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Class Selector */}
              {classes.length > 0 && (
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Live Data
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Class info banner */}
        {selectedClass && (
          <div className="mb-6 p-4 bg-secondary/40 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <span className="font-semibold text-foreground">{selectedClass.name}</span>
                {selectedClass.grade_level && (
                  <span className="text-sm text-muted-foreground ml-2">
                    · {selectedClass.grade_level}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Class Code</span>
                <span className="font-mono font-bold text-primary text-lg tracking-widest">{selectedClass.class_code}</span>
              </div>
              <Badge variant="secondary">{selectedClass.subject}</Badge>
            </div>
          </div>
        )}

        <Tabs defaultValue="class" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="class" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Class
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Students
            </TabsTrigger>
            <TabsTrigger value="standards">Standards</TabsTrigger>
            <TabsTrigger value="exit-tickets">Exit Tickets</TabsTrigger>
          </TabsList>

          {/* ===== CLASS TAB ===== */}
          <TabsContent value="class" className="space-y-6">
            {/* Chapter Filter + Live Session */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <div className="max-w-xs">
                  <UnitSelector
                    value={unitFilter}
                    onValueChange={setUnitFilter}
                    courseLevel={selectedClass?.grade_level as CourseLevel | undefined}
                    label="Filter by Unit"
                    showAllOption
                  />
                </div>
              </div>
              {selectedClassId !== "all" && (
                <LiveSessionPanel
                  classId={selectedClassId}
                  totalStudents={displayStudents.length}
                  onStudentClick={(studentId) => {
                    setSelectedStudent(studentId);
                  }}
                />
              )}
            </div>

            {/* Class Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Class Avg Mastery
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{classMastery}%</div>
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
                  <div className="text-3xl font-bold">{displayStudents.length}</div>
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
                  <div className="text-3xl font-bold text-destructive">{atRiskStudents.length}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Class Mastery Distribution */}
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
                    ].map(bucket => (
                      <div key={bucket.label}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-foreground font-medium">{bucket.label}</span>
                          <span className="text-muted-foreground">{bucket.count} students</span>
                        </div>
                        <div className="h-3 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", bucket.color)}
                            style={{ width: `${(bucket.count / displayStudents.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Common Weak Topics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Common Weak Areas
                  </CardTitle>
                  <CardDescription>Topics where multiple students struggle</CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const topicCounts: Record<string, number> = {};
                    displayStudents.forEach(s => s.weakTopics.forEach(t => {
                      topicCounts[t] = (topicCounts[t] || 0) + 1;
                    }));
                    const sorted = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);
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
                  })()}
                </CardContent>
              </Card>
            </div>

            {/* Class-level Predictive Insights */}
            <PredictiveInsights
              masteryScore={classMastery}
              skillMap={profile.skillMap}
              recentAttempts={profile.recentAttempts}
              errorPatterns={profile.errorPatterns}
              studentName="Class Average"
            />
          </TabsContent>

          {/* ===== STUDENTS TAB ===== */}
          <TabsContent value="students" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Student List */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Students ({displayStudents.length})
                </h3>
                {displayStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student.id)}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all",
                      selectedStudent === student.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/30"
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
                        {student.weakTopics.map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                            {t.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Student Detail Panel */}
              <div className="lg:col-span-2 space-y-6">
                {!selectedStudent ? (
                  <Card className="h-64 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Select a student to view detailed analytics</p>
                    </div>
                  </Card>
                ) : (
                  (() => {
                    const student = displayStudents.find(s => s.id === selectedStudent);
                    if (!student) return null;

                    // Suggested actions based on student performance
                    const suggestedActions: { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }[] = [];
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
                        {/* Student header */}
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
                                <div className={cn("text-2xl font-bold",
                                  student.mastery >= 75 ? "text-success" : student.mastery >= 50 ? "text-warning" : "text-destructive"
                                )}>
                                  {student.mastery}%
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Problems</span>
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

                            {/* Strengths & Weaknesses */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
                                <span className="text-xs font-medium text-success">Strengths</span>
                                {student.weakTopics.length === 0 ? (
                                  <p className="text-sm text-foreground mt-1">All areas strong</p>
                                ) : (
                                  <p className="text-sm text-foreground mt-1">
                                    {["formula_selection", "substitution", "calculation"]
                                      .filter(s => !student.weakTopics.includes(s))
                                      .slice(0, 2)
                                      .map(s => s.replace(/_/g, " "))
                                      .join(", ") || "Building foundations"}
                                  </p>
                                )}
                              </div>
                              <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                                <span className="text-xs font-medium text-destructive">Weak Areas</span>
                                <p className="text-sm text-foreground mt-1">
                                  {student.weakTopics.length > 0
                                    ? student.weakTopics.map(t => t.replace(/_/g, " ")).join(", ")
                                    : "None identified"}
                                </p>
                              </div>
                            </div>

                            {/* Suggested Actions */}
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

                        {/* Skill Radar */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Skill Mastery Map</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <SkillRadarChart skills={profile.skillMap} size={280} />
                          </CardContent>
                        </Card>

                        {/* Predictive Insights for selected student */}
                        <PredictiveInsights
                          masteryScore={student.mastery}
                          skillMap={profile.skillMap}
                          recentAttempts={profile.recentAttempts}
                          errorPatterns={profile.errorPatterns}
                          studentName={student.name}
                        />

                        {/* Recent Problems */}
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
                  })()
                )}
              </div>
            </div>
          </TabsContent>

          {/* ===== STANDARDS TAB ===== */}
          <TabsContent value="standards" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Standards Alignment Progress
                </CardTitle>
                <CardDescription>Track student progress against educational standards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {Object.entries(standardsByCategory).map(([category, standards]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                      {category} Standards
                    </h3>
                    <div className="grid gap-4">
                      {standards.map(standard => {
                        const progress = Math.random() * 100;
                        const status = progress >= 80 ? "mastered" : progress >= 50 ? "developing" : "at_risk";
                        return (
                          <div key={standard.id} className="p-4 bg-secondary/30 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-foreground">{standard.name}</h4>
                                <p className="text-sm text-muted-foreground">{standard.description}</p>
                              </div>
                              <Badge variant={status === "mastered" ? "default" : status === "developing" ? "secondary" : "destructive"}>
                                {Math.round(progress)}%
                              </Badge>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  status === "mastered" && "bg-success",
                                  status === "developing" && "bg-warning",
                                  status === "at_risk" && "bg-destructive"
                                )}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== EXIT TICKETS TAB ===== */}
          <TabsContent value="exit-tickets" className="space-y-6">
            {selectedClassId === "all" && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a class to configure exit tickets and timed mode.</p>
                </CardContent>
              </Card>
            )}

            {/* Active Timed Mode Status - show only when timed mode is running */}
            {selectedClassId !== "all" && selectedClass?.timed_mode_active && (
              <TimedModeControls
                classId={selectedClassId}
                isTimedActive={selectedClass.timed_mode_active}
                practiceDuration={selectedClass.timed_practice_minutes ?? undefined}
                startedAt={selectedClass.timed_started_at}
                activeChapterId={selectedClass.active_unit_id}
                onUpdate={fetchClasses}
              />
            )}

            {/* Unified Wizard - show only when timed mode is NOT active */}
            {selectedClassId !== "all" && !selectedClass?.timed_mode_active && (
              <ExitTicketConfigPanel
                classId={selectedClassId}
                courseLevel={selectedClass?.grade_level as CourseLevel | undefined}
                onTimedModeLaunched={fetchClasses}
              />
            )}

            {/* Results - Analytics Panel */}
            {selectedClassId !== "all" && (
              <ExitTicketAnalyticsPanel classId={selectedClassId} />
            )}

            {/* Legacy results (for standalone exit tickets without class) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Standalone Exit Ticket Results
                </CardTitle>
                <CardDescription>Results from student-initiated exit tickets</CardDescription>
              </CardHeader>
              <CardContent>
                {exitTicketResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No standalone exit ticket results yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {exitTicketResults.map((result, index) => (
                      <div key={index} className="p-4 bg-secondary/30 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {result.readyFlag ? (
                              <CheckCircle className="w-6 h-6 text-success" />
                            ) : (
                              <XCircle className="w-6 h-6 text-destructive" />
                            )}
                            <div>
                              <span className="font-semibold text-foreground">
                                {result.readyFlag ? "Ready" : "Not Ready"}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {new Date(result.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{Math.round(result.finalScore)}%</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Time:</span>
                            <span className="ml-2 font-medium">{result.timeSpentSeconds}s</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Hints:</span>
                            <span className="ml-2 font-medium">{result.hintsUsed}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Confidence:</span>
                            <span className="ml-2 font-medium">{result.confidenceRating}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function calculateGrowthTrend(attempts: ProblemAttempt[]): { direction: "up" | "down" | "stable"; percentage: number } {
  if (attempts.length < 2) return { direction: "stable", percentage: 0 };
  const recentScores = attempts.slice(0, 5).map(a => a.finalScore);
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const olderScores = attempts.slice(5, 10).map(a => a.finalScore);
  if (olderScores.length === 0) {
    const diff = recentScores[0] - recentScores[recentScores.length - 1];
    return { direction: diff > 5 ? "up" : diff < -5 ? "down" : "stable", percentage: diff };
  }
  const avgOlder = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
  const diff = avgRecent - avgOlder;
  return { direction: diff > 5 ? "up" : diff < -5 ? "down" : "stable", percentage: diff };
}
