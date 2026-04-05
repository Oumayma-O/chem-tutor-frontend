import { useState } from "react";
import { TeacherDashboardPage } from "@/components/teacher/TeacherDashboardPage";
import { useCognitiveTracking } from "@/hooks/useCognitiveTracking";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function TeacherPage() {
  const { getCognitiveProfile } = useCognitiveTracking();
  const profile = getCognitiveProfile();
  const [managedClassCount, setManagedClassCount] = useState(0);

  return (
    <DashboardShell managedClassCount={managedClassCount}>
      <TeacherDashboardPage
        profile={profile}
        exitTicketResults={[]}
        onManagedClassCountChange={setManagedClassCount}
      />
    </DashboardShell>
  );
}
