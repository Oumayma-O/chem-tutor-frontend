import { useCallback, useEffect, useRef, useState } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { TEACHER_STUDENT_QUERY_PARAM, parseTeacherDashboardTab } from "@/lib/teacherDashboardTabs";

/**
 * Keeps the selected student id in sync with `?student=` on the teacher dashboard URL.
 * Selecting a student also switches to the Students tab; deep links with `?student=` sync tab when needed.
 */
export function useTeacherStudentSelectionFromUrl(options: {
  selectedClassId: string;
  loadingStudents: boolean;
  enrolledStudents: Array<{ id: string }>;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}) {
  const { selectedClassId, loadingStudents, enrolledStudents, searchParams, setSearchParams } =
    options;

  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const skipTabInject = useRef(false);

  const setSelectedStudentWithUrl = useCallback(
    (id: string | null) => {
      setSelectedStudent(id);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (id) {
            p.set(TEACHER_STUDENT_QUERY_PARAM, id);
            p.set("tab", "students");
          } else {
            p.delete(TEACHER_STUDENT_QUERY_PARAM);
          }
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleDashboardTabChange = useCallback(
    (value: string) => {
      skipTabInject.current = true;
      const next = parseTeacherDashboardTab(value) ?? "class";
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === "class") p.delete("tab");
          else p.set("tab", next);
          return p;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (loadingStudents) return;
    const sid = searchParams.get(TEACHER_STUDENT_QUERY_PARAM);
    const validIds = new Set(enrolledStudents.map((s) => s.id));

    if (selectedClassId === "all") {
      if (sid) {
        setSearchParams(
          (prev) => {
            const p = new URLSearchParams(prev);
            p.delete(TEACHER_STUDENT_QUERY_PARAM);
            return p;
          },
          { replace: true },
        );
      }
      setSelectedStudent(null);
      return;
    }

    if (sid) {
      if (!validIds.has(sid)) {
        setSelectedStudent(null);
        setSearchParams(
          (prev) => {
            const p = new URLSearchParams(prev);
            p.delete(TEACHER_STUDENT_QUERY_PARAM);
            return p;
          },
          { replace: true },
        );
      } else {
        setSelectedStudent((prev) => (prev !== sid ? sid : prev));
        if (!searchParams.has("tab")) {
          if (skipTabInject.current) {
            skipTabInject.current = false;
            return;
          }
          setSearchParams(
            (prev) => {
              const p = new URLSearchParams(prev);
              p.set("tab", "students");
              return p;
            },
            { replace: true },
          );
        }
      }
    } else {
      setSelectedStudent(null);
    }
  }, [loadingStudents, enrolledStudents, selectedClassId, searchParams, setSearchParams]);

  return { selectedStudent, setSelectedStudentWithUrl, handleDashboardTabChange };
}
