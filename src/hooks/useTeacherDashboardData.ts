import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTeacherClasses,
  createClass,
  getClassRoster,
  type TeacherClass as ApiTeacherClass,
  type ClassSummaryStats,
} from "@/services/api/teacher";
import { toast } from "sonner";

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
  stats?: ClassSummaryStats;
}

export interface ClassStudentRow {
  id: string;
  name: string;
  mastery: number;
  trend: "up" | "down" | "stable";
  problems: number;
  weakTopics: string[];
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
    stats: c.stats,
  };
}

export function useTeacherDashboardData(options?: {
  onManagedClassCountChange?: (count: number) => void;
}) {
  const { onManagedClassCountChange } = options ?? {};
  const queryClient = useQueryClient();
  // Use a null sentinel while classes are loading so we don't flash the "all" view
  // before we can confirm the stored class id still exists.
  const [selectedClassId, setSelectedClassIdRaw] = useState<string | null>(null);
  const setSelectedClassId = (id: string) => {
    localStorage.setItem("teacher_selected_class_id", id);
    setSelectedClassIdRaw(id);
  };

  const { data: apiClasses = [], isLoading: classesLoading } = useQuery({
    queryKey: ["teacher", "classes"],
    queryFn: getTeacherClasses,
  });
  const classes = useMemo(() => apiClasses.map(mapApiTeacherClass), [apiClasses]);

  const resolvedClassId = selectedClassId ?? "all";

  const { data: rosterRaw = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["teacher", "roster", resolvedClassId],
    queryFn: () => getClassRoster(resolvedClassId),
    enabled: resolvedClassId !== "all" && selectedClassId !== null,
  });

  const enrolledStudents: ClassStudentRow[] = useMemo(() => {
    return rosterRaw.map((r) => {
      const m = Math.round((r.mastery?.overall_mastery ?? 0) * 100);
      const weak: string[] = [];
      const cs = r.mastery?.category_scores;
      if (cs) {
        if (cs.conceptual < 0.5) weak.push("conceptual");
        if (cs.procedural < 0.5) weak.push("procedural");
        if (cs.computational < 0.5) weak.push("computational");
      }
      return {
        id: r.student_id,
        name: r.name,
        mastery: m,
        trend: "stable" as const,
        problems: r.mastery?.lessons_with_data ?? 0,
        weakTopics: weak,
        lastActive: Date.now(),
      };
    });
  }, [rosterRaw]);

  // Once classes have loaded, resolve the stored id (or fall back to "all").
  useEffect(() => {
    if (classesLoading) return;
    const stored = localStorage.getItem("teacher_selected_class_id") ?? "all";
    if (stored !== "all" && !classes.some((c) => c.id === stored)) {
      setSelectedClassId("all");
    } else {
      setSelectedClassIdRaw(stored);
    }
  }, [classesLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onManagedClassCountChange?.(classes.length);
  }, [classes.length, onManagedClassCountChange]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === resolvedClassId),
    [classes, resolvedClassId],
  );
  const classStats = resolvedClassId !== "all" ? selectedClass?.stats : undefined;

  const displayStudents = enrolledStudents;

  const classMastery = useMemo(() => {
    if (classStats) return Math.round(classStats.avg_mastery * 100);
    if (displayStudents.length === 0) return 0;
    return Math.round(displayStudents.reduce((a, s) => a + s.mastery, 0) / displayStudents.length);
  }, [classStats, displayStudents]);

  const atRiskStudents = useMemo(
    () => displayStudents.filter((s) => s.mastery < 50),
    [displayStudents],
  );
  const masteredStudents = useMemo(
    () => displayStudents.filter((s) => s.mastery >= 75),
    [displayStudents],
  );
  const developingStudents = useMemo(
    () => displayStudents.filter((s) => s.mastery >= 50 && s.mastery < 75),
    [displayStudents],
  );

  const detectedChapterId = useMemo(() => {
    if (resolvedClassId === "all") return null;
    return selectedClass?.active_chapter_id ?? null;
  }, [resolvedClassId, selectedClass]);

  const refetchClasses = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["teacher", "classes"] });
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
        if (resolvedClassId === classId) setSelectedClassId("all");
        toast.info("Archive/delete for classrooms is not exposed in the API yet.");
        refetchClasses();
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete class");
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
    displayStudents,
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
