/**
 * Bug Condition Exploration Test — Property 1
 *
 * Validates: Requirements 1.1, 1.2
 *
 * CRITICAL: This test MUST FAIL on unfixed code.
 * Failure confirms the bug exists: the useEffect re-injects tab=students
 * after handleDashboardTabChange("class") removes the tab param.
 *
 * This test encodes the EXPECTED behavior — it will pass once the fix is applied.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTeacherStudentSelectionFromUrl } from "./useTeacherStudentSelectionFromUrl";
import { parseTeacherDashboardTab } from "@/lib/teacherDashboardTabs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal URLSearchParams + setSearchParams pair that mirrors
 * how react-router-dom's useSearchParams works in the component.
 *
 * setSearchParams accepts either a URLSearchParams updater function or a
 * plain URLSearchParams value (we only need the updater form here).
 */
function makeSearchParamsState(initial: Record<string, string>) {
  let current = new URLSearchParams(initial);

  // Capture the latest params so tests can read them after effects settle
  const getParams = () => current;

  const setSearchParams = vi.fn((updater: (prev: URLSearchParams) => URLSearchParams) => {
    current = updater(current);
  });

  return { getParams, setSearchParams, current: () => current };
}

// ---------------------------------------------------------------------------
// isBugCondition helper (mirrors the formal spec in design.md)
// ---------------------------------------------------------------------------
function isBugCondition(
  searchParams: URLSearchParams,
  navigationSource: "user-tab-click" | "page-load" | "other",
): boolean {
  return (
    searchParams.has("student") &&
    !searchParams.has("tab") &&
    navigationSource === "user-tab-click"
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Property 1: Bug Condition — User-Initiated Tab Change Is Not Overridden", () => {
  /**
   * Scoped PBT: concrete failing case
   *   Start: ?student=abc&tab=students, abc is enrolled
   *   Action: handleDashboardTabChange("class") → deletes tab param → ?student=abc
   *   Expected: searchParams.get("tab") === null, dashboardTab === "class"
   *   On unfixed code: FAILS because effect re-injects tab=students
   */
  it("after clicking the Class tab with a student selected, tab param should be null and dashboardTab should be class", async () => {
    // --- Setup ---
    const enrolledStudents = [{ id: "abc" }];
    const { getParams, setSearchParams } = makeSearchParamsState({
      student: "abc",
      tab: "students",
    });

    const { result, rerender } = renderHook(
      ({
        searchParams,
        enrolled,
      }: {
        searchParams: URLSearchParams;
        enrolled: Array<{ id: string }>;
      }) =>
        useTeacherStudentSelectionFromUrl({
          selectedClassId: "class-1",
          loadingStudents: false,
          enrolledStudents: enrolled,
          searchParams,
          setSearchParams,
        }),
      { initialProps: { searchParams: getParams(), enrolled: enrolledStudents } },
    );

    // Confirm initial state: student is selected, tab=students
    expect(result.current.selectedStudent).toBe("abc");

    // --- Simulate handleDashboardTabChange("class") ---
    // Call the hook's own handleDashboardTabChange, which sets skipTabInject.current = true
    // before mutating searchParams — this is the fix.
    act(() => {
      result.current.handleDashboardTabChange("class");
    });

    // Re-render the hook with the updated searchParams so the useEffect fires
    rerender({ searchParams: getParams(), enrolled: enrolledStudents });

    // Allow all effects to settle
    await act(async () => {});

    // Re-render once more to pick up any setSearchParams calls made by the effect
    rerender({ searchParams: getParams(), enrolled: enrolledStudents });
    await act(async () => {});

    // --- Assertions ---
    const finalParams = getParams();
    const dashboardTab = parseTeacherDashboardTab(finalParams.get("tab"));

    // EXPECTED (correct behavior):
    //   finalParams.get("tab") === null  (Class tab is default, no tab param)
    //   dashboardTab === "class"
    //
    // ON UNFIXED CODE this test FAILS because:
    //   the useEffect sees ?student=abc with no tab and re-injects tab=students
    //   so finalParams.get("tab") returns "students" instead of null
    //   and dashboardTab returns "students" instead of "class"

    expect(finalParams.get("tab")).toBeNull();
    expect(dashboardTab).toBeNull(); // null = default tab ("class"), resolved by consumer via ?? "class"
  });

  /**
   * Additional scoped case: clicking Analytics tab should set tab=analytics
   * (this one is NOT affected by the bug since tab param is present after the click,
   *  but verifies no regression in the non-class-tab path)
   */
  it("after clicking the Analytics tab with a student selected, tab param should be analytics", async () => {
    const enrolledStudents = [{ id: "abc" }];
    const { getParams, setSearchParams } = makeSearchParamsState({
      student: "abc",
      tab: "students",
    });

    const { result, rerender } = renderHook(
      ({
        searchParams,
        enrolled,
      }: {
        searchParams: URLSearchParams;
        enrolled: Array<{ id: string }>;
      }) =>
        useTeacherStudentSelectionFromUrl({
          selectedClassId: "class-1",
          loadingStudents: false,
          enrolledStudents: enrolled,
          searchParams,
          setSearchParams,
        }),
      { initialProps: { searchParams: getParams(), enrolled: enrolledStudents } },
    );

    // Simulate handleDashboardTabChange("analytics")
    act(() => {
      result.current.handleDashboardTabChange("analytics");
    });

    rerender({ searchParams: getParams(), enrolled: enrolledStudents });
    await act(async () => {});
    rerender({ searchParams: getParams(), enrolled: enrolledStudents });
    await act(async () => {});

    const finalParams = getParams();
    expect(finalParams.get("tab")).toBe("analytics");
    expect(parseTeacherDashboardTab(finalParams.get("tab"))).toBe("analytics");
  });
});

