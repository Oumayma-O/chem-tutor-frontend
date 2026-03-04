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
import { ArrowRight, Beaker, BookOpen, Zap, Clock, CheckCircle, Circle, Menu, Loader2 } from "lucide-react";
import { useLessonCompletion } from "@/hooks/useLessonCompletion";
import { useAuth } from "@/hooks/useAuth";

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
            <h1 className="text-sm font-semibold text-foreground truncate py-1">
              {unit.title}
            </h1>
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
        />

        <div className="flex-1 min-w-0">
          {/* Lesson pills */}
          <div className="border-b border-border bg-card/50">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                {lessonTitles.map((lesson, i) => {
                  const isActive = i === currentLessonIdx;
                  const status = getStatus(i);

                  return (
                    <div key={lesson} className="flex items-center shrink-0">
                      {i > 0 && (
                        <div
                          className={`w-6 h-0.5 mx-1 ${
                            status === "completed"
                              ? "bg-green-500"
                              : status === "in-progress"
                                ? "bg-amber-400"
                                : "bg-border"
                          }`}
                        />
                      )}
                      <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : status === "completed"
                              ? "bg-green-500/10 text-green-600"
                              : status === "in-progress"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-secondary/60 text-muted-foreground"
                        }`}
                      >
                        {status === "completed" ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : isActive ? (
                          <Clock className="w-3 h-3" />
                        ) : status === "in-progress" ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <Circle className="w-3 h-3" />
                        )}
                        {lesson}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <main className="px-4 lg:px-6 py-5">
            {hasSimulation ? (
              <section>
                <SimulationGuide
                  unitId={unit.id}
                  lessonName={lessonTitles[currentLessonIdx] ?? ""}
                  interests={profile?.interests || []}
                  gradeLevel={profile?.grade_level}
                  masteryScore={0}
                />

                <div className="flex items-center gap-3 mb-6">
                  <Beaker className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">
                    {lessonTitles[currentLessonIdx]} — Simulation
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
                  <AtomicStructureSimulation topicLabel={lessonTitles[currentLessonIdx] ?? ""} />
                )}

                <div className="mt-8 text-center">
                  <Button
                    size="lg"
                    onClick={() => navigate(`/tutor/${unit.id}/${currentLessonIdx}`)}
                    className="gap-2 text-base px-8"
                  >
                    <Zap className="w-5 h-5" />
                    Start Practice — {lessonTitles[currentLessonIdx]}
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
                  Explore {unit.title}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Interactive simulations for this unit are coming soon.
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate(`/tutor/${unit.id}/0`)}
                  className="gap-2"
                >
                  <Zap className="w-5 h-5" />
                  Start Practice
                </Button>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
