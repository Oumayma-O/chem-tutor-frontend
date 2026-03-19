import { useParams, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useUnit } from "@/hooks/useUnit";
import { CourseSidebar } from "@/components/tutor/CourseSidebar";
import { NavDropdown } from "@/components/tutor/NavDropdown";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import { LessonOverview } from "@/components/tutor/LessonOverview";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, ChevronRight, Menu, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLessonCompletion } from "@/hooks/useLessonCompletion";
import { useQueryClient } from "@tanstack/react-query";
import { apiGenerateProblemV2 } from "@/lib/api";
import { apiGetReferenceCard, refCardQueryKey, REF_CARD_STALE_MS, REF_CARD_GC_MS } from "@/lib/api/problems";
import { parseProblemOutput } from "@/hooks/useGeneratedProblem";
import { getCachedPromise, setPrefetchPromise } from "@/lib/problemPrefetchCache";

export default function UnitLandingPage() {
  const { unitId, lessonIndex } = useParams<{ unitId?: string; lessonIndex?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { unit, lessonTitles, loading, error } = useUnit(unitId);
  const currentLessonIdx = lessonIndex ? parseInt(lessonIndex, 10) : 0;
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { getStatus } = useLessonCompletion(unitId || "", user?.id);

  const currentLessonTitle = lessonTitles[currentLessonIdx] ?? "";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [unitId, lessonIndex]);

  // ── Eager prefetch: two independent timers so both requests hit the backend
  //    simultaneously rather than the reference card waiting behind the problem.
  //
  //   300 ms  → reference card  (simple LLM task, start ASAP)
  //   1500 ms → Level-1 problem (heavier; delay guards against instant navigation)
  useEffect(() => {
    const uid = unit?.id;
    const lname = lessonTitles[currentLessonIdx] ?? "";
    if (!uid || !lname) return;

    const lidx = currentLessonIdx;

    // ── Reference card: fires early so LLM generation starts before the user
    //    clicks "Start Practice".  React Query deduplicates if already in-flight.
    const refCardTimer = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: refCardQueryKey(uid, lidx),
        queryFn: () => apiGetReferenceCard(uid, lidx, lname),
        staleTime: REF_CARD_STALE_MS,
        gcTime: REF_CARD_GC_MS,
      });
    }, 300);

    // ── Level-1 problem: longer delay to avoid wasted generation on fast nav.
    const problemTimer = setTimeout(() => {
      if (!getCachedPromise(uid, lidx, 1)) {
        const promise = apiGenerateProblemV2({
          unit_id: uid,
          lesson_index: lidx,
          lesson_name: lname,
          difficulty: "medium",
          level: 1,
          interests: profile?.interests ?? [],
          grade_level: profile?.grade_level ?? null,
          user_id: user?.id,
        }).then((data) => {
          if (!data?.problem?.id || !data?.problem?.steps?.length) {
            throw new Error("Invalid problem structure from prefetch");
          }
          return parseProblemOutput(data);
        });
        setPrefetchPromise(uid, lidx, 1, promise);
      }
    }, 1500);

    return () => {
      clearTimeout(refCardTimer);
      clearTimeout(problemTimer);
    };
  }, [unit?.id, currentLessonIdx, lessonTitles, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const sortedLessons = unit.lessons.slice().sort((a, b) => a.lesson_index - b.lesson_index);
  const currentLesson = sortedLessons[currentLessonIdx] ?? null;

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
            <nav className="flex items-center gap-1 min-w-0 text-sm overflow-hidden">
              <button
                onClick={() => navigate("/", { state: location.state })}
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
          <main className="flex-1 pb-24">
            {currentLesson && (
              <LessonOverview
                lesson={currentLesson}
                unitTitle={unit.title}
                onStartPractice={() => navigate(`/tutor/${unit.id}/${currentLessonIdx}`)}
              />
            )}
          </main>

          {/* Sticky footer navigation */}
          {totalLessons > 0 && (
            <div
              className="fixed bottom-0 right-0 z-10 border-t border-border bg-card/95 backdrop-blur-sm transition-[left] duration-300"
              style={{ left: sidebarOpen ? 260 : 0 }}
            >
              <div className="flex items-center justify-between px-4 py-3 max-w-screen-xl mx-auto">
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

                <span className="text-xs text-muted-foreground tabular-nums">
                  Lesson {currentLessonIdx + 1} of {totalLessons}
                </span>

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
