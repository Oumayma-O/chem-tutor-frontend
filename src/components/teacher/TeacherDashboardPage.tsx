import { useState } from "react";
import { useTeacherDashboardData } from "@/hooks/useTeacherDashboardData";
import { StudentCognitiveProfile, ExitTicketResult } from "@/types/cognitive";
import { AnalyticsDashboard } from "@/components/teacher/AnalyticsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Users,
  Settings,
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

interface TeacherDashboardPageProps {
  profile: StudentCognitiveProfile;
  exitTicketResults: ExitTicketResult[];
  onManagedClassCountChange?: (count: number) => void;
}

export function TeacherDashboardPage({
  profile,
  exitTicketResults: _exitTicketResults,
  onManagedClassCountChange,
}: TeacherDashboardPageProps) {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [chapterFilter, setChapterFilter] = useState("all");

  const [analyticsDate, setAnalyticsDate] = useState<Date | undefined>(undefined);
  const [analyticsChapter, setAnalyticsChapter] = useState("all");
  const [analyticsMode, setAnalyticsMode] = useState<"all" | "practice" | "exit-ticket">("all");

  const [newClassName, setNewClassName] = useState("");
  const [newClassCourseType, setNewClassCourseType] = useState<string>("standard");
  const [creatingClass, setCreatingClass] = useState(false);
  const [manageClassesOpen, setManageClassesOpen] = useState(false);

  const {
    classes,
    classesLoading,
    selectedClassId,
    setSelectedClassId,
    loadingStudents,
    displayStudents,
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
  } = useTeacherDashboardData({ onManagedClassCountChange });

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

  return (
    <div className="min-h-screen bg-background">
      <TeacherDashboardHeader
        selectedStudent={selectedStudent}
        onClearSelectedStudent={() => setSelectedStudent(null)}
        classes={classes}
        selectedClassId={selectedClassId}
        onSelectedClassIdChange={setSelectedClassId}
      />

      <main className="container mx-auto px-4 py-8">
        {!classesLoading && classes.length === 0 && (
          <TeacherFirstClassCard onOpenManageClasses={() => setManageClassesOpen(true)} />
        )}

        {selectedClass && (
          <TeacherSelectedClassBanner selectedClass={selectedClass} onDeleteClass={handleDeleteClass} />
        )}

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

        <Tabs defaultValue="class" className="space-y-6">
          <TabsList className="grid w-full max-w-4xl grid-cols-6">
            <TabsTrigger value="class" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Class
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Students
            </TabsTrigger>
            <TabsTrigger value="standards">Standards</TabsTrigger>
            <TabsTrigger value="exit-tickets">Exit Tickets</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TeacherClassOverviewTab
            chapterFilter={chapterFilter}
            onChapterFilterChange={setChapterFilter}
            selectedClassId={selectedClassId}
            selectedClass={selectedClass}
            classStats={classStats}
            displayStudents={displayStudents}
            classMastery={classMastery}
            masteredStudents={masteredStudents}
            developingStudents={developingStudents}
            atRiskStudents={atRiskStudents}
            onStudentClick={setSelectedStudent}
            profile={profile}
            onOpenManageClasses={() => setManageClassesOpen(true)}
          />

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard
              selectedClassId={selectedClassId}
              loadingStudents={loadingStudents}
              displayStudents={displayStudents}
              classStats={classStats}
              classMastery={classMastery}
              atRiskCount={atRiskStudents.length}
              masteredCount={masteredStudents.length}
              developingCount={developingStudents.length}
            />
          </TabsContent>

          <TeacherStudentsTab
            selectedClassId={selectedClassId}
            selectedClass={selectedClass}
            loadingStudents={loadingStudents}
            displayStudents={displayStudents}
            selectedStudent={selectedStudent}
            onSelectStudent={setSelectedStudent}
            profile={profile}
            analyticsDate={analyticsDate}
            onAnalyticsDateChange={setAnalyticsDate}
            analyticsChapter={analyticsChapter}
            onAnalyticsChapterChange={setAnalyticsChapter}
            analyticsMode={analyticsMode}
            onAnalyticsModeChange={setAnalyticsMode}
          />

          <TeacherStandardsTab />

          <TeacherExitTicketsTab
            selectedClassId={selectedClassId}
            selectedClass={selectedClass}
            detectedChapterId={detectedChapterId}
            onRefetchClasses={refetchClasses}
          />

          <TeacherSettingsTab classes={classes} />
        </Tabs>
      </main>
    </div>
  );
}