/**
 * Preservation Property Tests — Property 2
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * These tests MUST PASS on unfixed code (they capture baseline behavior to preserve).
 * They must also pass after the fix is applied (regression prevention).
 *
 * Observation-first methodology: each test was written after observing the actual
 * behavior of the unfixed hook.
 */

import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Helpers (shared with Property 1 tests above)
// ---------------------------------------------------------------------------

function makeSearchParamsStatePreservation(initial: Record<string, string>) {
  let current = new URLSearchParams(initial);
  const getParams = () => current;
  const setSearchParams = vi.fn((updater: (prev: URLSearchParams) => URLSearchParams) => {
    current = updater(current);
  });
  return { getParams, setSearchParams };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generate a valid student ID: non-empty alphanumeric string */
const studentIdArb = fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/).filter((s) => s.length > 0);

/** Generate a list of enrolled students (1–5 students) */
const enrolledStudentsArb = fc
  .uniqueArray(studentIdArb, { minLength: 1, maxLength: 5 })
  .map((ids) => ids.map((id) => ({ id })));

/** Generate searchParams that have ?student= but NO ?tab= (deep-link scenario) */
const deepLinkParamsArb = (studentId: string) =>
  fc.constant(new URLSearchParams({ student: studentId }));

/** Generate searchParams WITHOUT ?student= (various combinations) */
const noStudentParamsArb = fc.record({
  tab: fc.option(
    fc.constantFrom("class", "analytics", "students", "standards", "exit-tickets", "settings"),
    { nil: undefined },
  ),
}).map(({ tab }) => {
  const p = new URLSearchParams();
  if (tab !== undefined) p.set("tab", tab);
  return p;
});

// ---------------------------------------------------------------------------
// Property 2 Tests
// ---------------------------------------------------------------------------

