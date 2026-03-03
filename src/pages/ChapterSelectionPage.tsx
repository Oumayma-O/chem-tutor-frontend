import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChapters } from "@/hooks/useChapters";
import { COURSE_LEVELS, CourseLevel, getCourseLevel } from "@/data/chapters";
import { type ChapterListItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Lock, ArrowRight, Search, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavDropdown } from "@/components/tutor/NavDropdown";
import { BeakerMascot } from "@/components/tutor/BeakerMascot";

function inferCourseLevel(gradeLevel: string | null): CourseLevel | "all" {
  if (!gradeLevel) return "all";
  const gl = gradeLevel.toLowerCase();
  if (gl.includes("ap") || gl.includes("advanced")) return "ap";
  if (
    gl.includes("high-school") ||
    gl.includes("honors") ||
    gl.includes("high school") ||
    gl.includes("11") ||
    gl.includes("12")
  )
    return "high-school";
  if (gl.includes("middle") || gl.includes("intro")) return "intro";
  return "all";
}

// ── Skeleton card ────────────────────────────────────────────────────────────

function ChapterCardSkeleton() {
  return (
    <Card className="border-2 border-border animate-pulse">
      <CardHeader className="pb-3 pt-6">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl bg-secondary/60" />
          <div className="w-16 h-5 rounded-full bg-secondary/60" />
        </div>
        <div className="mt-3 h-4 w-3/4 rounded bg-secondary/60" />
        <div className="mt-2 h-3 w-full rounded bg-secondary/40" />
        <div className="mt-1 h-3 w-2/3 rounded bg-secondary/40" />
      </CardHeader>
      <CardContent className="pt-0 pb-5">
        <div className="flex gap-1.5 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-5 w-16 rounded-full bg-secondary/50" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ChapterSelectionPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { chapters, loading, error } = useChapters();
  const [searchQuery, setSearchQuery] = useState("");

  const autoLevel = inferCourseLevel(profile?.grade_level ?? null);
  const [selectedLevel, setSelectedLevel] = useState<CourseLevel | "all">(autoLevel);

  useEffect(() => {
    if (autoLevel !== "all") setSelectedLevel(autoLevel);
  }, [autoLevel]);

  const filteredChapters = useMemo(() => {
    return chapters.filter((ch) => {
      const matchesSearch =
        !searchQuery ||
        ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.topic_titles.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const chLevel = getCourseLevel(ch.course_name);
      const matchesLevel = selectedLevel === "all" || chLevel === selectedLevel;
      return matchesSearch && matchesLevel;
    });
  }, [chapters, searchQuery, selectedLevel]);

  const handleSelectChapter = (chapter: ChapterListItem) => {
    if (chapter.is_coming_soon || !chapter.is_active) return;
    navigate(`/chapter/${chapter.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
              Select a chapter to begin with its simulation, then practice.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search topics, skills, or chapters..."
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

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive mb-6">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {(searchQuery || selectedLevel !== "all") && !loading && !error && (
            <p className="text-sm text-muted-foreground mb-4">
              {filteredChapters.length} chapter{filteredChapters.length !== 1 ? "s" : ""} found
            </p>
          )}

          {/* Chapter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <ChapterCardSkeleton key={i} />)
              : filteredChapters.map((chapter) => {
                  const available = chapter.is_active && !chapter.is_coming_soon;
                  return (
                    <Card
                      key={chapter.id}
                      className={cn(
                        "transition-all group relative overflow-hidden border-2",
                        available
                          ? "cursor-pointer hover:shadow-card-elevated hover:border-primary/40 hover:-translate-y-1"
                          : "opacity-40 cursor-not-allowed border-border",
                      )}
                      onClick={() => handleSelectChapter(chapter)}
                    >
                      {available && (
                        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-primary/80 to-accent/60" />
                      )}
                      <CardHeader className="pb-3 pt-6">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl group-hover:bg-primary/15 transition-colors">
                            {chapter.icon}
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            {chapter.course_name && (
                              <Badge variant="outline" className="text-[10px] font-medium">
                                {chapter.course_name}
                              </Badge>
                            )}
                            {!available && (
                              <Badge variant="secondary" className="gap-1 text-[10px]">
                                <Lock className="w-2.5 h-2.5" />
                                Coming Soon
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-base mt-3">{chapter.title}</CardTitle>
                        <CardDescription className="text-xs leading-relaxed">
                          {chapter.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 pb-5">
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {chapter.topic_titles.slice(0, 3).map((topic) => (
                            <Badge key={topic} variant="outline" className="text-[10px] bg-secondary/40">
                              {topic}
                            </Badge>
                          ))}
                          {chapter.topic_titles.length > 3 && (
                            <Badge variant="outline" className="text-[10px] bg-secondary/40">
                              +{chapter.topic_titles.length - 3} more
                            </Badge>
                          )}
                        </div>
                        {available && (
                          <div className="flex items-center justify-end pt-2 border-t border-border">
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
          </div>

          {!loading && !error && filteredChapters.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground">
                {chapters.length === 0
                  ? "No chapters available yet. Check back soon!"
                  : "No chapters match your search. Try different keywords or adjust the filter."}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
