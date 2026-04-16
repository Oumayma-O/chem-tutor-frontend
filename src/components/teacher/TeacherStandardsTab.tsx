import { TabsContent } from "@/components/ui/tabs";
import { StandardsMasteryHeatmap } from "@/components/teacher/StandardsMasteryHeatmap";
import type { ClassStudentRow } from "@/hooks/useTeacherDashboardData";
import { LayoutGrid } from "lucide-react";

interface TeacherStandardsTabProps {
  classId?: string | null;
  enrolledStudents?: ClassStudentRow[];
}

export function TeacherStandardsTab({ classId, enrolledStudents = [] }: TeacherStandardsTabProps) {
  if (!classId) {
    return (
      <TabsContent value="standards">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <LayoutGrid className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No class selected</p>
          <p className="mt-1 text-sm text-slate-400">
            Select a class above to view its standards coverage.
          </p>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="standards">
      <StandardsMasteryHeatmap classId={classId} enrolledStudents={enrolledStudents} />
    </TabsContent>
  );
}
