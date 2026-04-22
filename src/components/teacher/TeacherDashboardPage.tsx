import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTeacherDashboardData } from "@/hooks/useTeacherDashboardData";
import { useTeacherStudentSelectionFromUrl } from "@/hooks/useTeacherStudentSelectionFromUrl";
import { useTeacherLiveSSE } from "@/hooks/useTeacherDashboardSSE";
import { useTeacherLivePresence } from "@/hooks/useTeacherLivePresence";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Users,
  Settings,
  Users2,
} from "lucide-react";
import { ManageClassesDialog } from "@/components/teacher/ManageClassesDialog";
import { TeacherDashboardHeader } from "@/components/teacher/TeacherDashboardHeader";
import { TeacherFirstClassCard } from "@/components/teacher/TeacherFirstClassCard";
import { TeacherSelectedClassBanner } from "@/components/teacher/TeacherSelectedClassBanner";
import { TeacherClassOverviewTab } from "@/components/teacher/TeacherClassOverviewTab";
import { TeacherStudentsTab } from "@/components/teacher/TeacherStudentsTab";
import { TeacherStandardsTab } from "@/components/teacher/TeacherStandardsTab";
import { TeacherExitTicketsTab } from "@/components/teacher/TeacherExitTicketsTab";
import { TeacherSettingsTab } from "@/components/teacher/TeacherSettingsTab";
import TeachersDirectoryTab from "@/components/teacher/TeachersDirectoryTab";
import { updateClassSettings } from "@/services/api/teacher";
import { apiPostClassAnalytics } from "@/lib/api/analytics";
import { parseTeacherDashboardTab } from "@/lib/teacherDashboardTabs";
import { useAuth } from "@/hooks/useAuth";

interface TeacherDashboardPageProps {
  onManagedClassCountChange?: (count: number) => void;
  /**
   * When set, the dashboard opens directly into this class (admin drill-in from URL).
   * The directory tab is hidden and the "Back" button navigates to "/" instead of
   * switching tabs.
   */
  initialAdminClass?: { id: string; name: string; code: string } | null;
}

