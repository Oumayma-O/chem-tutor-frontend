import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUnits } from "@/hooks/useUnits";
import { COURSE_LEVELS, CourseLevel, getCourseLevel } from "@/data/units";
import { type UnitListItem } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Search, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavDropdown } from "@/components/tutor/NavDropdown";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";
import { UnitRow } from "@/components/landing/UnitRow";

function inferCourseLevel(gradeLevel: string | null): CourseLevel | "all" {
  if (!gradeLevel) return "all";
  const gl = gradeLevel.toLowerCase();
  if (gl.includes("ap") || gl.includes("advanced")) return "ap";
  return "standard";
}

function UnitRowSkeleton() {
  return (
    <div className="w-full rounded-lg border-2 border-border bg-card animate-pulse p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-secondary/60" />
          <div className="w-12 h-4 rounded bg-secondary/60" />
        </div>
        <div className="flex-1">
          <div className="h-5 w-3/4 rounded bg-secondary/60 mb-2" />
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 w-16 rounded-full bg-secondary/50" />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 w-24 rounded bg-secondary/50" />
          <div className="h-5 w-20 rounded-full bg-secondary/50" />
        </div>
      </div>
      <div className="mt-4 h-1.5 w-full rounded-full bg-secondary/50" />
    </div>
  );
}

export default function UnitSelectionPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { units, loading, error } = useUnits();
  const [searchQuery, setSearchQuery] = useState("");

  const autoLevel = inferCourseLevel(profile?.grade_level ?? null);
  const [selectedLevel, setSelectedLevel] = useState<CourseLevel | "all">(autoLevel);

  useEffect(() => {
    if (autoLevel !== "all") setSelectedLevel(autoLevel);
  }, [autoLevel]);

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchesSearch =
        !searchQuery ||
        u.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.lesson_titles.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const uLevel = getCourseLevel(u.course_name);
      const matchesLevel = selectedLevel === "all" || uLevel === selectedLevel;
      return matchesSearch && matchesLevel;
    });
  }, [units, searchQuery, selectedLevel]);

  const handleSelectUnit = (unit: UnitListItem) => {
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
            <span className="text-sm font-bold text-foreground hidden sm:inline">Chem Tutor</span>
          </button>
          <NavDropdown />
        </div>
      </header>

      <main className="px-6 lg:px-12 xl:px-16 py-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1">Your Learning Path</h2>
            <p className="text-muted-foreground text-sm">
              Select a unit to begin with its simulation, then practice.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search lessons, skills, or units..."
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
            <div className="flex gap-1.5 bg-secondary/60 rounded-lg p-1">
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
            <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive mb-6">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {(searchQuery || selectedLevel !== "all") && !loading && !error && (
            <p className="text-sm text-muted-foreground mb-4">
              {filteredUnits.length} unit{filteredUnits.length !== 1 ? "s" : ""} found
            </p>
          )}

          <div className="grid grid-cols-1 gap-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <UnitRowSkeleton key={i} />)
              : filteredUnits.map((unit) => (
                  <UnitRow
                    key={unit.id}
                    unit={unit}
                    courseLevel={
                      selectedLevel === "all" ? getCourseLevel(unit.course_name) : selectedLevel
                    }
                    progress={0}
                    onClick={() => handleSelectUnit(unit)}
                  />
                ))}
          </div>

          {!loading && !error && filteredUnits.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {units.length === 0
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
