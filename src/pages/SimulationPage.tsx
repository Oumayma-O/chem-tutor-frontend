import { Suspense, useState } from "react";
import { useParams, Navigate, useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, Loader2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import { NavDropdown } from "@/components/tutor/NavDropdown";
import { CourseSidebar } from "@/components/tutor/CourseSidebar";
import { useUnit } from "@/hooks/useUnit";
import { useAuth } from "@/hooks/useAuth";
import { useLessonCompletion } from "@/hooks/useLessonCompletion";
import { getSimEntry } from "@/components/simulations/registry";

export default function SimulationPage() {
  const { unitId, lessonIndex: lessonIndexStr } = useParams<{
    unitId?: string;
    lessonIndex?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const lessonIndex = lessonIndexStr ? parseInt(lessonIndexStr, 10) : 0;
  const { unit, lessonTitles, loading, error } = useUnit(unitId);
  const { user } = useAuth();
  const { getStatus } = useLessonCompletion(unitId || "", user?.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !unit) return <Navigate to="/" replace />;

  const entry = unitId ? getSimEntry(unitId, lessonIndex) : undefined;
  if (!entry) return <Navigate to={`/unit/${unitId}/${lessonIndex}`} replace />;

  const SimComponent = entry.component;
  const lessonTitle = lessonTitles[lessonIndex] ?? entry.title;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* ── Header — identical to TutorPage ─────────────────── */}
      <header className="border-b border-border bg-card sticky top-0 z-20 shrink-0">
        <div className="px-4 h-14 flex items-center justify-between gap-4 min-h-[3.5rem]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="shrink-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <BeakerMascot pose="idle" size={24} className="shrink-0" />
            <div className="h-5 w-px bg-border shrink-0" />
            <nav className="flex items-center gap-1 min-w-0 text-sm overflow-hidden">
              <button
                onClick={() => navigate("/", { state: location.state })}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Units
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
              <button
                onClick={() => navigate(`/unit/${unitId}/${lessonIndex}`, { state: location.state })}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[140px]"
              >
                {unit.title}
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
              <span className="text-foreground font-medium truncate max-w-[180px]">
                {lessonTitle} · Lab
              </span>
            </nav>
          </div>
          <NavDropdown />
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Mobile backdrop — dims content when sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <CourseSidebar
          currentUnitId={unit.id}
          currentLessonIndex={lessonIndex}
          open={sidebarOpen}
          unitTitle={unit.title}
          lessonTitles={lessonTitles}
          userId={user?.id}
          getLessonStatus={getStatus}
        />

        <main className="flex-1 w-full bg-slate-50 dark:bg-slate-950 overflow-y-auto overflow-x-hidden">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            }
          >
            <SimComponent
              onBackToOverview={() =>
                navigate(`/unit/${unitId}/${lessonIndex}`, { state: location.state })
              }
              onStartPractice={() =>
                navigate(`/tutor/${unitId}/${lessonIndex}`, {
                  state: {
                    ...location.state,
                    fromSimulationLab: true,
                  },
                })
              }
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
