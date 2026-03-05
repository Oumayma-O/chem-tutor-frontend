import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useUnit } from "@/hooks/useUnit";
import { ChemistryTutor } from "@/components/tutor/ChemistryTutor";
import { CourseSidebar } from "@/components/tutor/CourseSidebar";
import { NavDropdown } from "@/components/tutor/NavDropdown";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import { useLessonCompletion } from "@/hooks/useLessonCompletion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, Loader2, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TutorPage() {
  const { unitId, lessonIndex } = useParams<{ unitId?: string; lessonIndex?: string }>();
  const navigate = useNavigate();
  const { unit, lessonTitles, loading, error } = useUnit(unitId);
  const currentLessonIdx = lessonIndex ? parseInt(lessonIndex, 10) : 0;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lessonDropdownOpen, setLessonDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { profile, user } = useAuth();
  const { getStatus, markCompleted, markInProgress } = useLessonCompletion(unitId || "", user?.id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [unitId, lessonIndex]);

  // Close lesson dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLessonDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !unit || unit.is_coming_soon || !unit.is_active) {
    return <Navigate to="/" replace />;
  }

  const currentLessonName = lessonTitles[currentLessonIdx] ?? "Practice";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-20 min-h-[3.5rem] flex items-center px-4 justify-between gap-4">
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
          {/* Breadcrumb with lesson dropdown — unit name truncates on small screens */}
          <nav className="flex items-center gap-1 min-w-0 text-sm overflow-hidden">
            <button
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              Units
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            {/* Unit title as lesson dropdown trigger; responsive max-width so it doesn't push user icon */}
            <div className="relative min-w-0 max-w-[min(45vw,140px)] sm:max-w-[200px] md:max-w-[240px]" ref={dropdownRef}>
              <button
                onClick={() => setLessonDropdownOpen((v) => !v)}
                title={unit.title}
                className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors w-full min-w-0"
              >
                <span className="truncate">{unit.title}</span>
                <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
              </button>
              {lessonDropdownOpen && lessonTitles.length > 0 && (
                <div className="absolute top-full left-0 mt-1.5 w-60 bg-card border border-border rounded-lg shadow-lg z-30 py-1 max-h-72 overflow-y-auto">
                  <p className="px-3 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {unit.title}
                  </p>
                  {lessonTitles.map((title, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        navigate(`/tutor/${unit.id}/${i}`);
                        setLessonDropdownOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left hover:bg-secondary/60 transition-colors",
                        i === currentLessonIdx
                          ? "text-primary font-medium bg-primary/5"
                          : "text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          i === currentLessonIdx ? "bg-primary" : "bg-border",
                        )}
                      />
                      <span className="truncate">{title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-foreground font-medium truncate min-w-0 max-w-[min(30vw,160px)] sm:max-w-[160px]" title={currentLessonName}>
              {currentLessonName}
            </span>
          </nav>
        </div>
        <NavDropdown />
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
        <main className="flex-1 min-w-0 transition-all duration-300">
          <ChemistryTutor
            key={`${unit.id}-${currentLessonIdx}`}
            unitId={unit.id}
            unitTitle={unit.title}
            lessonName={currentLessonName}
            lessonIndex={currentLessonIdx}
            userId={user?.id}
            onTopicComplete={() => markCompleted(currentLessonIdx)}
            onMarkInProgress={() => markInProgress(currentLessonIdx)}
            topicCompleted={getStatus(currentLessonIdx) === "completed"}
            interests={profile?.interests || []}
            gradeLevel={profile?.grade_level}
          />
        </main>
      </div>
    </div>
  );
}
