import { useAuth } from "@/hooks/useAuth";
import { TeacherDashboardPage } from "@/components/teacher/TeacherDashboardPage";
import { useCognitiveTracking } from "@/hooks/useCognitiveTracking";

export default function TeacherPage() {
  const { signOut } = useAuth();
  const { getCognitiveProfile } = useCognitiveTracking();

  // In a real app, this would fetch from the database
  const profile = getCognitiveProfile();

  return (
    <TeacherDashboardPage
      profile={profile}
      exitTicketResults={[]}
      onBack={signOut}
    />
  );
}
