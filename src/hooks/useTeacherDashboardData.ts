import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTeacherRosterSSE } from "@/hooks/useTeacherRosterSSE";
import {
  getTeacherClasses,
  createClass,
  deleteClassroom,
  getClassRoster,
  type TeacherClass as ApiTeacherClass,
  type ClassSummaryStats,
} from "@/services/api/teacher";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export interface TeacherClassRow {
  id: string;
  name: string;
  grade_level: string | null;
  subject: string;
  class_code: string;
  timed_mode_active: boolean;
  timed_practice_minutes: number | null;
  timed_started_at: string | null;
  active_chapter_id: string | null;
  active_exit_ticket_id: string | null;
  session_phase: string | null;
  exit_ticket_time_limit_minutes: number | null;
  exit_ticket_window_started_at: string | null;
  calculator_enabled: boolean;
  /** Mirrors `classrooms.allow_answer_reveal`; default true when API omits field. */
  allow_answer_reveal: boolean;
  /**
   * Mirrors `classrooms.max_answer_reveals_per_lesson`. `null` = unlimited; omitted from API → 3.
   */
  max_answer_reveals_per_lesson: number | null;
  stats?: ClassSummaryStats;
}

export interface ClassStudentRow {
  id: string;
  name: string;
  mastery: number;
  trend: "up" | "down" | "stable";
  problems: number;
  weakTopics: string[];
  /** Milliseconds since epoch; 0 if unknown. */
  lastActive: number;
}

function mapApiTeacherClass(c: ApiTeacherClass): TeacherClassRow {
  return {
    id: c.id,
    name: c.name,
    grade_level: null,
    subject: "Chemistry",
    class_code: c.code,
    timed_mode_active: c.timed_mode_active ?? false,
    timed_practice_minutes: c.timed_practice_minutes ?? null,
    timed_started_at: c.timed_started_at ?? null,
    active_chapter_id: c.unit_id,
    active_exit_ticket_id: c.active_exit_ticket_id ?? null,
    session_phase: c.session_phase ?? null,
    exit_ticket_time_limit_minutes: c.exit_ticket_time_limit_minutes ?? null,
    exit_ticket_window_started_at: c.exit_ticket_window_started_at ?? null,
    calculator_enabled: c.calculator_enabled ?? true,
    allow_answer_reveal: c.allow_answer_reveal ?? true,
    max_answer_reveals_per_lesson:
      c.max_answer_reveals_per_lesson === undefined ? 3 : c.max_answer_reveals_per_lesson,
    stats: c.stats,
  };
}

