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
import { getDifficultyForMastery } from "@/data/sampleProblems";
import { toast } from "sonner";

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

export const LESSON_STATE_STORAGE_KEY = "chemtutor_lesson_state";

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
      if (userId && p) {
        apiStartAttempt({
          user_id: userId,
          unit_id: unitId,
          lesson_index: lessonIndex,
          problem_id: p.id,
          difficulty,
          level,
        })
          .then(({ attempt_id }) => onAttemptStart(attempt_id))
          .catch(() => onAttemptStart(null));
      } else {
        onAttemptStart(null);
      }
      // Prefetch the next level only when there is a next level and it isn't already ready.
      // Guard "level < 3" prevents a spurious re-prefetch when we're already at the max level
      // (previously: nextLevel = level < 3 ? level+1 : level → always 3 when level===3,
      //  then prefetchedLevel.current=0 !== 3 → triggerPrefetch fired again for L3).
      if (level < 3) {
        const nextLevel = level + 1;
        const nextAlreadyReady =
          prefetchedLevel.current === nextLevel ||
          !!levelCacheRef.current[nextLevel as Level];
        if (!nextAlreadyReady) {
          triggerPrefetch(difficulty, [], nextLevel);
        }
      }
    },
    [userId, unitId, lessonIndex, onAttemptStart, triggerPrefetch],
  );

  const loadNewProblem = useCallback(
    async (
      difficulty: "easy" | "medium" | "hard",
      excludeIds: string[],
      level: number,
    ): Promise<Problem | null> => {
      if (
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
      const inFlight = prefetchPromiseRef.current;
      if (inFlight?.level === level) {
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

      // Only clear a same-level stale prefetch. A cross-level prefetch (e.g. L2 prefetch
      // while we generate a new L1 "See Another") should be preserved — it's still valid.
      if (prefetchedLevel.current === level) {
        prefetchedProblem.current = null;
        prefetchedLevel.current = 0;
      }
      setProblemLoading(true);
      try {
        const { problem, pagination: pag } = await generateProblem(difficulty, excludeIds, level);
        setCurrentProblem(problem);
        setPagination(pag ?? defaultPaginationForLevel(level as Level));
        // Use the difficulty the backend actually assigned, not the request value,
        // so currentDifficulty stays in sync with the backend playlist key.
        setCurrentDifficulty(problem.difficulty as "easy" | "medium" | "hard");
        if (level === 1 && level1ProblemsRef.current.length === 0) {
          level1ProblemsRef.current[0] = problem;
        }
        if (userId && problem) {
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
        } else {
          onAttemptStart(null);
        }
        // Same "level < 3" guard as applyPrefetchedProblem — no spurious L3 re-prefetch.
        if (level < 3) {
          const nextLevel = level + 1;
          const nextAlreadyReady =
            prefetchedLevel.current === nextLevel ||
            !!levelCacheRef.current[nextLevel as Level];
          if (!nextAlreadyReady) {
            triggerPrefetch(difficulty, [], nextLevel);
          }
        }
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
    [generateProblem, triggerPrefetch, applyPrefetchedProblem, userId, unitId, lessonIndex, onAttemptStart],
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
    const key =
      userId && unitId != null
        ? `${LESSON_STATE_STORAGE_KEY}_${userId}_${unitId}_${lessonIndex}`
        : null;

    if (key) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            currentLevel?: Level;
            levelCache?: Partial<Record<Level, LevelCacheEntry>>;
            perProblemCache?: Record<string, PerProblemState>;
            completedProblemIds?: string[];
            masteryScore?: number;
            hasCompletedLevel2?: boolean;
          };
          const lvl = parsed?.currentLevel;
          const cache = parsed?.levelCache;
          if (lvl != null && cache?.[lvl as Level]) {
            hasInitializedRef.current = true;
            const entry = cache[lvl as Level]!;
            levelCacheRef.current = { ...cache };
            if (parsed.perProblemCache) perProblemCacheRef.current = parsed.perProblemCache;
            setCompletedProblemIds(parsed.completedProblemIds ?? []);
            setCurrentLevel(lvl as Level);
            setCurrentProblem(entry.problem);
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
            setPagination(entry.pagination ?? defaultPaginationForLevel(lvl as Level));
            if (typeof parsed.masteryScore === "number") onRestoreMasteryScore?.(parsed.masteryScore);
            if (parsed.hasCompletedLevel2 === true) onRestoreHasCompletedLevel2?.();
            onAttemptStart(null);
            setProblemLoading(false);
            return () => {
              persistOnUnmountRef.current();
            };
          }
        }
      } catch {
        /* invalid or disabled storage */
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
      const key = `${LESSON_STATE_STORAGE_KEY}_${userId}_${unitId}_${lessonIndex}`;
      try {
        if (!p) {
          // Problem still loading — update just currentLevel so reload restores to correct level
          const existing = localStorage.getItem(key);
          if (existing) {
            const parsed = JSON.parse(existing);
            localStorage.setItem(key, JSON.stringify({ ...parsed, currentLevel: lvl }));
          }
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
        localStorage.setItem(
          key,
          JSON.stringify({
            currentLevel: lvl,
            levelCache: levelCacheRef.current,
            perProblemCache: perProblemCacheRef.current,
            completedProblemIds: cpi ?? [],
            masteryScore: masteryScoreRef.current,
            hasCompletedLevel2: hasCompletedLevel2Ref.current,
          }),
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
      setPagination(entry.pagination ?? defaultPaginationForLevel(level));
      // Eager loading: when restoring to Level 2, start Level 3 prefetch so advance is zero-wait.
      if (level === 2) {
        triggerPrefetch(entry.difficulty, [], 3);
      }
    },
    [triggerPrefetch], // stepSettersRef is a stable ref
  );

  const restorePerProblemState = useCallback((problemId: string) => {
    const saved = perProblemCacheRef.current[problemId];
    stepSettersRef.current.setAnswers(saved?.answers ?? {});
    stepSettersRef.current.setHints(saved?.hints ?? {});
    stepSettersRef.current.setStructuredStepComplete(saved?.structuredStepComplete ?? {});
  }, []); // stepSettersRef is a stable ref

  // ── Navigation ───────────────────────────────────────────────────────────

  const handleNavigate = useCallback(
    async (direction: "prev" | "next") => {
      if (!userId) return;
      const { currentLevel: lvl, currentDifficulty: diff, completedProblemIds: cpi, pagination: pag } =
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
          setPagination({
            ...pag,
            current_index: targetIdx,
            has_prev: targetIdx > 0,
            has_next: targetIdx < pag.total - 1,
          });
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
          stepSettersRef.current.setAnswers({});
          stepSettersRef.current.setHints({});
          stepSettersRef.current.setHintLoading(new Set());
          stepSettersRef.current.setStructuredStepComplete({});
          stepSettersRef.current.resetTracking();
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
        void cpi; // used in stateSnapshot above; suppress lint
      } finally {
        setIsNavigating(false);
      }
    },
    [userId, unitId, lessonIndex, saveCurrentStateToCache, loadNewProblem, restorePerProblemState],
  );

  const handleSeeAnother = useCallback(async () => {
    const {
      currentDifficulty: diff,
      currentLevel: lvl,
      completedProblemIds: cpi,
      currentProblem: cur,
    } = stateSnapshot.current;

    if (lvl === 1) {
      // Track the current example as "seen" so it is excluded on future calls
      if (cur?.id && !seenLevel1IdsRef.current.includes(cur.id)) {
        seenLevel1IdsRef.current = [...seenLevel1IdsRef.current, cur.id];
      }
      // Exclude ALL previously seen Level 1 examples (not just the current one)
      const excludeIds = [...new Set([...seenLevel1IdsRef.current])];

      saveCurrentStateToCache();
      stepSettersRef.current.setAnswers({});
      stepSettersRef.current.setHints({});
      stepSettersRef.current.setHintLoading(new Set());
      stepSettersRef.current.setStructuredStepComplete({});
      stepSettersRef.current.resetTracking();

      const newProblem = await loadNewProblem(diff, excludeIds, 1);

      if (newProblem?.id && !seenLevel1IdsRef.current.includes(newProblem.id)) {
        seenLevel1IdsRef.current = [...seenLevel1IdsRef.current, newProblem.id];
      }

      const n = seenLevel1IdsRef.current.length;
      if (n > 0 && newProblem) {
        if (level1ProblemsRef.current.length < n) level1ProblemsRef.current.length = n;
        level1ProblemsRef.current[n - 1] = newProblem;
        setPagination({
          current_index: n - 1,
          total: n,
          max_problems: 3,
          has_prev: n > 1,
          has_next: n < 3,
          at_limit: n >= 3,
        });
      }
      return;
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
    stepSettersRef.current.setAnswers({});
    stepSettersRef.current.setHints({});
    stepSettersRef.current.setHintLoading(new Set());
    stepSettersRef.current.setStructuredStepComplete({});
    stepSettersRef.current.resetTracking();
    loadNewProblem(diff, excludeIds, lvl);
  }, [handleNavigate, saveCurrentStateToCache, loadNewProblem]);

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
      stepSettersRef.current.setAnswers({});
      stepSettersRef.current.setHints({});
      stepSettersRef.current.setHintLoading(new Set());
      stepSettersRef.current.setStructuredStepComplete({});
      setPagination(defaultPaginationForLevel(level));
      stepSettersRef.current.resetTracking();
      // Level 3 default difficulty is "medium" — backend recommendations override this
      // in handleContinueAfterProgression via the backendDiff path.
      const { completedProblemIds: cpi } = stateSnapshot.current;
      loadNewProblem("medium", cpi, level);
    },
    [saveCurrentStateToCache, restoreFromCache, loadNewProblem], // refs are stable
  );

  const handleStartFadedExample = useCallback(() => {
    handleLevelChange(2);
    toast.success("Let's try a faded example!");
  }, [handleLevelChange]);

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
    handleNavigate,
    handleSeeAnother,
    handleLevelChange,
    handleStartFadedExample,
  };
}
