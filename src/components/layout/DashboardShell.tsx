import { Link } from "react-router-dom";
import { UserAccountMenu } from "@/components/layout/UserAccountMenu";
import { BeakerMascot } from "@/components/tutor/widgets";
import { useAuth } from "@/hooks/useAuth";

interface DashboardShellProps {
  children: React.ReactNode;
  /** Passed to the teacher account menu stats row. */
  managedClassCount?: number;
}

function shellSubtitle(role: string | null | undefined): string {
  if (role === "superadmin") return "Super Admin";
  if (role === "admin") return "Admin Dashboard";
  return "Teacher Dashboard";
}

/**
 * Authenticated teacher/admin shell: primary links on the left, account menu on the right.
 */
export function DashboardShell({ children, managedClassCount = 0 }: DashboardShellProps) {
  const { role } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
            >
              <BeakerMascot pose="idle" size={28} />
              <span className="text-sm font-bold text-foreground hidden sm:inline">Catalyst</span>
            </Link>
            <span className="text-muted-foreground select-none">|</span>
            <span className="text-sm font-medium text-muted-foreground">{shellSubtitle(role)}</span>
          </div>
          <UserAccountMenu variant="teacher" managedClassCount={managedClassCount} />
        </div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