export function useTeacherDashboardData(options?: {
  onManagedClassCountChange?: (count: number) => void;
  /** When set, the roster is scoped to this chapter/lesson so sidebar scores match the active filter. */
  rosterFilter?: { unitId?: string; lessonIndex?: number };
  /**
   * Admin/superadmin drill-in override. When provided, this class ID is used
   * directly for the roster query, bypassing teacher-class-list validation.
   * The teacher classes query is also skipped (admin has no owned classes).
   */
  viewClassId?: string;
}) {
  const { onManagedClassCountChange, rosterFilter, viewClassId } = options ?? {};
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const selectedClassStorageKey = userId
    ? `teacher_selected_class_id:${userId}`
    : "teacher_selected_class_id";
  // Use a null sentinel while classes are loading so we don't flash the "all" view
  // before we can confirm the stored class id still exists.
  const [selectedClassId, setSelectedClassIdRaw] = useState<string | null>(null);
  const setSelectedClassId = (id: string) => {
    localStorage.setItem(selectedClassStorageKey, id);
    setSelectedClassIdRaw(id);
  };

  // Skip the teacher-classes fetch when an admin override class is active — the
  // admin has no owned classes, so this query would always return [] and cause
  // the selected-class validation below to reset the ID back to "all".
  const { data: apiClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: teacherQueryKeys.classes(userId),
    queryFn: getTeacherClasses,
    enabled: Boolean(userId) && !viewClassId,
  });
  const classes = useMemo(() => apiClasses.map(mapApiTeacherClass), [apiClasses]);

  const resolvedClassId = selectedClassId ?? "all";

  // For admin drill-in the class ID comes externally; for teachers it comes from
  // their own class selection. Using separate variable avoids touching teacher
  // selection logic while giving admin the right roster.
  const rosterClassId = viewClassId ?? resolvedClassId;

  const filterUnit = rosterFilter?.unitId && rosterFilter.unitId !== "all" ? rosterFilter.unitId : undefined;
  const filterLesson = typeof rosterFilter?.lessonIndex === "number" ? rosterFilter.lessonIndex : undefined;

  const { data: rosterRaw = [], isLoading: loadingStudents } = useQuery({
    queryKey: teacherQueryKeys.roster(rosterClassId, filterUnit, filterLesson),
    queryFn: () => getClassRoster(rosterClassId, { unitId: filterUnit, lessonIndex: filterLesson }),
    enabled: rosterClassId !== "all",
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // SSE: real-time roster updates — pushes to the same cache key as the polling query.
  // Falls back silently to polling if the backend endpoint doesn't exist yet.
  useTeacherRosterSSE({
    classId: rosterClassId,
    enabled: rosterClassId !== "all",
    unitId: filterUnit,
    lessonIndex: filterLesson,
  });

  const enrolledStudents: ClassStudentRow[] = useMemo(() => {
    return rosterRaw.map((r) => {
      const m = Math.round((r.mastery?.overall_mastery ?? 0) * 100);
      const weak: string[] = [];
      const cs = r.mastery?.category_scores;
      if (cs) {
        if (cs.conceptual != null && cs.conceptual < 0.5) weak.push("conceptual");
        if (cs.procedural != null && cs.procedural < 0.5) weak.push("procedural");
        if (cs.computational != null && cs.computational < 0.5) weak.push("computational");
      }
      let lastActive = 0;
      if (r.last_activity_at) {
        const t = Date.parse(r.last_activity_at);
        if (!Number.isNaN(t)) lastActive = t;
      }
      return {
        id: r.student_id,
        name: r.name,
        mastery: m,
        trend: "stable" as const,
        problems: r.mastery?.lessons_with_data ?? 0,
        weakTopics: weak,
        lastActive,
      };
    });
  }, [rosterRaw]);

  // Once classes have loaded, resolve the stored id (or fall back to "all").
  useEffect(() => {
    if (classesLoading) return;
    const stored = localStorage.getItem(selectedClassStorageKey) ?? "all";
    if (stored !== "all" && !classes.some((c) => c.id === stored)) {
      setSelectedClassId("all");
    } else {
      setSelectedClassIdRaw(stored);
    }
  }, [classesLoading, classes, selectedClassStorageKey]);

  useEffect(() => {
    onManagedClassCountChange?.(classes.length);
  }, [classes.length, onManagedClassCountChange]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === resolvedClassId),
    [classes, resolvedClassId],
  );
  const classStats = resolvedClassId !== "all" ? selectedClass?.stats : undefined;

  const classMastery = useMemo(() => {
    // Always compute from fresh roster data — classStats.avg_mastery can be stale.
    if (enrolledStudents.length === 0) {
      return classStats ? Math.round(classStats.avg_mastery * 100) : 0;
    }
    return Math.round(enrolledStudents.reduce((a, s) => a + s.mastery, 0) / enrolledStudents.length);
  }, [classStats, enrolledStudents]);

  const atRiskStudents = useMemo(
    () => enrolledStudents.filter((s) => s.mastery < 50),
    [enrolledStudents],
  );
  const masteredStudents = useMemo(
    () => enrolledStudents.filter((s) => s.mastery >= 75),
    [enrolledStudents],
  );
  const developingStudents = useMemo(
    () => enrolledStudents.filter((s) => s.mastery >= 50 && s.mastery < 75),
    [enrolledStudents],
  );

  const detectedChapterId = useMemo(() => {
    if (resolvedClassId === "all") return null;
    return selectedClass?.active_chapter_id ?? null;
  }, [resolvedClassId, selectedClass]);

  const refetchClasses = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: teacherQueryKeys.classesRoot() });
  }, [queryClient]);

  const createTeacherClass = useCallback(
    async (name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      try {
        const created = await createClass({ name: trimmed, unit_id: null });
        refetchClasses();
        setSelectedClassId(created.id);
        toast.success("Class created! Share the class code from the Class tab.");
        return true;
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Failed to create class");
        return false;
      }
    },
    [refetchClasses],
  );

  const deleteTeacherClass = useCallback(
    async (classId: string) => {
      try {
        await deleteClassroom(classId);
        if (resolvedClassId === classId) setSelectedClassId("all");
        toast.success("Class deleted.");
        refetchClasses();
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Failed to delete class");
      }
    },
    [resolvedClassId, refetchClasses],
  );

  return {
    classes,
    classesLoading,
    selectedClassId: resolvedClassId,
    setSelectedClassId,
    rosterRaw,
    loadingStudents,
    enrolledStudents,
    selectedClass,
    classStats,
    classMastery,
    atRiskStudents,
    masteredStudents,
    developingStudents,
    detectedChapterId,
    refetchClasses,
    createTeacherClass,
    deleteTeacherClass,
  };
}
