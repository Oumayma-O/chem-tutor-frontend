/**
 * useProblemNavigation — owns problem loading, level/problem caching,
 * localStorage persistence, prev/next navigation, and level switching.
 */

import {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  MutableRefObject,
  Dispatch,
  SetStateAction,
} from "react";
import { Level, Problem, StudentAnswer } from "@/types/chemistry";
import { ThinkingStep, ClassifiedError } from "@/types/cognitive";
import { ProblemPagination } from "@/lib/api";
import {
  apiStartAttempt,
  apiNavigateProblem,
} from "@/lib/api";
import { useGeneratedProblem, parseProblemOutput, type GenerateResult } from "@/hooks/useGeneratedProblem";
import { toast } from "sonner";
import {
  getTutorSessionStorageKey,
  readTutorSessionSnapshot,
  updateTutorSessionLevelOnly,
  writeTutorSessionSnapshot,
} from "@/lib/tutorSessionStorage";

// ── Shared types (exported for use in ChemistryTutor.tsx) ───────────────────

export interface LevelCacheEntry {
  problem: Problem;
  answers: Record<string, StudentAnswer>;
  hints: Record<string, string>;
  structuredStepComplete: Record<string, boolean>;
  pagination: ProblemPagination | null;
  difficulty: "easy" | "medium" | "hard";
  thinkingSteps?: ThinkingStep[];
  classifiedErrors?: ClassifiedError[];
}

export interface PerProblemState {
  answers: Record<string, StudentAnswer>;
  hints: Record<string, string>;
  structuredStepComplete: Record<string, boolean>;
}

/** Setters from useStepHandlers + useCognitiveTracking passed via ref to avoid circular hook deps. */
export interface StepSetters {
  setAnswers: Dispatch<SetStateAction<Record<string, StudentAnswer>>>;
  setHints: Dispatch<SetStateAction<Record<string, string>>>;
  setHintLoading: Dispatch<SetStateAction<Set<string>>>;
  setStructuredStepComplete: Dispatch<SetStateAction<Record<string, boolean>>>;
  resetTracking: () => void;
  setThinkingSteps: (steps: ThinkingStep[]) => void;
  setClassifiedErrors: (errors: ClassifiedError[]) => void;
}

export function defaultPaginationForLevel(level: Level): ProblemPagination {
  const maxProblems = level === 1 ? 3 : 5;
  return {
    current_index: 0,
    total: 1,
    max_problems: maxProblems,
    has_prev: false,
    has_next: true,
    at_limit: false,
  };
}

/** Build the canonical Level 1 client-side pagination from an index + total. */
function makeLevel1Pagination(curIdx: number, total: number): ProblemPagination {
  return {
    current_index: curIdx,
    total,
    max_problems: 3,
    has_prev: curIdx > 0,
    has_next: curIdx < total - 1,
    at_limit: total >= 3,
  };
}

/**
 * localStorage may hold an old snapshot of the same problem id without `input_fields`
 * on `multi_input` steps. The live API JSON can be correct while the UI still shows "-"
 * because restore skips `parseProblemOutput`. Reject that snapshot so we load fresh.
 */
function cachedProblemHasBrokenMultiInput(problem: Problem): boolean {
  return problem.steps.some(
    (s) =>
      s.type === "multi_input" && !(s.input_fields?.length ?? 0),
  );
}

// ── Hook interface ──────────────────────────────────────────────────────────

