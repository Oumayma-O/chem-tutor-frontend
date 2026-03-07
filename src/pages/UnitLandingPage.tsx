import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUnit } from "@/hooks/useUnit";
import { KineticsSimulation } from "@/components/tutor/KineticsSimulation";
import { AtomicStructureSimulation } from "@/components/tutor/AtomicStructureSimulation";
import { SimulationGuide } from "@/components/tutor/SimulationGuide";
import { CourseSidebar } from "@/components/tutor/CourseSidebar";
import { NavDropdown } from "@/components/tutor/NavDropdown";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Beaker, BookOpen, Zap, ChevronRight, Menu, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLessonCompletion } from "@/hooks/useLessonCompletion";

const KINETICS_LESSONS: { order: 0 | 1 | 2; label: string }[] = [
  { order: 0, label: "Zero-Order Kinetics" },
  { order: 1, label: "First-Order Kinetics" },
  { order: 2, label: "Second-Order Kinetics" },
];

const RATE_LAWS_LESSON_INDEX = 3;

export default function UnitLandingPage() {
  const { unitId, lessonIndex } = useParams<{ unitId?: string; lessonIndex?: string }>();
  const navigate = useNavigate();
  const { unit, lessonTitles, loading, error } = useUnit(unitId);
  const currentLessonIdx = lessonIndex ? parseInt(lessonIndex, 10) : 0;
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { profile, user } = useAuth();
  const { getStatus } = useLessonCompletion(unitId || "", user?.id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [unitId, lessonIndex]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !unit || (!unit.is_active && !unit.is_coming_soon)) {
    return <Navigate to="/" replace />;
  }

  if (unit.is_coming_soon) {
    return <Navigate to="/" replace />;
  }

  const isKinetics = unit.id === "chemical-kinetics";
  const isAtomicStructure = unit.id === "atomic-structure";
  const kineticsLessonConfig = isKinetics ? KINETICS_LESSONS[currentLessonIdx] : null;
  const hasSimulation =
    !!kineticsLessonConfig ||
    isAtomicStructure ||
    (isKinetics && currentLessonIdx === RATE_LAWS_LESSON_INDEX);

  const currentLessonTitle = lessonTitles[currentLessonIdx] ?? "";
  const totalLessons = lessonTitles.length;
  const hasPrev = currentLessonIdx > 0;
  const hasNext = currentLessonIdx < totalLessons - 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-20">
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
            {/* Breadcrumb — unit name truncates on small screens so user icon stays visible */}
            <nav className="flex items-center gap-1 min-w-0 text-sm overflow-hidden">
              <button
                onClick={() => navigate("/")}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Units
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
              <span
                title={unit.title}
                className="text-muted-foreground truncate min-w-0 max-w-[min(45vw,140px)] sm:max-w-[200px] md:max-w-[240px]"
              >
                {unit.title}
              </span>
              {currentLessonTitle && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  <span className="text-foreground font-medium truncate max-w-[160px]">
                    {currentLessonTitle}
                  </span>
                </>
              )}
            </nav>
          </div>
          <NavDropdown />
        </div>
      </header>

      <div className="flex">
        <CourseSidebar
          currentUnitId={unit.id}
          currentLessonIndex={currentLessonIdx}
          open={sidebarOpen}
          unitTitle={unit.title}
          lessonTitles={lessonTitles}
          userId={user?.id}
          getLessonStatus={getStatus}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <main className="flex-1 px-4 lg:px-6 py-5 pb-24">
            {hasSimulation ? (
              <section>
                <SimulationGuide
                  unitId={unit.id}
                  lessonName={currentLessonTitle}
                  interests={profile?.interests || []}
                  gradeLevel={profile?.grade_level}
                  masteryScore={0}
                />

                <div className="flex items-center gap-3 mb-6">
                  <Beaker className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">
                    {currentLessonTitle} — Simulation
                  </h2>
                </div>

                {isKinetics && kineticsLessonConfig && (
                  <KineticsSimulation
                    reactionOrder={kineticsLessonConfig.order}
                    orderLabel={kineticsLessonConfig.label}
                  />
                )}

                {isKinetics && currentLessonIdx === RATE_LAWS_LESSON_INDEX && (
                  <KineticsSimulation reactionOrder={1} orderLabel="Rate Laws" />
                )}

                {isAtomicStructure && (
                  <AtomicStructureSimulation topicLabel={currentLessonTitle} />
                )}

                <div className="mt-8 text-center">
                  <Button
                    size="lg"
                    onClick={() => navigate(`/tutor/${unit.id}/${currentLessonIdx}`)}
                    className="gap-2 text-base px-8"
                  >
                    <Zap className="w-5 h-5" />
                    Start Practice — {currentLessonTitle}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <p className="text-sm text-muted-foreground mt-3">
                    Explore the simulation above, then practice with adaptive step-by-step problems.
                  </p>
                </div>
              </section>
            ) : (
              <section className="text-center py-16">
                <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {currentLessonTitle || unit.title}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Step-by-step adaptive practice for this topic.
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate(`/tutor/${unit.id}/${currentLessonIdx}`)}
                  className="gap-2"
                >
                  <Zap className="w-5 h-5" />
                  Start Practice
                </Button>
              </section>
            )}
          </main>

          {/* Sticky footer navigation */}
          {totalLessons > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-card/95 backdrop-blur-sm">
              <div className="flex items-center justify-between px-4 py-3 max-w-screen-xl mx-auto">
                {/* Previous */}
                <button
                  onClick={() =>
                    hasPrev && navigate(`/unit/${unit.id}/${currentLessonIdx - 1}`)
                  }
                  disabled={!hasPrev}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline truncate max-w-[160px]">
                    {hasPrev ? lessonTitles[currentLessonIdx - 1] : "Previous"}
                  </span>
                </button>

                {/* Center: lesson counter */}
                <span className="text-xs text-muted-foreground tabular-nums">
                  Lesson {currentLessonIdx + 1} of {totalLessons}
                </span>

                {/* Next */}
                <button
                  onClick={() =>
                    hasNext && navigate(`/unit/${unit.id}/${currentLessonIdx + 1}`)
                  }
                  disabled={!hasNext}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline truncate max-w-[160px]">
                    {hasNext ? lessonTitles[currentLessonIdx + 1] : "Next"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
