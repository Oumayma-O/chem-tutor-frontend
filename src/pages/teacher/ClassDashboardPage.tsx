import { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { TeacherDashboardPage } from "@/components/teacher/TeacherDashboardPage";
import { DashboardShell } from "@/components/layout/DashboardShell";

/**
 * Standalone class analytics page reachable at /class/:classroomId.
 *
 * Used when an admin or superadmin clicks "View Class" in StaffDirectoryPage.
 * Passes the classroomId + name/code (from router navigation state) directly
 * into TeacherDashboardPage as `initialAdminClass`, which pre-selects the class
 * and shows a "← Back to Directory" button that navigates back to "/".
 */
export default function ClassDashboardPage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const location = useLocation();
  const state = location.state as { name?: string; code?: string } | null;

  const [managedClassCount, setManagedClassCount] = useState(0);

  const initialAdminClass = classroomId
    ? {
        id: classroomId,
        name: state?.name ?? "Class",
        code: state?.code ?? "",
      }
    : null;

  return (
    <DashboardShell managedClassCount={managedClassCount}>
      <TeacherDashboardPage
        onManagedClassCountChange={setManagedClassCount}
        initialAdminClass={initialAdminClass}
      />
    </DashboardShell>
  );
}