interface UseProblemNavigationOptions {
  unitId: string;
  lessonIndex: number;
  lessonName: string;
  userId?: string;
  interests: string[];
  gradeLevel: string | null;
  masteryScore: number;
  masteryScoreRef: MutableRefObject<number>;
  hasCompletedLevel2Ref: MutableRefObject<boolean>;
  /** Latest answers/hints/structuredStepComplete — synced from useStepHandlers via useLayoutEffect. */
  stepStateRef: MutableRefObject<{
    answers: Record<string, StudentAnswer>;
    hints: Record<string, string>;
    structuredStepComplete: Record<string, boolean>;
  }>;
  /** Latest cognitive tracking state — synced from useCognitiveTracking via useLayoutEffect. */
  cognitiveStateRef: MutableRefObject<{
    thinkingSteps: ThinkingStep[];
    classifiedErrors: ClassifiedError[];
  }>;
  /** Step state setters — populated after useStepHandlers is called, before any useEffect runs. */
  stepSettersRef: MutableRefObject<StepSetters>;
  onMarkInProgress?: () => void;
  /** Called when a new attempt is started (or cleared). */
  onAttemptStart: (attemptId: string | null) => void;
  /** Called during localStorage restore when a saved mastery score exists. */
  onRestoreMasteryScore?: (score: number) => void;
  /** Called during localStorage restore when level3 was previously unlocked. */
  onRestoreHasCompletedLevel2?: () => void;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useProblemNavigation({
  unitId,
  lessonIndex,
  lessonName,
  userId,
  interests,
  gradeLevel,
  masteryScore,
  masteryScoreRef,
  hasCompletedLevel2Ref,
  stepStateRef,
  cognitiveStateRef,
  stepSettersRef,
  onMarkInProgress,
  onAttemptStart,
  onRestoreMasteryScore,
  onRestoreHasCompletedLevel2,
}: UseProblemNavigationOptions) {
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [currentLevel, setCurrentLevel] = useState<Level>(1);
  const [pagination, setPagination] = useState<ProblemPagination | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentDifficulty, setCurrentDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [problemLoading, setProblemLoading] = useState(true);
  const [completedProblemIds, setCompletedProblemIds] = useState<string[]>([]);
  const [levelSolved, setLevelSolved] = useState<Record<Level, number>>({ 1: 0, 2: 0, 3: 0 });

  const levelCacheRef = useRef<Partial<Record<Level, LevelCacheEntry>>>({});
  const perProblemCacheRef = useRef<Record<string, PerProblemState>>({});
  const persistOnUnmountRef = useRef<() => void>(() => {});
  const hasInitializedRef = useRef(false);
  const prefetchedProblem = useRef<Problem | null>(null);
  const prefetchedLevel = useRef<number>(0);
  const prefetchInFlight = useRef(false);
  /** When non-null, a prefetch for this level is in progress; loadNewProblem can await it. */
  const prefetchPromiseRef = useRef<{ promise: Promise<GenerateResult>; level: number } | null>(null);
  /** Per-level lock: true while an active API call (in-flight await or fresh generate) is in
   *  the slow path for that level. Prevents concurrent fresh-generate calls from different
   *  entry points (handleContinueAfterProgression + tab click) creating duplicate problems. */
  const isFetchingLevelRef = useRef<Partial<Record<Level, boolean>>>({});
  const lastMarkedRef = useRef<string>("");
  // Tracks ALL Level 1 examples the user has already seen so they are properly excluded
  // when requesting a new one. Lives as a ref to avoid mixing with Level 2/3 completedProblemIds.
  const seenLevel1IdsRef = useRef<string[]>([]);
  // Level 1: cache of problems in order so Prev/Next show the correct example (avoids backend returning wrong/duplicate).
  const level1ProblemsRef = useRef<Problem[]>([]);
  // Background generation state for Level 1 "See Another" — true while a bg fetch is in flight.
  const [isBackgroundGenerating, setIsBackgroundGenerating] = useState(false);
  const backgroundGenRef = useRef(false);

  // Snapshot of nav-owned state — always current (updated before effects fire).
  const stateSnapshot = useRef({
    currentProblem: null as Problem | null,
    currentLevel: 1 as Level,
    pagination: null as ProblemPagination | null,
    currentDifficulty: "medium" as "easy" | "medium" | "hard",
    completedProblemIds: [] as string[],
  });

  useLayoutEffect(() => {
    stateSnapshot.current = {
      currentProblem,
      currentLevel,
      pagination,
      currentDifficulty,
      completedProblemIds,
    };
  }); // no deps — runs after every render

  // ── Problem generation ────────────────────────────────────────────────────

  const { generate: generateProblem } = useGeneratedProblem({
  unitId,
  lessonIndex,
  lessonName,
    interests,
    gradeLevel,
    masteryScore,
    userId,
  });

  const startAttemptForProblem = useCallback(
    (problem: Problem, difficulty: "easy" | "medium" | "hard", level: number) => {
      if (!userId) {
        onAttemptStart(null);
        return;
      }
      apiStartAttempt({
        user_id: userId,
        unit_id: unitId,
        lesson_index: lessonIndex,
        problem_id: problem.id,
        difficulty,
        level,
      })
        .then(({ attempt_id }) => onAttemptStart(attempt_id))
        .catch(() => onAttemptStart(null));
    },
    [userId, unitId, lessonIndex, onAttemptStart],
  );

  const triggerPrefetch = useCallback(
    (difficulty: "easy" | "medium" | "hard", excludeIds: string[], level: number) => {
      if (prefetchInFlight.current) return;
      const levelToPrefetch = level;
      const start = () => {
        if (prefetchInFlight.current) return;
        prefetchInFlight.current = true;
        prefetchPromiseRef.current = null;
        const promise = generateProblem(difficulty, excludeIds, levelToPrefetch)
          .then((result) => {
            prefetchedProblem.current = result.problem;
            prefetchedLevel.current = levelToPrefetch;
            // Eagerly populate levelCacheRef so handleLevelChange finds the problem via the
            // cache check and never falls through to loadNewProblem — eliminates duplicate calls.
            if (!levelCacheRef.current[levelToPrefetch as Level]) {
              levelCacheRef.current[levelToPrefetch as Level] = {
                problem: result.problem,
                answers: {},
                hints: {},
                structuredStepComplete: {},
                pagination: result.pagination ?? defaultPaginationForLevel(levelToPrefetch as Level),
                difficulty: result.problem.difficulty as "easy" | "medium" | "hard",
              };
            }
            return result;
          })
          .catch(() => {
            prefetchedProblem.current = null;
            prefetchedLevel.current = 0;
            throw new Error("Prefetch failed");
          })
          .finally(() => {
            prefetchInFlight.current = false;
            prefetchPromiseRef.current = null;
          });
        prefetchPromiseRef.current = { promise, level: levelToPrefetch };
      };
      // Eager loading: Level 3 prefetch starts immediately when Level 2 is active (zero-wait transition).
      // Level 2 prefetch after Level 1 uses a short delay to avoid hammering the API.
      const delayMs = levelToPrefetch === 3 ? 0 : 400;
      setTimeout(start, delayMs);
    },
    [generateProblem],
  );

  const prefetchNextLevelIfNeeded = useCallback(
    (difficulty: "easy" | "medium" | "hard", level: number) => {
      if (level >= 3) return;
      const nextLevel = level + 1;
      const nextAlreadyReady =
        prefetchedLevel.current === nextLevel ||
        !!levelCacheRef.current[nextLevel as Level];
      if (!nextAlreadyReady) {
        triggerPrefetch(difficulty, [], nextLevel);
      }
    },
    [triggerPrefetch],
  );

  const applyPrefetchedProblem = useCallback(
    (
      p: Problem,
      level: number,
      difficulty: "easy" | "medium" | "hard",
    ): void => {
      prefetchedProblem.current = null;
      prefetchedLevel.current = 0;
      setCurrentProblem(p);
      setPagination(defaultPaginationForLevel(level as Level));
      setCurrentDifficulty(p.difficulty as "easy" | "medium" | "hard");
      if (level === 1 && level1ProblemsRef.current.length === 0) level1ProblemsRef.current[0] = p;
      setProblemLoading(false);
      startAttemptForProblem(p, difficulty, level);
      // Prefetch next level opportunistically to reduce transition latency.
      prefetchNextLevelIfNeeded(difficulty, level);
    },
    [startAttemptForProblem, prefetchNextLevelIfNeeded],
  );

  const loadNewProblem = useCallback(
    async (
      difficulty: "easy" | "medium" | "hard",
      excludeIds: string[],
      level: number,
      forceRegenerate = false,
    ): Promise<Problem | null> => {
      // force_regenerate bypasses the module prefetch cache and the backend playlist resume.
      if (
        !forceRegenerate &&
        prefetchedProblem.current &&
        prefetchedLevel.current === level &&
        !excludeIds.includes(prefetchedProblem.current.id)
      ) {
        const p = prefetchedProblem.current;
        applyPrefetchedProblem(p, level, difficulty);
        return p;
      }
      // ── In-flight path: a background prefetch is already running for this level ──
      // Only one caller should wait on it; subsequent callers bail out immediately.
      // Skip when force_regenerate=true since we need a brand-new problem.
      const inFlight = prefetchPromiseRef.current;
      if (!forceRegenerate && inFlight?.level === level) {
        if (isFetchingLevelRef.current[level as Level]) return null;
        isFetchingLevelRef.current[level as Level] = true;
        setProblemLoading(true);
        try {
          await inFlight.promise;
          if (
            prefetchedProblem.current &&
            prefetchedLevel.current === level &&
            !excludeIds.includes(prefetchedProblem.current.id)
          ) {
            const p = prefetchedProblem.current;
            applyPrefetchedProblem(p, level, difficulty);
            return p;
          }
        } catch {
          /* prefetch failed; fall through to fresh generation */
        } finally {
          isFetchingLevelRef.current[level as Level] = false;
        }
      }

      // ── Slow path: fresh API generation ──────────────────────────────────────
      // Block concurrent callers for the same level so we never fire duplicate requests.
      if (isFetchingLevelRef.current[level as Level]) return null;
      isFetchingLevelRef.current[level as Level] = true;

      // Capture the level at call-time so we can detect stale results after an await.
      const expectedLevel = level as Level;

      // Only clear a same-level stale prefetch. A cross-level prefetch (e.g. L2 prefetch
      // while we generate a new L1 "See Another") should be preserved — it's still valid.
      if (prefetchedLevel.current === level) {
        prefetchedProblem.current = null;
        prefetchedLevel.current = 0;
      }
      setProblemLoading(true);
      try {
        const { problem, pagination: pag } = await generateProblem(difficulty, excludeIds, level, false, forceRegenerate);

        // Guard: if the user switched levels while we were awaiting the API, don't
        // overwrite the now-active level's problem/pagination/difficulty.
        const isCurrentLevel = stateSnapshot.current.currentLevel === expectedLevel;
        if (isCurrentLevel) {
          setCurrentProblem(problem);
          if (level === 1) {
            // Level 1 pagination is managed entirely client-side (cap: 3 examples).
            // Never use the backend's pagination for Level 1 — it returns max_problems: 5
            // and its "total" reflects the backend playlist, not our local 3-example cap.
            setPagination(makeLevel1Pagination(0, 1));
          } else {
            setPagination(pag ?? defaultPaginationForLevel(level as Level));
          }
          // Use the difficulty the backend actually assigned, not the request value,
          // so currentDifficulty stays in sync with the backend playlist key.
          setCurrentDifficulty(problem.difficulty as "easy" | "medium" | "hard");
        }
        if (level === 1 && level1ProblemsRef.current.length === 0) {
          level1ProblemsRef.current[0] = problem;
        }
        if (problem && isCurrentLevel) {
          startAttemptForProblem(problem, difficulty, level);
        } else if (!isCurrentLevel) {
          // Stale result — don't track an attempt for the wrong level.
          // (The already-active level started its own attempt when it loaded.)
        } else {
          onAttemptStart(null);
        }
        // Still prefetch even if we switched; data remains useful.
        prefetchNextLevelIfNeeded(difficulty, level);
        return problem;
      } catch (err) {
        const raw = err instanceof Error ? err.message : "Failed to load problem. Check your connection.";
        const is502 = String(raw).toLowerCase().includes("bad gateway") || String(raw).includes("502");
        const message = is502
          ? "Server error (502): problem generator failed. Check backend logs and that the LLM/API is configured."
          : raw;
        toast.error(message);
        console.error("loadNewProblem error:", err);
        onAttemptStart(null);
        return null;
      } finally {
        setProblemLoading(false);
        isFetchingLevelRef.current[level as Level] = false;
      }
    },
    [generateProblem, applyPrefetchedProblem, startAttemptForProblem, onAttemptStart, prefetchNextLevelIfNeeded],
  );

  // ── Init: reset guard on chapter/topic change ────────────────────────────

  useEffect(() => {
    hasInitializedRef.current = false;
    seenLevel1IdsRef.current = [];
    level1ProblemsRef.current = [];
  }, [unitId, lessonName]);

  // ── Init: restore from localStorage or load fresh ─────────────────────────
  // Cross-session / cross-device restore should use backend playlist (e.g. resume endpoint
  // returning current level + current problem from playlist) + minimal answer storage, not a full state blob.

  useEffect(() => {
    if (hasInitializedRef.current) return;
    const key = getTutorSessionStorageKey(userId, unitId, lessonIndex);

    if (key) {
      const parsed = readTutorSessionSnapshot(key) as {
        currentLevel?: Level;
        levelCache?: Partial<Record<Level, LevelCacheEntry>>;
        perProblemCache?: Record<string, PerProblemState>;
        completedProblemIds?: string[];
        masteryScore?: number;
        hasCompletedLevel2?: boolean;
      } | null;
      const lvl = parsed?.currentLevel;
      const cache = parsed?.levelCache;
      if (lvl != null && cache?.[lvl as Level]) {
        const entry = cache[lvl as Level]!;

        // Shared: apply refs/state common to both restore branches.
        const applyCommonCacheInit = () => {
          hasInitializedRef.current = true;
          levelCacheRef.current = { ...cache };
          if (parsed.perProblemCache) perProblemCacheRef.current = parsed.perProblemCache;
          setCompletedProblemIds(parsed.completedProblemIds ?? []);
          setCurrentLevel(lvl as Level);
        };

        // Shared: compute and apply Level-1 client-side pagination from a cache entry.
        const applyLevel1PaginationFromEntry = () => {
          const cachedTotal = entry.pagination?.total ?? 1;
          const curIdx = entry.pagination?.current_index ?? 0;
          setPagination(makeLevel1Pagination(curIdx, cachedTotal));
        };

        if (cachedProblemHasBrokenMultiInput(entry.problem)) {
          // Snapshot predates `input_fields` on multi_input (or corrupt); refetch so UI matches API.
          applyCommonCacheInit();
          setCurrentDifficulty(entry.difficulty);
          if (lvl === 1) {
            level1ProblemsRef.current = [];
            applyLevel1PaginationFromEntry();
          } else {
            setPagination(entry.pagination ?? defaultPaginationForLevel(lvl as Level));
          }
          if (typeof parsed.masteryScore === "number") onRestoreMasteryScore?.(parsed.masteryScore);
          if (parsed.hasCompletedLevel2 === true) onRestoreHasCompletedLevel2?.();
          stepSettersRef.current.setAnswers({});
          stepSettersRef.current.setHints({});
          stepSettersRef.current.setHintLoading(new Set());
          stepSettersRef.current.setStructuredStepComplete({});
          void loadNewProblem(entry.difficulty, [], lvl as number);
          return () => {
            persistOnUnmountRef.current();
          };
        } else {
          applyCommonCacheInit();
          setCurrentProblem(entry.problem);
          // Seed level1ProblemsRef so Prev/Next works after a page reload (refs are reset on mount).
          if (lvl === 1 && entry.problem && level1ProblemsRef.current.length === 0) {
            level1ProblemsRef.current[0] = entry.problem;
          }
          const perProblem = parsed.perProblemCache?.[entry.problem.id];
          stepSettersRef.current.setAnswers(perProblem?.answers ?? entry.answers ?? {});
          stepSettersRef.current.setHints(perProblem?.hints ?? entry.hints ?? {});
          stepSettersRef.current.setHintLoading(new Set());
          stepSettersRef.current.setStructuredStepComplete(
            perProblem?.structuredStepComplete ?? entry.structuredStepComplete ?? {},
          );
          if (entry.thinkingSteps) stepSettersRef.current.setThinkingSteps(entry.thinkingSteps);
          if (entry.classifiedErrors) stepSettersRef.current.setClassifiedErrors(entry.classifiedErrors);
          setCurrentDifficulty(entry.difficulty);
          if (lvl === 1) {
            // Recompute Level 1 pagination locally — cached entry may have backend's max_problems: 5.
            applyLevel1PaginationFromEntry();
          } else {
            setPagination(entry.pagination ?? defaultPaginationForLevel(lvl as Level));
          }
          if (typeof parsed.masteryScore === "number") onRestoreMasteryScore?.(parsed.masteryScore);
          if (parsed.hasCompletedLevel2 === true) onRestoreHasCompletedLevel2?.();
          startAttemptForProblem(entry.problem, entry.difficulty, lvl as Level);
          setProblemLoading(false);
          return () => {
            persistOnUnmountRef.current();
          };
        }
      }
    }
    hasInitializedRef.current = true;
    loadNewProblem("medium", [], 1);
    return () => {
      persistOnUnmountRef.current();
    };
  }, [loadNewProblem, unitId, lessonIndex, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cache & persistence ───────────────────────────────────────────────────

  const saveCurrentStateToCache = useCallback(() => {
    const {
      currentProblem: p,
      currentLevel: lvl,
      pagination: pag,
      currentDifficulty: diff,
      completedProblemIds: cpi,
    } = stateSnapshot.current;
    if (userId && unitId != null) {
      const key = getTutorSessionStorageKey(userId, unitId, lessonIndex);
      if (!key) return;
      try {
        if (!p) {
          // Problem still loading — update just currentLevel so reload restores to correct level
          updateTutorSessionLevelOnly(key, lvl);
          return;
        }
        const { answers: a, hints: h, structuredStepComplete: s } = stepStateRef.current;
        const { thinkingSteps: ts, classifiedErrors: ce } = cognitiveStateRef.current;
        perProblemCacheRef.current[p.id] = { answers: a, hints: h, structuredStepComplete: s };
        levelCacheRef.current[lvl] = {
          problem: p,
          answers: a,
          hints: h,
          structuredStepComplete: s,
          pagination: pag,
          difficulty: diff,
          thinkingSteps: ts,
          classifiedErrors: ce,
        };
        writeTutorSessionSnapshot(
          key,
          {
            currentLevel: lvl,
            levelCache: levelCacheRef.current,
            perProblemCache: perProblemCacheRef.current,
            completedProblemIds: cpi ?? [],
            masteryScore: masteryScoreRef.current,
            hasCompletedLevel2: hasCompletedLevel2Ref.current,
          },
        );
      } catch {
        /* quota or disabled */
      }
    }
  }, [userId, unitId, lessonIndex]); // stepStateRef, masteryScoreRef, hasCompletedLevel2Ref are stable refs

  useLayoutEffect(() => {
    persistOnUnmountRef.current = saveCurrentStateToCache;
  });

  // Save on tab hide and browser close so progress isn't lost on tab switches or refreshes
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveCurrentStateToCache();
    };
    const onBeforeUnload = () => saveCurrentStateToCache();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [saveCurrentStateToCache]);

  const restoreFromCache = useCallback(
    (entry: LevelCacheEntry, level: Level) => {
      if (cachedProblemHasBrokenMultiInput(entry.problem)) {
        if (level === 1) level1ProblemsRef.current = [];
        void loadNewProblem(entry.difficulty, [], level);
        return;
      }
      setCurrentProblem(entry.problem);
      const perProblem = perProblemCacheRef.current[entry.problem.id];
      stepSettersRef.current.setAnswers(perProblem?.answers ?? entry.answers);
      stepSettersRef.current.setHints(perProblem?.hints ?? entry.hints);
      stepSettersRef.current.setHintLoading(new Set());
      stepSettersRef.current.setStructuredStepComplete(
        perProblem?.structuredStepComplete ?? entry.structuredStepComplete,
      );
      setCurrentDifficulty(entry.difficulty);
      setCurrentLevel(level);
      stepSettersRef.current.resetTracking();

      if (level === 1) {
        // Recompute Level 1 pagination from the live refs, not from the stale cache entry.
        // This picks up any background gen that completed while the user was on Level 2/3.
        // seenLevel1IdsRef is the canonical count; level1ProblemsRef is the ordered array.
        const liveCount = seenLevel1IdsRef.current.length;
        const cachedTotal = entry.pagination?.total ?? 1;
        const n = Math.max(liveCount, cachedTotal, 1);
        const curIdx = Math.min(entry.pagination?.current_index ?? 0, n - 1);
        // Seed level1ProblemsRef[0] from cache in case it was cleared by a page reload.
        if (level1ProblemsRef.current.length === 0) {
          level1ProblemsRef.current[0] = entry.problem;
        }
        setPagination(makeLevel1Pagination(curIdx, n));
      } else {
        setPagination(entry.pagination ?? defaultPaginationForLevel(level));
      }

      // Clear any in-flight loading state from a concurrent generate call on another level.
      setProblemLoading(false);
      // Ensure mastery sync has an active attempt id for cached problems.
      startAttemptForProblem(entry.problem, entry.difficulty, level);
      // Eager loading: when restoring to Level 2, start Level 3 prefetch so advance is zero-wait.
      if (level === 2) {
        triggerPrefetch(entry.difficulty, [], 3);
      }
    },
    [triggerPrefetch, startAttemptForProblem, loadNewProblem], // stepSettersRef, seenLevel1IdsRef, level1ProblemsRef are stable refs
  );

  const restorePerProblemState = useCallback((problemId: string) => {
    const saved = perProblemCacheRef.current[problemId];
    stepSettersRef.current.setAnswers(saved?.answers ?? {});
    stepSettersRef.current.setHints(saved?.hints ?? {});
    stepSettersRef.current.setStructuredStepComplete(saved?.structuredStepComplete ?? {});
  }, []); // stepSettersRef is a stable ref

  const resetProblemState = useCallback(
    (opts?: { clearPagination?: boolean; clearCurrentProblemCache?: boolean }) => {
      const clearPagination = opts?.clearPagination ?? true;
      const clearCurrentProblemCache = opts?.clearCurrentProblemCache ?? false;
      if (clearCurrentProblemCache && stateSnapshot.current.currentProblem) {
        delete perProblemCacheRef.current[stateSnapshot.current.currentProblem.id];
      }
      stepSettersRef.current.setAnswers({});
      stepSettersRef.current.setHints({});
      stepSettersRef.current.setHintLoading(new Set());
      stepSettersRef.current.setStructuredStepComplete({});
      if (clearPagination) setPagination(null);
      stepSettersRef.current.resetTracking();
    },
    [],
  );

  const handleResetProblem = useCallback(() => {
    resetProblemState({ clearCurrentProblemCache: true, clearPagination: false });
    toast.info("Problem reset. Try again!");
  }, [resetProblemState]);

  // ── Navigation ───────────────────────────────────────────────────────────

  const handleNavigate = useCallback(
    async (direction: "prev" | "next") => {
      if (!userId) return;
      const { currentLevel: lvl, currentDifficulty: diff, pagination: pag } =
        stateSnapshot.current;
      saveCurrentStateToCache();
      // Level 1: use local cache so each of the 3 examples shows the correct problem (not backend duplicate).
      if (lvl === 1 && pag) {
        const curIdx = pag.current_index;
        const targetIdx = direction === "next" ? curIdx + 1 : curIdx - 1;
        const cached = level1ProblemsRef.current[targetIdx];
        if (cached != null && targetIdx >= 0 && targetIdx < level1ProblemsRef.current.length) {
          setIsNavigating(true);
          setCurrentProblem(cached);
          restorePerProblemState(cached.id);
          setPagination(makeLevel1Pagination(targetIdx, pag.total));
          stepSettersRef.current.setHintLoading(new Set());
          stepSettersRef.current.resetTracking();
          setIsNavigating(false);
          return;
        }
      }
      setIsNavigating(true);
      try {
        const data = await apiNavigateProblem({
          user_id: userId,
          unit_id: unitId,
          lesson_index: lessonIndex,
          level: lvl,
          difficulty: diff,
          direction,
        });
        const { problem, pagination: pag } = parseProblemOutput(data);
        saveCurrentStateToCache();
        if (lvl === 1 && problem && pag) {
          const idx = pag.current_index;
          if (level1ProblemsRef.current.length <= idx) level1ProblemsRef.current.length = idx + 1;
          level1ProblemsRef.current[idx] = problem;
        }
        setCurrentProblem(problem);
        // Keep currentDifficulty in sync with the navigated problem's actual difficulty
        // so subsequent navigate/generate calls use the correct playlist key.
        setCurrentDifficulty(problem.difficulty as "easy" | "medium" | "hard");
        stepSettersRef.current.setHintLoading(new Set());
        restorePerProblemState(problem.id);
        setPagination(pag ?? defaultPaginationForLevel(lvl));
        stepSettersRef.current.resetTracking();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        const atFirstProblem = msg.includes("Already at the first");
        const needsGeneration =
          msg.includes("No more seen") ||
          msg.includes("No problems found") ||
          msg.includes("generate") ||
          msg.includes("Call /generate");

        if (direction === "prev" && atFirstProblem) {
          toast.info("Already at the first example.");
        } else if (needsGeneration || direction === "next") {
          resetProblemState({ clearPagination: false });
          const { currentDifficulty: diff2, currentLevel: lvl2, completedProblemIds: cpi2 } =
            stateSnapshot.current;
          try {
            await loadNewProblem(diff2, cpi2, lvl2);
          } catch {
            toast.error("Failed to load another problem. Please try again.");
          }
        } else {
          toast.error("Navigation failed. Please try again.");
        }
      } finally {
        setIsNavigating(false);
      }
    },
    [userId, unitId, lessonIndex, saveCurrentStateToCache, loadNewProblem, restorePerProblemState, resetProblemState],
  );

  const handleSeeAnother = useCallback(async () => {
    const {
      currentDifficulty: diff,
      currentLevel: lvl,
      completedProblemIds: cpi,
      currentProblem: cur,
    } = stateSnapshot.current;

    if (lvl === 1) {
      // Prevent concurrent background generations
      if (backgroundGenRef.current) return;

      // Track the current example as "seen" so it is excluded on future calls
      if (cur?.id && !seenLevel1IdsRef.current.includes(cur.id)) {
        seenLevel1IdsRef.current = [...seenLevel1IdsRef.current, cur.id];
      }
      // Exclude ALL previously seen Level 1 examples (not just the current one)
      const excludeIds = [...new Set([...seenLevel1IdsRef.current])];

      backgroundGenRef.current = true;
      setIsBackgroundGenerating(true);

      // Fire-and-forget: stay on the current problem while the next one generates
      generateProblem(diff, excludeIds, 1)
        .then((result) => {
          const newProblem = result.problem;
          if (!newProblem?.id) return;

          // seenLevel1IdsRef + level1ProblemsRef are the source of truth for Level 1 pagination.
          // restoreFromCache recomputes pagination from these refs when the user returns to Level 1,
          // so we do NOT need to update levelCacheRef here.
          if (!seenLevel1IdsRef.current.includes(newProblem.id)) {
            seenLevel1IdsRef.current = [...seenLevel1IdsRef.current, newProblem.id];
          }
          const n = seenLevel1IdsRef.current.length;
          if (level1ProblemsRef.current.length < n) level1ProblemsRef.current.length = n;
          level1ProblemsRef.current[n - 1] = newProblem;

          // Auto-advance: if still on Level 1, display the new problem immediately.
          // Reset step state first so no answers/hints from the previous problem bleed through.
          // If on Level 2/3, restoreFromCache will recompute pagination correctly on return.
          if (stateSnapshot.current.currentLevel === 1) {
            resetProblemState({ clearPagination: false });
            setCurrentProblem(newProblem);
            setPagination(makeLevel1Pagination(n - 1, n));
            startAttemptForProblem(newProblem, diff, 1);
          }
        })
        .catch(() => {
          toast.error("Failed to generate additional example. Please try again.");
        })
        .finally(() => {
          backgroundGenRef.current = false;
          setIsBackgroundGenerating(false);
        });

      return; // Stay on current problem — don't block or reset
    }

    // Levels 2/3: navigate within playlist if ahead, otherwise generate new
    const excludeIds = [...cpi];
    if (cur?.id) excludeIds.push(cur.id);

    const snap = stateSnapshot.current.pagination;
    const hasRealNext = snap && snap.has_next && snap.current_index + 1 < snap.total;
    if (hasRealNext) {
      handleNavigate("next");
      return;
    }
    saveCurrentStateToCache();
    resetProblemState({ clearPagination: false });
    loadNewProblem(diff, excludeIds, lvl);
  }, [handleNavigate, saveCurrentStateToCache, loadNewProblem, resetProblemState, generateProblem, startAttemptForProblem]);

  const handleLevelChange = useCallback(
    (level: Level) => {
      if (level === 3 && !hasCompletedLevel2Ref.current) return;
      saveCurrentStateToCache();
      const cached = levelCacheRef.current[level];
      if (cached) {
        restoreFromCache(cached, level);
        return;
      }
      setCurrentLevel(level);
      setCurrentProblem(null);
      setProblemLoading(true);
      resetProblemState();
      setPagination(defaultPaginationForLevel(level));
      // Level 3 default difficulty is "medium" — backend recommendations override this
      // in handleContinueAfterProgression via the backendDiff path.
      const { completedProblemIds: cpi } = stateSnapshot.current;
      loadNewProblem("medium", cpi, level);
    },
    [saveCurrentStateToCache, restoreFromCache, loadNewProblem, resetProblemState], // refs are stable
  );

  const handleStartFadedExample = useCallback(() => {
    handleLevelChange(2);
    toast.success("Let's try a faded example!");
  }, [handleLevelChange]);

  /**
   * Force-generate a brand-new problem, bypassing both the backend playlist
   * resume check and the module-level prefetch cache.
   * Use for explicit "Try Another Problem" actions where the student wants a
   * completely fresh problem regardless of their current playlist state.
   */
  const handleForceRegenerate = useCallback(async () => {
    const { currentDifficulty: diff, currentLevel: lvl } = stateSnapshot.current;
    saveCurrentStateToCache();
    resetProblemState({ clearPagination: false });
    // Clear the level cache entry so the new problem isn't overwritten by stale data on unmount
    delete levelCacheRef.current[lvl];
    await loadNewProblem(diff, [], lvl, true);
  }, [saveCurrentStateToCache, loadNewProblem, resetProblemState]);

  // ── Side effects ──────────────────────────────────────────────────────────

  // Mark topic in-progress once per topic
  useEffect(() => {
    const key = `${unitId}-${lessonIndex}`;
    if (lastMarkedRef.current === key) return;
    lastMarkedRef.current = key;
    onMarkInProgress?.();
  }, [unitId, lessonIndex, onMarkInProgress]);

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    currentProblem,
    currentLevel,
    setCurrentLevel,
    pagination,
    setPagination,
    isNavigating,
    isBackgroundGenerating,
    currentDifficulty,
    problemLoading,
    setProblemLoading,
    completedProblemIds,
    setCompletedProblemIds,
    levelSolved,
    setLevelSolved,
    levelCacheRef,
    perProblemCacheRef,
    loadNewProblem,
    saveCurrentStateToCache,
    resetProblemState,
    handleResetProblem,
    handleNavigate,
    handleSeeAnother,
    handleLevelChange,
    handleStartFadedExample,
    handleForceRegenerate,
  };
}
