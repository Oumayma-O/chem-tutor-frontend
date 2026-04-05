import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { UserAccountMenu } from "@/components/layout/UserAccountMenu";
import { useAuth } from "@/hooks/useAuth";

interface DashboardShellProps {
  children: React.ReactNode;
  /** Passed to the teacher account menu stats row. */
  managedClassCount?: number;
}

/**
 * Authenticated teacher/admin shell: primary links on the left, account menu on the right.
 * Admin is not linked here — use /admin directly or future role-gated UI.
 */
export function DashboardShell({ children, managedClassCount = 0 }: DashboardShellProps) {
  const { pathname } = useLocation();
  const { isAdmin } = useAuth();

  const navLink = (to: string, label: string) => {
    const active = pathname === to || pathname.startsWith(`${to}/`);
    return (
      <Link
        to={to}
        className={cn(
          "text-sm font-medium transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8 min-w-0">
            <Link
              to="/"
              className="text-sm font-bold text-foreground tracking-tight shrink-0 hover:opacity-90 transition-opacity"
            >
              Catalyst
            </Link>
            <nav className="flex items-center gap-6" aria-label="Main">
              {navLink("/teacher/dashboard", "Dashboard")}
              {isAdmin && navLink("/admin", "Admin")}
              {navLink("/", "Home")}
            </nav>
          </div>
          <UserAccountMenu variant="teacher" managedClassCount={managedClassCount} />
        </div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
