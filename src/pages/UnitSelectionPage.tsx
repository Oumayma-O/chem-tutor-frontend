import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCurriculum } from "@/hooks/useCurriculum";
import { COURSE_LEVELS, CourseLevel, getCourseLevel } from "@/data/units";
import { type CurriculumUnit, type PhaseCurriculumGroup } from "@/lib/api/units";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { NavDropdown } from "@/components/tutor/NavDropdown";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import { UnitRow } from "@/components/landing/UnitRow";
import { PhaseHeader } from "@/components/landing/PhaseHeader";

/** Infer course filter from profile (grade_level and/or course from signup). */
function inferCourseLevel(profile: { grade_level?: string | null; course?: string | null } | null): CourseLevel | "all" {
  if (!profile) return "all";
  const gl = (profile.grade_level ?? "").toLowerCase();
  const co = (profile.course ?? "").toLowerCase();
  if (gl.includes("ap") || gl.includes("advanced") || co.includes("ap") || co.includes("advanced")) return "ap";
  if (gl || co) return "standard";
  return "all";
}

function matchesCourseLevel(unit: CurriculumUnit, level: CourseLevel): boolean {
  return getCourseLevel(unit.course_name) === level;
}

function UnitRowSkeleton() {
  return (
    <div className="w-full rounded-xl border bg-card animate-pulse p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-secondary/60" />
        </div>
        <div className="flex-1">
          <div className="h-5 w-3/4 rounded bg-secondary/60 mb-1.5" />
          <div className="h-3.5 w-1/2 rounded bg-secondary/40 mb-2.5" />
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-5 w-16 rounded-full bg-secondary/50" />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 w-24 rounded bg-secondary/50" />
          <div className="w-24 h-2 rounded-full bg-secondary/50" />
        </div>
      </div>
    </div>
  );
}

export default function UnitSelectionPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { phases, loading, error } = useCurriculum();
  const [searchQuery, setSearchQuery] = useState("");

  const autoLevel = inferCourseLevel(profile);
  const [selectedLevel, setSelectedLevel] = useState<CourseLevel | "all">(autoLevel);

  useEffect(() => {
    if (autoLevel !== "all") setSelectedLevel(autoLevel);
  }, [autoLevel]);

  const filteredPhases = useMemo(() => {
    const q = searchQuery.toLowerCase();

    return phases
      .map((phase): PhaseCurriculumGroup => {
        const filtered = phase.units.filter((u) => {
          if (selectedLevel !== "all" && !matchesCourseLevel(u, selectedLevel)) {
            return false;
          }
          if (q) {
            return (
              u.title.toLowerCase().includes(q) ||
              u.description.toLowerCase().includes(q) ||
              u.lesson_titles.some((t) => t.toLowerCase().includes(q))
            );
          }
          return true;
        });
        return { ...phase, units: filtered };
      })
      .filter((phase) => phase.units.length > 0);
  }, [phases, searchQuery, selectedLevel]);

  const totalUnits = filteredPhases.reduce((sum, p) => sum + p.units.length, 0);

  const handleSelectUnit = (unit: CurriculumUnit) => {
    if (unit.is_coming_soon || !unit.is_active) return;
    navigate(`/unit/${unit.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <BeakerMascot pose="idle" size={28} />
            <span className="text-sm font-bold text-foreground hidden sm:inline">
              Catalyst
            </span>
          </button>
          <NavDropdown />
        </div>
      </header>

      <main className="px-6 lg:px-12 xl:px-16 py-6">
        <div className="max-w-[1000px] mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              Your Learning Path
            </h2>
            <p className="text-muted-foreground text-sm">
              Follow the sequence below — each topic builds on the last.
            </p>
          </div>

          {/* Search + Filter + View toggle */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search topics or chapters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1 bg-secondary/60 rounded-lg p-1">
              <button
                onClick={() => setSelectedLevel("all")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  selectedLevel === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All
              </button>
              {COURSE_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setSelectedLevel(level.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                    selectedLevel === level.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {level.label}
                </button>
              ))}
            </div>

          </div>

          {error && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <BeakerMascot mood="sad" size={80} />
              <p className="text-sm font-medium text-foreground">Couldn't load units</p>
              <p className="text-xs text-muted-foreground max-w-xs">{error}</p>
            </div>
          )}

          {(searchQuery || selectedLevel !== "all") && !loading && !error && (
            <p className="text-sm text-muted-foreground mb-4">
              {totalUnits} unit{totalUnits !== 1 ? "s" : ""} found
            </p>
          )}

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <UnitRowSkeleton key={i} />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              {selectedLevel === "all" ? (
                /* ── Card grid ── */
                <motion.div
                  key="all-grid"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {(() => {
                    let idx = 0;
                    return filteredPhases.flatMap((phase) =>
                      phase.units.map((unit) => {
                        const delay = Math.min(idx++ * 0.035, 0.45);
                        return (
                          <motion.div
                            key={unit.id}
                            initial={{ opacity: 0, y: 14, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.22, delay, ease: "easeOut" }}
                            className="h-full"
                          >
                            <UnitRow
                              unit={unit}
                              progress={0}
                              viewMode="card"
                              onClick={() => handleSelectUnit(unit)}
                            />
                          </motion.div>
                        );
                      }),
                    );
                  })()}
                </motion.div>
              ) : (
                /* ── Phased list ── */
                <motion.div
                  key={selectedLevel}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex flex-col gap-3"
                >
                  {(() => {
                    let itemIdx = 0;
                    return filteredPhases.flatMap((phase, pi) => [
                      <motion.div
                        key={`phase-${phase.phase_id ?? pi}`}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: pi * 0.06, ease: "easeOut" }}
                      >
                        <PhaseHeader
                          name={phase.phase_name}
                          description={phase.phase_description}
                        />
                      </motion.div>,
                      ...phase.units.map((unit) => {
                        const delay = Math.min(itemIdx++ * 0.04, 0.5);
                        return (
                          <motion.div
                            key={unit.id}
                            initial={{ opacity: 0, x: -18 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.22, delay, ease: "easeOut" }}
                          >
                            <UnitRow
                              unit={unit}
                              progress={0}
                              viewMode="default"
                              onClick={() => handleSelectUnit(unit)}
                            />
                          </motion.div>
                        );
                      }),
                    ]);
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {!loading && !error && totalUnits === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {phases.length === 0
                  ? "No units available yet. Check back soon!"
                  : "No units match your search. Try different keywords or adjust the filter."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
