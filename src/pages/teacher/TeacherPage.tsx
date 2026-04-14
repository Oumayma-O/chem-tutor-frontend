import { useState } from "react";
import { TeacherDashboardPage } from "@/components/teacher/TeacherDashboardPage";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useActivityHeartbeat } from "@/hooks/useActivityHeartbeat";

export default function TeacherPage() {
  const [managedClassCount, setManagedClassCount] = useState(0);
  useActivityHeartbeat();

  return (
    <DashboardShell managedClassCount={managedClassCount}>
      <TeacherDashboardPage onManagedClassCountChange={setManagedClassCount} />
    </DashboardShell>
  );
}
