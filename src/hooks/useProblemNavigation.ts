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
import { Level, Problem, ReferenceStep, StudentAnswer } from "@/types/chemistry";
import { ProblemPagination } from "@/lib/api";
import {
  apiStartAttempt,
  apiNavigateProblem,
  apiGetReferenceExample,
} from "@/lib/api";
import { useGeneratedProblem, parseProblemOutput } from "@/hooks/useGeneratedProblem";
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
}

export interface PerProblemState {
  answers: Record<string, StudentAnswer>;
  hints: Record<string, string>;
  structuredStepComplete: Record<string, boolean>;
}

/** Setters from useStepHandlers passed via ref to avoid circular hook deps. */
export interface StepSetters {
  setAnswers: Dispatch<SetStateAction<Record<string, StudentAnswer>>>;
  setHints: Dispatch<SetStateAction<Record<string, string>>>;
  setHintLoading: Dispatch<SetStateAction<Set<string>>>;
  setStructuredStepComplete: Dispatch<SetStateAction<Record<string, boolean>>>;
  resetTracking: () => void;
}

export const TOPIC_STATE_STORAGE_KEY = "chemtutor_topic_state";

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
  chapterId: string;
  topicIndex: number;
  topicName: string;
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
  chapterId,
  topicIndex,
  topicName,
  userId,
  interests,
  gradeLevel,
  masteryScore,
  masteryScoreRef,
  hasCompletedLevel2Ref,
  stepStateRef,
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
  const [dynamicReferenceSteps, setDynamicReferenceSteps] = useState<ReferenceStep[] | null>(null);

  const levelCacheRef = useRef<Partial<Record<Level, LevelCacheEntry>>>({});
  const perProblemCacheRef = useRef<Record<string, PerProblemState>>({});
  const persistOnUnmountRef = useRef<() => void>(() => {});
  const hasInitializedRef = useRef(false);
  const prefetchedProblem = useRef<Problem | null>(null);
  const prefetchedLevel = useRef<number>(0);
  const prefetchInFlight = useRef(false);
  const lastMarkedRef = useRef<string>("");

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
    chapterId,
    topicIndex,
    topicName,
    interests,
    gradeLevel,
    masteryScore,
    userId,
  });

  const triggerPrefetch = useCallback(
    (difficulty: "easy" | "medium" | "hard", excludeIds: string[], level: number) => {
      if (prefetchInFlight.current) return;
      setTimeout(() => {
        if (prefetchInFlight.current) return;
        prefetchInFlight.current = true;
        generateProblem(difficulty, excludeIds, level)
          .then(({ problem }) => {
            prefetchedProblem.current = problem;
            prefetchedLevel.current = level;
          })
          .catch(() => {})
          .finally(() => {
            prefetchInFlight.current = false;
          });
      }, 5000);
    },
    [generateProblem],
  );

  const loadNewProblem = useCallback(
    async (difficulty: "easy" | "medium" | "hard", excludeIds: string[], level: number) => {
      if (
        prefetchedProblem.current &&
        prefetchedLevel.current === level &&
        !excludeIds.includes(prefetchedProblem.current.id)
      ) {
        const p = prefetchedProblem.current;
        prefetchedProblem.current = null;
        prefetchedLevel.current = 0;
        setCurrentProblem(p);
        setPagination(defaultPaginationForLevel(level as Level));
        setCurrentDifficulty(difficulty);
        if (userId && p) {
          apiStartAttempt({
            user_id: userId,
            unit_id: chapterId,
            lesson_index: topicIndex,
            problem_id: p.id,
            difficulty,
            level,
          })
            .then(({ attempt_id }) => onAttemptStart(attempt_id))
            .catch(() => onAttemptStart(null));
        } else {
          onAttemptStart(null);
        }
        triggerPrefetch(difficulty, [], level < 3 ? level + 1 : level);
        return;
      }
      prefetchedProblem.current = null;
      prefetchedLevel.current = 0;
      setProblemLoading(true);
      try {
        const { problem, pagination: pag } = await generateProblem(difficulty, excludeIds, level);
        setCurrentProblem(problem);
        setPagination(pag ?? defaultPaginationForLevel(level as Level));
        setCurrentDifficulty(difficulty);
        if (userId && problem) {
          apiStartAttempt({
            user_id: userId,
            unit_id: chapterId,
            lesson_index: topicIndex,
            problem_id: problem.id,
            difficulty,
            level,
          })
            .then(({ attempt_id }) => onAttemptStart(attempt_id))
            .catch(() => onAttemptStart(null));
        } else {
          onAttemptStart(null);
        }
        triggerPrefetch(difficulty, [], level < 3 ? level + 1 : level);
      } catch (err) {
        toast.error("Failed to load problem from API. Check your connection.");
        console.error("loadNewProblem error:", err);
        onAttemptStart(null);
      } finally {
        setProblemLoading(false);
      }
    },
    [generateProblem, triggerPrefetch, userId, chapterId, topicIndex, onAttemptStart],
  );

  // ── Init: reset guard on chapter/topic change ────────────────────────────

  useEffect(() => {
    hasInitializedRef.current = false;
  }, [chapterId, topicName]);

  // ── Init: restore from localStorage or load fresh ────────────────────────

  useEffect(() => {
    if (hasInitializedRef.current) return;
    const key =
      userId && chapterId != null
        ? `${TOPIC_STATE_STORAGE_KEY}_${userId}_${chapterId}_${topicIndex}`
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
  }, [loadNewProblem, chapterId, topicIndex, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cache & persistence ───────────────────────────────────────────────────

  const saveCurrentStateToCache = useCallback(() => {
    const {
      currentProblem: p,
      currentLevel: lvl,
      pagination: pag,
      currentDifficulty: diff,
      completedProblemIds: cpi,
    } = stateSnapshot.current;
    if (!p) return;
    const { answers: a, hints: h, structuredStepComplete: s } = stepStateRef.current;
    perProblemCacheRef.current[p.id] = { answers: a, hints: h, structuredStepComplete: s };
    levelCacheRef.current[lvl] = {
      problem: p,
      answers: a,
      hints: h,
      structuredStepComplete: s,
      pagination: pag,
      difficulty: diff,
    };
    if (userId && chapterId != null) {
      const key = `${TOPIC_STATE_STORAGE_KEY}_${userId}_${chapterId}_${topicIndex}`;
      try {
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
  }, [userId, chapterId, topicIndex]); // stepStateRef, masteryScoreRef, hasCompletedLevel2Ref are stable refs

  useLayoutEffect(() => {
    persistOnUnmountRef.current = saveCurrentStateToCache;
  });

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
    },
    [], // stepSettersRef is a stable ref
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
      const { currentLevel: lvl, currentDifficulty: diff, completedProblemIds: cpi } =
        stateSnapshot.current;
      saveCurrentStateToCache();
      setIsNavigating(true);
      try {
        const data = await apiNavigateProblem({
          user_id: userId,
          unit_id: chapterId,
          lesson_index: topicIndex,
          level: lvl,
          difficulty: diff,
          direction,
        });
        const { problem, pagination: pag } = parseProblemOutput(data);
        saveCurrentStateToCache();
        setCurrentProblem(problem);
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
    [userId, chapterId, topicIndex, saveCurrentStateToCache, loadNewProblem, restorePerProblemState],
  );

  const handleSeeAnother = useCallback(() => {
    const {
      currentDifficulty: diff,
      currentLevel: lvl,
      completedProblemIds: cpi,
      currentProblem: cur,
    } = stateSnapshot.current;
    const excludeIds = [...cpi];
    if (cur?.id) excludeIds.push(cur.id);

    if (lvl === 1) {
      saveCurrentStateToCache();
      stepSettersRef.current.setAnswers({});
      stepSettersRef.current.setHints({});
      stepSettersRef.current.setHintLoading(new Set());
      stepSettersRef.current.setStructuredStepComplete({});
      stepSettersRef.current.resetTracking();
      loadNewProblem(diff, excludeIds, 1);
      return;
    }

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
      const difficulty =
        level === 3 ? getDifficultyForMastery(masteryScoreRef.current) : "medium";
      const { completedProblemIds: cpi } = stateSnapshot.current;
      loadNewProblem(difficulty, cpi, level);
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
    const key = `${chapterId}-${topicIndex}`;
    if (lastMarkedRef.current === key) return;
    lastMarkedRef.current = key;
    onMarkInProgress?.();
  }, [chapterId, topicIndex, onMarkInProgress]);

  // Fetch topic-specific reference example for Level 2 panel
  useEffect(() => {
    if (currentLevel !== 2) return;
    apiGetReferenceExample(chapterId, topicIndex).then((problem) => {
      if (!problem) return;
      const steps: ReferenceStep[] = problem.steps
        .filter((s) => s.type === "given" && (s.content || s.correct_answer))
        .map((s) => ({
          stepNumber: s.step_number,
          title: s.label + ":",
          content: s.content || s.correct_answer || "",
        }));
      if (steps.length > 0) setDynamicReferenceSteps(steps);
    });
  }, [currentLevel, chapterId, topicIndex]);

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
    dynamicReferenceSteps,
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