export function TeacherDashboardPage({
  onManagedClassCountChange,
  initialAdminClass = null,
}: TeacherDashboardPageProps) {
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const navigate = useNavigate();

  // Admin-selected class (from Directory → "View Class", or pre-filled from URL)
  const [adminSelectedClass, setAdminSelectedClass] = useState<{
    id: string; name: string; code: string;
  } | null>(initialAdminClass);

  const [chapterFilter, setChapterFilter] = useState("all");

  const [searchParams, setSearchParams] = useSearchParams();

  const parseLessonParam = (raw: string | null): number | "all" => {
    if (!raw || raw === "all") return "all";
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : "all";
  };

  const parseDateParam = (raw: string | null): Date | undefined => {
    if (!raw) return undefined;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const localDate = new Date(y, mo - 1, d);
      return Number.isNaN(localDate.getTime()) ? undefined : localDate;
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

  // Analytics filters — persisted in URL so the browser back button + refresh restore state
  const analyticsChapter = searchParams.get("chapter") ?? "all";
  const analyticsLesson = parseLessonParam(searchParams.get("lesson"));
  const analyticsModeRaw = searchParams.get("mode");
  const analyticsMode: "all" | "practice" | "exit-ticket" =
    analyticsModeRaw === "practice" || analyticsModeRaw === "exit-ticket"
      ? analyticsModeRaw
      : "all";
  const analyticsDate = parseDateParam(searchParams.get("date"));

  const handleAnalyticsChapterChange = (v: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (v === "all") p.delete("chapter"); else p.set("chapter", v);
        p.delete("lesson"); // reset lesson when chapter changes
        return p;
      },
      { replace: true },
    );
  };

  const setAnalyticsLesson = (v: number | "all") => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (v === "all") p.delete("lesson"); else p.set("lesson", String(v));
        return p;
      },
      { replace: true },
    );
  };

  const setAnalyticsMode = (v: "all" | "practice" | "exit-ticket") => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (v === "all") p.delete("mode"); else p.set("mode", v);
        return p;
      },
      { replace: true },
    );
  };

  const setAnalyticsDate = (d: Date | undefined) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (!d) p.delete("date");
        else p.set("date", d.toISOString().slice(0, 10)); // YYYY-MM-DD
        return p;
      },
      { replace: true },
    );
  };

  const [newClassName, setNewClassName] = useState("");
  const [newClassCourseType, setNewClassCourseType] = useState<string>("standard");
  const [creatingClass, setCreatingClass] = useState(false);
  const [manageClassesOpen, setManageClassesOpen] = useState(false);

  // When admin drills into a class, provide the ID directly so the roster hook
  // doesn't try to validate it against the (empty) teacher-owned class list.
  const viewClassId = isAdmin
    ? (adminSelectedClass?.id ?? initialAdminClass?.id ?? undefined)
    : undefined;

  const {
    classes,
    classesLoading,
    selectedClassId,
    setSelectedClassId,
    loadingStudents,
    enrolledStudents,
    selectedClass,
    classStats,
    classMastery,
    atRiskStudents,
    masteredStudents,
    developingStudents,
    detectedChapterId,
    refetchClasses,
    createTeacherClass,
    deleteTeacherClass,
  } = useTeacherDashboardData({
    onManagedClassCountChange,
    rosterFilter: {
      unitId: analyticsChapter !== "all" ? analyticsChapter : undefined,
      lessonIndex: analyticsLesson !== "all" ? analyticsLesson : undefined,
    },
    viewClassId,
  });

  const { selectedStudent, setSelectedStudentWithUrl, handleDashboardTabChange } = useTeacherStudentSelectionFromUrl({
    selectedClassId: isAdmin ? (adminSelectedClass?.id ?? "all") : selectedClassId,
    loadingStudents,
    enrolledStudents,
    searchParams,
    setSearchParams,
  });

  // When opened from /class/:id URL, default to "class" tab (no directory available)
  const defaultTab = isAdmin && !initialAdminClass ? "directory" : "class";
  const parsedTab = parseTeacherDashboardTab(searchParams.get("tab"));
  const allowedTabs = isAdmin
    ? (initialAdminClass
      ? (["class", "students", "standards", "exit-tickets"] as const)
      : (["directory", "class", "students", "standards", "exit-tickets"] as const))
    : (["class", "students", "standards", "exit-tickets", "settings"] as const);
  const dashboardTab =
    parsedTab && allowedTabs.includes(parsedTab)
      ? parsedTab
      : defaultTab;

  // For admin: use the class they drilled into from Directory; for teacher: their own selection
  const effectiveClassroomId = isAdmin
    ? (adminSelectedClass?.id ?? "all")
    : selectedClassId;
  const activeClassId = effectiveClassroomId !== "all" ? effectiveClassroomId : undefined;

  function handleAdminSelectClass(cls: { id: string; name: string; code: string }) {
    setAdminSelectedClass(cls);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("tab", "class");
        return p;
      },
      { replace: true, preventScrollReset: true },
    );
  }
  function handleBackToDirectory() {
    if (initialAdminClass) {
      // Opened from /class/:id URL — go back to directory page
      navigate("/");
    } else {
      setAdminSelectedClass(null);
      setSelectedClassId("all");
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set("tab", "directory");
          return p;
        },
        { replace: true, preventScrollReset: true },
      );
    }
  }

  useTeacherLiveSSE({
    classId: activeClassId,
    enabled: Boolean(activeClassId),
  });

  /** Polling fallback for live rows when SSE (`/live/stream`) fails (e.g. CORS / missing route). Same cache key as SSE + panels. */
  const livePollClassId = activeClassId ?? null;
  useTeacherLivePresence({ classId: livePollClassId });

  const handleCreateClass = async (): Promise<boolean> => {
    if (!newClassName.trim()) return false;
    setCreatingClass(true);
    try {
      const ok = await createTeacherClass(newClassName);
      if (ok) setNewClassName("");
      return ok;
    } finally {
      setCreatingClass(false);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    await deleteTeacherClass(classId);
  };

  const { data: classAnalytics } = useQuery({
    queryKey: teacherQueryKeys.classAnalytics(effectiveClassroomId, chapterFilter !== "all" ? chapterFilter : null),
    queryFn: () => apiPostClassAnalytics({
      class_id: effectiveClassroomId,
      unit_id: chapterFilter,
      include_ai_insights: false,
    }),
    enabled: effectiveClassroomId !== "all" && chapterFilter !== "all",
    staleTime: 60_000,
  });

  const queryClient = useQueryClient();
  const classesQueryKey = user ? teacherQueryKeys.classes(user.id) : teacherQueryKeys.classesRoot();

  const handleToggleCalculator = async (classId: string, enabled: boolean) => {
    // Optimistic update — flip immediately so the toggle feels instant
    queryClient.setQueryData<{ id: string; calculator_enabled: boolean }[]>(
      classesQueryKey,
      (old) => old?.map((c) => c.id === classId ? { ...c, calculator_enabled: enabled } : c),
    );
    try {
      await updateClassSettings(classId, { calculator_enabled: enabled });
    } catch {
      // Revert on failure
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.classesRoot() });
    }
  };

  const handleToggleAnswerReveal = async (classId: string, enabled: boolean) => {
    queryClient.setQueryData<{ id: string; allow_answer_reveal: boolean }[]>(
      classesQueryKey,
      (old) => old?.map((c) => c.id === classId ? { ...c, allow_answer_reveal: enabled } : c),
    );
    try {
      await updateClassSettings(classId, { allow_answer_reveal: enabled });
    } catch {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.classesRoot() });
    }
  };

  const handleSetMaxReveals = async (classId: string, value: number | null) => {
    queryClient.setQueryData<{ id: string; max_answer_reveals_per_lesson: number | null }[]>(
      classesQueryKey,
      (old) => old?.map((c) => c.id === classId ? { ...c, max_answer_reveals_per_lesson: value } : c),
    );
    try {
      await updateClassSettings(classId, { max_answer_reveals_per_lesson: value });
    } catch {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.classesRoot() });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        {/* Manage Classes dialog — teachers only */}
        {!isAdmin && (
          <ManageClassesDialog
            open={manageClassesOpen}
            onOpenChange={setManageClassesOpen}
            newClassName={newClassName}
            onNewClassNameChange={setNewClassName}
            newClassCourseType={newClassCourseType}
            onNewClassCourseTypeChange={setNewClassCourseType}
            creatingClass={creatingClass}
            onCreateClass={handleCreateClass}
          />
        )}

        {/* Global action bar */}
        <TeacherDashboardHeader
          classes={classes}
          selectedClassId={selectedClassId}
          onSelectedClassIdChange={setSelectedClassId}
          selectedClass={selectedClass}
          onDeleteClass={handleDeleteClass}
          onOpenManageClasses={() => setManageClassesOpen(true)}
          isAdmin={isAdmin}
          adminSelectedClass={adminSelectedClass}
          onBackToDirectory={handleBackToDirectory}
        />

        {/* First-class prompt — teachers only, no classes yet */}
        {!isAdmin && !classesLoading && classes.length === 0 && (
          <div className="mt-6">
            <TeacherFirstClassCard onOpenManageClasses={() => setManageClassesOpen(true)} />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={dashboardTab} onValueChange={handleDashboardTabChange} className="mt-6 space-y-6">
          <TabsList className={`grid w-full max-w-4xl ${isAdmin && !initialAdminClass ? "grid-cols-6" : "grid-cols-5"}`}>
            {isAdmin && !initialAdminClass && (
              <TabsTrigger value="directory" className="gap-1.5">
                <Users2 className="w-3.5 h-3.5" />
                Directory
              </TabsTrigger>
            )}
            <TabsTrigger value="class" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Class
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Students
            </TabsTrigger>
            <TabsTrigger value="standards">Standards</TabsTrigger>
            <TabsTrigger value="exit-tickets">Assessments</TabsTrigger>
            {/* Settings hidden for admins — they can't modify class settings */}
            {!isAdmin && (
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          {/* Directory tab — admins only, hidden when opened from /class/:id URL */}
          {isAdmin && !initialAdminClass && (
            <TabsContent value="directory" className="space-y-6">
              <TeachersDirectoryTab
                onSelectClass={handleAdminSelectClass}
                isSuperAdmin={isSuperAdmin}
              />
            </TabsContent>
          )}

          <TeacherClassOverviewTab
            chapterFilter={chapterFilter}
            onChapterFilterChange={setChapterFilter}
            selectedClassId={effectiveClassroomId}
            selectedClass={selectedClass}
            classStats={classStats}
            enrolledStudents={enrolledStudents}
            classMastery={classMastery}
            masteredStudents={masteredStudents}
            developingStudents={developingStudents}
            atRiskStudents={atRiskStudents}
            onStudentClick={setSelectedStudentWithUrl}
            avgL1Score={classAnalytics?.avg_l1_score}
            avgL2Score={classAnalytics?.avg_l2_score}
            avgL3Score={classAnalytics?.avg_l3_score}
            atRiskL2Count={classAnalytics?.at_risk_l2_count}
            atRiskL3Count={classAnalytics?.at_risk_l3_count}
          />

          <TeacherStudentsTab
            selectedClassId={effectiveClassroomId}
            selectedClass={selectedClass}
            loadingStudents={loadingStudents}
            enrolledStudents={enrolledStudents}
            selectedStudent={selectedStudent}
            onSelectStudent={setSelectedStudentWithUrl}
            onClearStudent={() => setSelectedStudentWithUrl(null)}
            analyticsDate={analyticsDate}
            onAnalyticsDateChange={setAnalyticsDate}
            analyticsChapter={analyticsChapter}
            onAnalyticsChapterChange={handleAnalyticsChapterChange}
            analyticsLesson={analyticsLesson}
            onAnalyticsLessonChange={setAnalyticsLesson}
            analyticsMode={analyticsMode}
            onAnalyticsModeChange={setAnalyticsMode}
          />

          <TeacherStandardsTab
            classId={effectiveClassroomId !== "all" ? effectiveClassroomId : null}
            enrolledStudents={enrolledStudents}
          />

          <TeacherExitTicketsTab
            selectedClassId={effectiveClassroomId}
            selectedClass={selectedClass}
            detectedChapterId={detectedChapterId}
            onRefetchClasses={refetchClasses}
            readOnly={isAdmin}
          />

          {/* Settings — teachers only */}
          {!isAdmin && (
            <TeacherSettingsTab
              selectedClassId={selectedClassId}
              selectedClass={selectedClass}
              onToggleCalculator={handleToggleCalculator}
              onToggleAnswerReveal={handleToggleAnswerReveal}
              onSetMaxReveals={handleSetMaxReveals}
            />
          )}
        </Tabs>
      </main>
    </div>
  );
}
