import { useMemo, useState, useCallback } from "react";
import { Eye, Star, ChevronDown, Filter } from "lucide-react";

import { CuratedGoldExampleContent } from "@/components/admin/CuratedGoldExampleContent";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CurriculumResponse } from "@/lib/api/units";
import type { CuratedProblem } from "@/services/api/admin";
import {
  enrichCuratedExamples,
  filterCuratedExamples,
  groupByCourseChapter,
  uniqueCourseNames,
  type CourseGroup,
  type DifficultyBucket,
  type EnrichedCuratedProblem,
} from "@/lib/admin/curatedGoldGrouping";

function LevelBadge({ ex }: { ex: EnrichedCuratedProblem }) {
  const b = ex.difficulty_level;
  if (b === "other") {
    return (
      <Badge variant="outline" className="text-xs">
        {ex.difficulty}
      </Badge>
    );
  }
  const cls =
    b === "easy"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-100"
      : b === "medium"
        ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
        : "border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950/50 dark:text-red-100";
  return (
    <Badge variant="outline" className={cn("text-xs capitalize", cls)}>
      {b}
    </Badge>
  );
}

interface AdminCuratedGoldTabProps {
  curatedProblems: CuratedProblem[];
  curriculum: CurriculumResponse | undefined;
}

export function AdminCuratedGoldTab({ curatedProblems, curriculum }: AdminCuratedGoldTabProps) {
  const [search, setSearch] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [level, setLevel] = useState<DifficultyBucket | "all">("all");
  const [expandedExampleId, setExpandedExampleId] = useState<string | null>(null);
  const [coursePopoverOpen, setCoursePopoverOpen] = useState(false);

  const [openCourses, setOpenCourses] = useState<string[]>([]);
  const [openChaptersByCourse, setOpenChaptersByCourse] = useState<Record<string, string[]>>({});

  const enriched = useMemo(
    () => enrichCuratedExamples(curatedProblems, curriculum),
    [curatedProblems, curriculum],
  );

  const allCourseNames = useMemo(() => uniqueCourseNames(enriched), [enriched]);

  const filtered = useMemo(
    () =>
      filterCuratedExamples(enriched, {
        search,
        courseKeys: selectedCourses,
        level,
      }),
    [enriched, search, selectedCourses, level],
  );

  const groups = useMemo(() => groupByCourseChapter(filtered), [filtered]);

  const toggleCourse = useCallback((name: string) => {
    setSelectedCourses((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  }, []);

  const clearFilters = useCallback(() => {
    setSearch("");
    setSelectedCourses([]);
    setLevel("all");
  }, []);

  const expandAll = useCallback(() => {
    const cKeys = groups.map((g) => g.key);
    const chMap: Record<string, string[]> = {};
    for (const g of groups) {
      chMap[g.key] = g.chapters.map((c) => c.key);
    }
    setOpenCourses(cKeys);
    setOpenChaptersByCourse(chMap);
  }, [groups]);

  const collapseAll = useCallback(() => {
    setOpenCourses([]);
    setOpenChaptersByCourse({});
  }, []);

  const courseSummary =
    selectedCourses.length === 0
      ? "All courses"
      : selectedCourses.length === 1
        ? selectedCourses[0]
        : `${selectedCourses.length} selected`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">⭐ Curated Gold Examples</h2>
        <p className="text-sm text-muted-foreground">
          Curated few-shot problems (statement and steps come from the database). Grouped by course and
          unit; expand a row to preview content; raw IDs are under &quot;Raw metadata&quot;.
        </p>
      </div>

      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-end gap-3 border-b border-border/80 bg-background/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <Label htmlFor="gold-search" className="text-xs text-muted-foreground">
            Search
          </Label>
          <Input
            id="gold-search"
            placeholder="Title or statement…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="w-[min(100%,220px)] space-y-1.5">
          <span className="text-xs text-muted-foreground">Course</span>
          <Popover open={coursePopoverOpen} onOpenChange={setCoursePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 w-full justify-between font-normal" type="button">
                <span className="truncate">{courseSummary}</span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Filter by course</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedCourses([])}
                >
                  All
                </Button>
              </div>
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {allCourseNames.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No courses in data.</p>
                ) : (
                  allCourseNames.map((cn) => (
                    <label
                      key={cn}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/60"
                    >
                      <Checkbox
                        checked={selectedCourses.length === 0 ? false : selectedCourses.includes(cn)}
                        onCheckedChange={() => toggleCourse(cn)}
                      />
                      <span className="text-sm leading-tight">{cn}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Leave none checked to include every course.
              </p>
            </PopoverContent>
          </Popover>
        </div>
        <div className="w-[min(100%,160px)] space-y-1.5">
          <Label className="text-xs text-muted-foreground">Level</Label>
          <Select value={level} onValueChange={(v) => setLevel(v as DifficultyBucket | "all")}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 pb-0.5">
          <Button type="button" variant="secondary" size="sm" className="h-9" onClick={clearFilters}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Clear filters
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={expandAll}>
            Expand all
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={collapseAll}>
            Collapse all
          </Button>
        </div>
      </div>

      {curatedProblems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No curated examples returned from the API yet.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No examples match the current filters.
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="multiple"
          className="space-y-2"
          value={openCourses}
          onValueChange={setOpenCourses}
        >
          {groups.map((course: CourseGroup) => (
            <CourseAccordionBlock
              key={course.key}
              course={course}
              openChapters={openChaptersByCourse[course.key] ?? []}
              onOpenChaptersChange={(keys) =>
                setOpenChaptersByCourse((prev) => ({ ...prev, [course.key]: keys }))
              }
              expandedExampleId={expandedExampleId}
              setExpandedExampleId={setExpandedExampleId}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
}

function CourseAccordionBlock({
  course,
  openChapters,
  onOpenChaptersChange,
  expandedExampleId,
  setExpandedExampleId,
}: {
  course: CourseGroup;
  openChapters: string[];
  onOpenChaptersChange: (keys: string[]) => void;
  expandedExampleId: string | null;
  setExpandedExampleId: (id: string | null) => void;
}) {
  const total = course.chapters.reduce((n, ch) => n + ch.items.length, 0);
  return (
    <AccordionItem
      value={course.key}
      className="overflow-hidden rounded-lg border border-amber-500/25 bg-card !border-b"
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:bg-muted/40">
        <span className="text-left font-semibold text-foreground">
          {course.courseName}{" "}
          <Badge variant="secondary" className="ml-2 align-middle text-xs font-normal">
            {total}
          </Badge>
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-3 pt-0">
        <Accordion type="multiple" className="space-y-1" value={openChapters} onValueChange={onOpenChaptersChange}>
          {course.chapters.map((ch) => (
            <AccordionItem key={ch.key} value={ch.key} className="rounded border border-border/60 bg-muted/20">
              <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline [&[data-state=open]]:bg-muted/50">
                <span className="text-left font-medium">
                  {ch.chapterName}{" "}
                  <Badge variant="outline" className="ml-2 align-middle text-[10px] font-normal">
                    {ch.items.length}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-2 pt-0">
                <ul className="space-y-2">
                  {ch.items.map((ex) => {
                    const exKey = String(ex.id);
                    return (
                      <li key={exKey}>
                        <Card className={ex.is_active ? "border-amber-500/40" : "opacity-60"}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                <Star
                                  className={`h-4 w-4 shrink-0 ${ex.is_active ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`}
                                />
                                <span className="min-w-0 font-medium text-sm text-foreground line-clamp-2">
                                  {ex.title?.trim() || `${ex.unit_id} · lesson ${ex.lesson_index}`}
                                  {ex.promoted ? " · promoted" : ""}
                                </span>
                                <LevelBadge ex={ex} />
                                {ex.strategy ? (
                                  <Badge
                                    variant="secondary"
                                    className="max-w-[140px] truncate text-xs"
                                    title={ex.strategy ?? undefined}
                                  >
                                    {ex.strategy}
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(ex.created_at).toLocaleDateString()}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  type="button"
                                  onClick={() =>
                                    setExpandedExampleId(expandedExampleId === exKey ? null : exKey)
                                  }
                                  aria-expanded={expandedExampleId === exKey}
                                  aria-label="View details and raw metadata"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            {expandedExampleId === exKey ? <CuratedGoldExampleContent ex={ex} /> : null}
                          </CardContent>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </AccordionContent>
    </AccordionItem>
  );
}