describe("Property 2: Preservation — Deep-Link Auto-Switch and Existing Behaviors Unchanged", () => {
  /**
   * Req 3.1: page load with ?student=<id> (no tab) → effect sets tab=students
   *
   * For any valid enrolled student ID, loading the hook with ?student=<id> and no tab
   * param should cause the effect to inject tab=students.
   */
  it("3.1 deep-link: ?student=<id> with no tab → effect sets tab=students", async () => {
    await fc.assert(
      fc.asyncProperty(studentIdArb, async (studentId) => {
        const enrolledStudents = [{ id: studentId }];
        const { getParams, setSearchParams } = makeSearchParamsStatePreservation({
          student: studentId,
        });

        const { rerender } = renderHook(
          ({ searchParams }: { searchParams: URLSearchParams }) =>
            useTeacherStudentSelectionFromUrl({
              selectedClassId: "class-1",
              loadingStudents: false,
              enrolledStudents,
              searchParams,
              setSearchParams,
            }),
          { initialProps: { searchParams: getParams() } },
        );

        await act(async () => {});
        rerender({ searchParams: getParams() });
        await act(async () => {});

        const finalParams = getParams();
        // Effect must have injected tab=students for the deep-link case
        return finalParams.get("tab") === "students";
      }),
      { numRuns: 20 },
    );
  });

  /**
   * Req 3.2: setSelectedStudentWithUrl(null) → ?student= is removed from URL
   *
   * For any student that is currently selected, calling setSelectedStudentWithUrl(null)
   * must remove the ?student= param from the URL.
   */
  it("3.2 back-to-list: setSelectedStudentWithUrl(null) removes ?student= from URL", async () => {
    await fc.assert(
      fc.asyncProperty(studentIdArb, async (studentId) => {
        const enrolledStudents = [{ id: studentId }];
        const { getParams, setSearchParams } = makeSearchParamsStatePreservation({
          student: studentId,
          tab: "students",
        });

        const { result, rerender } = renderHook(
          ({ searchParams }: { searchParams: URLSearchParams }) =>
            useTeacherStudentSelectionFromUrl({
              selectedClassId: "class-1",
              loadingStudents: false,
              enrolledStudents,
              searchParams,
              setSearchParams,
            }),
          { initialProps: { searchParams: getParams() } },
        );

        await act(async () => {});
        rerender({ searchParams: getParams() });
        await act(async () => {});

        // Call setSelectedStudentWithUrl(null) — simulates "Back to all students"
        act(() => {
          result.current.setSelectedStudentWithUrl(null);
        });

        rerender({ searchParams: getParams() });
        await act(async () => {});

        const finalParams = getParams();
        // ?student= must be gone
        return !finalParams.has("student");
      }),
      { numRuns: 20 },
    );
  });

  /**
   * Req 3.3: class change where student not in new class → ?student= is removed
   *
   * For any enrolled student list and a new class that doesn't contain the current student,
   * changing selectedClassId must clear the student selection.
   */
  it("3.3 class-change: student not in new class → ?student= is cleared", async () => {
    await fc.assert(
      fc.asyncProperty(
        studentIdArb,
        enrolledStudentsArb,
        async (selectedStudentId, newClassStudents) => {
          // Ensure the selected student is NOT in the new class
          const newClassWithoutStudent = newClassStudents.filter(
            (s) => s.id !== selectedStudentId,
          );

          const { getParams, setSearchParams } = makeSearchParamsStatePreservation({
            student: selectedStudentId,
            tab: "students",
          });

          // Initial render: student is enrolled in class-1
          const { rerender } = renderHook(
            ({
              searchParams,
              selectedClassId,
              enrolledStudents,
            }: {
              searchParams: URLSearchParams;
              selectedClassId: string;
              enrolledStudents: Array<{ id: string }>;
            }) =>
              useTeacherStudentSelectionFromUrl({
                selectedClassId,
                loadingStudents: false,
                enrolledStudents,
                searchParams,
                setSearchParams,
              }),
            {
              initialProps: {
                searchParams: getParams(),
                selectedClassId: "class-1",
                enrolledStudents: [{ id: selectedStudentId }],
              },
            },
          );

          await act(async () => {});
          rerender({
            searchParams: getParams(),
            selectedClassId: "class-1",
            enrolledStudents: [{ id: selectedStudentId }],
          });
          await act(async () => {});

          // Switch to a new class that does NOT contain the student
          rerender({
            searchParams: getParams(),
            selectedClassId: "class-2",
            enrolledStudents: newClassWithoutStudent,
          });
          await act(async () => {});
          rerender({
            searchParams: getParams(),
            selectedClassId: "class-2",
            enrolledStudents: newClassWithoutStudent,
          });
          await act(async () => {});

          const finalParams = getParams();
          // ?student= must be cleared when student is not in the new class
          return !finalParams.has("student");
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Req 3.4: valid ?student=<id>&tab=students deep link → selectedStudent === id
   *
   * For any enrolled student, loading with ?student=<id>&tab=students must resolve
   * selectedStudent to that id.
   */
  it("3.4 valid deep link: ?student=<id>&tab=students → selectedStudent === id", async () => {
    await fc.assert(
      fc.asyncProperty(studentIdArb, async (studentId) => {
        const enrolledStudents = [{ id: studentId }];
        const { getParams, setSearchParams } = makeSearchParamsStatePreservation({
          student: studentId,
          tab: "students",
        });

        const { result, rerender } = renderHook(
          ({ searchParams }: { searchParams: URLSearchParams }) =>
            useTeacherStudentSelectionFromUrl({
              selectedClassId: "class-1",
              loadingStudents: false,
              enrolledStudents,
              searchParams,
              setSearchParams,
            }),
          { initialProps: { searchParams: getParams() } },
        );

        await act(async () => {});
        rerender({ searchParams: getParams() });
        await act(async () => {});

        // selectedStudent must be the deep-linked student id
        return result.current.selectedStudent === studentId;
      }),
      { numRuns: 20 },
    );
  });

  /**
   * Req 3.1 (no-op variant): searchParams without ?student= → effect is a no-op
   *
   * For any searchParams that do NOT have a ?student= param, the effect must not
   * inject tab=students or otherwise mutate the URL.
   */
  it("no-op: searchParams without ?student= → effect does not inject tab=students", async () => {
    await fc.assert(
      fc.asyncProperty(noStudentParamsArb, enrolledStudentsArb, async (initialParams, enrolled) => {
        const initialTab = initialParams.get("tab");
        const { getParams, setSearchParams } = makeSearchParamsStatePreservation(
          Object.fromEntries(initialParams.entries()),
        );

        const { rerender } = renderHook(
          ({ searchParams }: { searchParams: URLSearchParams }) =>
            useTeacherStudentSelectionFromUrl({
              selectedClassId: "class-1",
              loadingStudents: false,
              enrolledStudents: enrolled,
              searchParams,
              setSearchParams,
            }),
          { initialProps: { searchParams: getParams() } },
        );

        await act(async () => {});
        rerender({ searchParams: getParams() });
        await act(async () => {});

        const finalParams = getParams();
        // tab param must not have been changed to "students" when there was no ?student=
        // (it should remain whatever it was, or null)
        return finalParams.get("tab") === initialTab;
      }),
      { numRuns: 30 },
    );
  });
});
