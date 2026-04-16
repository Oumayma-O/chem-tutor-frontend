/**
 * useProblemNavigation — owns problem loading, level/problem caching,
 * localStorage persistence, prev/next navigation, and level switching.
 */

import {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  MutableRefObject,
  Dispatch,
  SetStateAction,
} from "react";
import { Level, Problem, SolutionStep, StudentAnswer } from "@/types/chemistry";
import { ThinkingStep, ClassifiedError } from "@/types/cognitive";
import { ProblemPagination } from "@/lib/api";
import {
  apiStartAttempt,
  apiGetPlaylist,
  apiNavigateProblem,
} from "@/lib/api";
import {
  parseHydratedProblem,
  useGeneratedProblem,
  parseHydratedProblems,
  parseProblemOutput,
  type GenerateResult,
} from "@/hooks/useGeneratedProblem";
import { toast } from "sonner";
import {
  getTutorSessionStorageKey,
  readTutorSessionSnapshot,
  updateTutorSessionLevelOnly,
  writeTutorSessionSnapshot,
} from "@/lib/tutorSessionStorage";
import { getFallbackMinLevel1ExamplesForLevel2 } from "@/config/tutorReveal";
import type { StepLogEntry } from "@/lib/masteryTransforms";

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
  setCheckingAnswer: Dispatch<SetStateAction<Set<string>>>;
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
    has_next: false,
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

function stepMatchesLogEntry(step: SolutionStep, entry: Partial<StepLogEntry>): boolean {
  return (
    (typeof entry.step_id === "string" && entry.step_id === step.id) ||
    (typeof entry.step_label === "string" && entry.step_label === step.label)
  );
}

type HydratedAttempt = {
  attempt_id: string;
  problem_id: string;
  level: number;
  is_complete?: boolean;
  step_log: unknown[];
} | null | undefined;

function getHydratedAttemptForProblem(
  playlist: {
    active_attempt?: HydratedAttempt;
    attempts_by_problem?: Record<string, HydratedAttempt>;
  },
  problemId: string,
): HydratedAttempt {
  const fromMap = playlist.attempts_by_problem?.[problemId];
  if (fromMap) {
    if (import.meta.env.DEV) {
      console.debug("[hydrate] attempts_by_problem hit", {
        problemId,
        attemptId: fromMap?.attempt_id,
      });
    }
    return fromMap;
  }
  const fallback = playlist.active_attempt?.problem_id === problemId ? playlist.active_attempt : null;
  if (import.meta.env.DEV) {
    console.debug("[hydrate] attempts_by_problem miss", {
      problemId,
      fallbackToActive: Boolean(fallback),
      activeProblemId: playlist.active_attempt?.problem_id ?? null,
    });
  }
  return fallback;
}

export function mergeHydratedProblemState(
  problem: Problem,
  localState: PerProblemState | undefined,
  activeAttempt?: HydratedAttempt,
): {
  answers: Record<string, StudentAnswer>;
  structuredStepComplete: Record<string, boolean>;
  attemptId: string | null;
} {
  const backendAnswers: Record<string, StudentAnswer> = {};
  const backendStructuredStepComplete: Record<string, boolean> = {};
  const matchesActiveProblem =
    activeAttempt?.problem_id === problem.id && Array.isArray(activeAttempt?.step_log);

  if (matchesActiveProblem) {
    for (const raw of activeAttempt.step_log) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as Partial<StepLogEntry>;
      const step = problem.steps.find((candidate) => stepMatchesLogEntry(candidate, entry));
      if (!step || step.is_given) continue;
      const answer = typeof entry.answer === "string" ? entry.answer : "";
      const attempts =
        typeof entry.attempts === "number" && Number.isFinite(entry.attempts) && entry.attempts >= 0
          ? Math.floor(entry.attempts)
          : 0;
      const isCorrect = typeof entry.is_correct === "boolean" ? entry.is_correct : undefined;
      backendAnswers[step.id] = {
        step_id: step.id,
        answer,
        is_correct: isCorrect,
        attempts,
        first_attempt_correct:
          typeof entry.first_attempt_correct === "boolean" ? entry.first_attempt_correct : undefined,
        validation_feedback:
          typeof entry.validation_feedback === "string" ? entry.validation_feedback : undefined,
      };
      if (step.type !== "interactive" && isCorrect === true) {
        backendStructuredStepComplete[step.id] = true;
      }
    }
  }

  const answers: Record<string, StudentAnswer> = { ...backendAnswers };
  const structuredStepComplete: Record<string, boolean> = { ...backendStructuredStepComplete };
  const localAnswers = localState?.answers ?? {};
  const localStructured = localState?.structuredStepComplete ?? {};

  for (const step of problem.steps) {
    if (step.is_given) continue;
    const backendHasState =
      answers[step.id] !== undefined || structuredStepComplete[step.id] === true;
    if (!backendHasState && localAnswers[step.id]) {
      answers[step.id] = localAnswers[step.id];
    }
    if (!backendHasState && localStructured[step.id]) {
      structuredStepComplete[step.id] = true;
    }
  }

  return {
    answers,
    structuredStepComplete,
    attemptId: matchesActiveProblem ? activeAttempt?.attempt_id ?? null : null,
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
  /** Joined class — sent with problem generate/navigate for `allow_answer_reveal`. */
  classroomId?: string;
  /** From GET /classrooms/me/live-session when problem payloads omit the field. */
  liveSessionMinLevel1ExamplesForLevel2?: number;
  /** Known lesson lifecycle state from lesson progress; lets L1 skip playlist on first entry. */
  lessonStatus?: "not-started" | "in-progress" | "completed";
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
  classroomId,
  liveSessionMinLevel1ExamplesForLevel2,
  lessonStatus,
}: UseProblemNavigationOptions) {
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [currentLevel, setCurrentLevel] = useState<Level>(() => {
    const key = getTutorSessionStorageKey(userId, unitId, lessonIndex);
    if (!key) return 1;
    const snapshot = readTutorSessionSnapshot(key);
    const lvl = snapshot?.currentLevel;
    return lvl === 1 || lvl === 2 || lvl === 3 ? lvl : 1;
  });
  const [pagination, setPagination] = useState<ProblemPagination | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentDifficulty, setCurrentDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [problemLoading, setProblemLoading] = useState(true);
  const [completedProblemIds, setCompletedProblemIds] = useState<string[]>([]);
  const [levelSolved, setLevelSolved] = useState<Record<Level, number>>({ 1: 0, 2: 0, 3: 0 });
  const levelSolvedRef = useRef(levelSolved);
  useLayoutEffect(() => {
    levelSolvedRef.current = levelSolved;
  });

  const levelCacheRef = useRef<Partial<Record<Level, LevelCacheEntry>>>({});
  const perProblemCacheRef = useRef<Record<string, PerProblemState>>({});
  const persistOnUnmountRef = useRef<() => void>(() => {});
  const hasInitializedRef = useRef(false);
  const prefetchedProblem = useRef<Problem | null>(null);
  const prefetchedLevel = useRef<number>(0);
  const prefetchInFlight = useRef(false);
  /** When non-null, a prefetch for this level is in progress; loadNewProblem can await it. */
  const prefetchPromiseRef = useRef<{ promise: Promise<GenerateResult>; level: number } | null>(null);
  const hydratedAttemptByProblemRef = useRef<Record<string, HydratedAttempt>>({});
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
  // Level 2 & 3: ordered history of problems seen this session — enables Prev/Next across "See Another" calls.
  const level2ProblemsRef = useRef<Problem[]>([]);
  const level3ProblemsRef = useRef<Problem[]>([]);
  // Background generation state for Level 1 "See Another" — true while a bg fetch is in flight.
  const [isBackgroundGenerating, setIsBackgroundGenerating] = useState(false);
  const backgroundGenRef = useRef(false);
  /** Bumped when step answers/drafts are cleared so widgets remount (local state matches parent). */
  const [stepRemountKey, setStepRemountKey] = useState(0);
  /** Last problem-delivery `allow_answer_reveal` from API (undefined = not yet loaded). */
  const [allowAnswerReveal, setAllowAnswerReveal] = useState<boolean | undefined>(undefined);
  /** Last problem-delivery `max_answer_reveals_per_lesson` from API (undefined = not yet loaded). */
  const [maxAnswerRevealsPerLesson, setMaxAnswerRevealsPerLesson] = useState<number | undefined>(
    undefined,
  );
  /** Last problem-delivery `min_level1_examples_for_level2` when live session did not send it. */
  const [minLevel1ExamplesForLevel2Nav, setMinLevel1ExamplesForLevel2Nav] = useState<number | undefined>(
    undefined,
  );
  const minLevel1ExamplesForLevel2 = useMemo(() => {
    const fromApi = liveSessionMinLevel1ExamplesForLevel2 ?? minLevel1ExamplesForLevel2Nav;
    if (typeof fromApi === "number" && Number.isFinite(fromApi) && fromApi >= 1) {
      return Math.floor(fromApi);
    }
    return getFallbackMinLevel1ExamplesForLevel2();
  }, [liveSessionMinLevel1ExamplesForLevel2, minLevel1ExamplesForLevel2Nav]);
  const effectiveMinLevel1ForL2Ref = useRef(minLevel1ExamplesForLevel2);
  useLayoutEffect(() => {
    effectiveMinLevel1ForL2Ref.current = minLevel1ExamplesForLevel2;
  }, [minLevel1ExamplesForLevel2]);

  /** Unique Level 1 example problem IDs viewed (must reach `minLevel1ExamplesForLevel2` to unlock Level 2). Kept in sync with `seenLevel1IdsRef`. */
  const [viewedLevel1Ids, setViewedLevel1Ids] = useState<string[]>([]);
  /** Gate for Level 2 tab — true after enough L1 views, or restored session already on L2+. */
  const [level1ExposureSatisfied, setLevel1ExposureSatisfied] = useState(() => {
    const key = getTutorSessionStorageKey(userId, unitId, lessonIndex);
    if (!key) return false;
    const snapshot = readTutorSessionSnapshot(key);
    return snapshot?.level1ExposureSatisfied === true || (snapshot?.currentLevel ?? 1) >= 2;
  });
  const level1ExposureSatisfiedRef = useRef(false);
  useLayoutEffect(() => {
    level1ExposureSatisfiedRef.current = level1ExposureSatisfied;
  }, [level1ExposureSatisfied]);
  const isKnownFirstLessonAccess = lessonStatus === "not-started";

  /** Register the active Level 1 problem as viewed (deduped). Keeps `seenLevel1IdsRef` aligned for exclude logic.
   *  Declared before the exposure gate so the same layout pass sees an updated `seenLevel1IdsRef` for Level 2 unlock. */
  useLayoutEffect(() => {
    if (currentLevel !== 1 || !currentProblem?.id) return;
    const id = currentProblem.id;
    setViewedLevel1Ids((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      seenLevel1IdsRef.current = next;
      return next;
    });
  }, [currentLevel, currentProblem?.id]);

  // Keep Level 2 gate aligned with server-derived threshold (e.g. live session loads after first paint).
  // Uses `seenLevel1IdsRef` (not just React state length) so this matches the register effect in the same layout pass.
  // On Level 2+, never demote — student is already past the gate for tab/UI consistency.
  useLayoutEffect(() => {
    if (currentLevel >= 2) {
      setLevel1ExposureSatisfied((prev) => (prev ? prev : true));
      return;
    }
    setLevel1ExposureSatisfied(
      seenLevel1IdsRef.current.length >= minLevel1ExamplesForLevel2,
    );
  }, [currentLevel, currentProblem?.id, minLevel1ExamplesForLevel2]);

  /** Clears answers/hints/structured completion and remounts step widgets (equation builder, multi-input, math fields). */
  const clearAllStepState = useCallback(() => {
    stepSettersRef.current.setAnswers({});
    stepSettersRef.current.setHints({});
    stepSettersRef.current.setHintLoading(new Set());
    stepSettersRef.current.setStructuredStepComplete({});
    stepSettersRef.current.setCheckingAnswer(new Set());
    setStepRemountKey((k) => {
      const next = k + 1;
      if (import.meta.env.DEV) {
        console.log("[tutor] step remount key ->", next);
      }
      return next;
    });
  }, []);

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
    classId: classroomId,
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

  const prefetchHydrateOrGenerate = useCallback(
    async (
      level: number,
      difficulty: "easy" | "medium" | "hard",
    ): Promise<GenerateResult> => {
      if (userId && !(level === 1 && isKnownFirstLessonAccess)) {
        try {
          const playlist = await apiGetPlaylist({
            unit_id: unitId,
            lesson_index: lessonIndex,
            level,
          });
          if (playlist?.problems?.length) {
            const idx = Math.min(
              Math.max(playlist.current_index, 0),
              Math.max(playlist.problems.length - 1, 0),
            );
            return parseHydratedProblem(playlist.problems[idx], idx, playlist.total);
          }
        } catch {
          // Fall back to generate for prefetch.
        }
      }
      return await generateProblem(difficulty, [], level);
    },
    [userId, unitId, lessonIndex, generateProblem, isKnownFirstLessonAccess],
  );

  const triggerPrefetch = useCallback(
    (difficulty: "easy" | "medium" | "hard", _excludeIds: string[], level: number) => {
      if (prefetchInFlight.current) return;
      const levelToPrefetch = level;
      const start = () => {
        if (prefetchInFlight.current) return;
        prefetchInFlight.current = true;
        prefetchPromiseRef.current = null;
        const promise = prefetchHydrateOrGenerate(levelToPrefetch, difficulty)
          .then((result) => {
            if (result.allow_answer_reveal !== undefined) {
              setAllowAnswerReveal(result.allow_answer_reveal);
            }
            if (result.max_answer_reveals_per_lesson !== undefined) {
              setMaxAnswerRevealsPerLesson(result.max_answer_reveals_per_lesson);
            }
            if (result.min_level1_examples_for_level2 !== undefined) {
              setMinLevel1ExamplesForLevel2Nav(result.min_level1_examples_for_level2);
            }
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
    [prefetchHydrateOrGenerate],
  );

  const prefetchNextLevelIfNeeded = useCallback(
    (difficulty: "easy" | "medium" | "hard", level: number) => {
      if (level >= 3) return;
      // Don't prefetch Level 2 until the user has seen enough Level 1 examples to unlock it.
      // Before that threshold, prefetching L2 wastes a generation call the user can't use yet.
      if (level === 1 && seenLevel1IdsRef.current.length < effectiveMinLevel1ForL2Ref.current) return;
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
      if (level === 1) {
        setPagination(defaultPaginationForLevel(level as Level));
        if (level1ProblemsRef.current.length === 0) level1ProblemsRef.current[0] = p;
      } else {
        // L2/L3: seed history ref and derive pagination.
        const historyRef = level === 2 ? level2ProblemsRef : level3ProblemsRef;
        if (!historyRef.current.find((pr) => pr.id === p.id)) {
          historyRef.current = [...historyRef.current, p];
        }
        const total = historyRef.current.length;
        const idx = total - 1;
        setPagination({
          current_index: idx,
          total,
          max_problems: total,
          has_prev: idx > 0,
          has_next: false,
          at_limit: false,
        });
      }
      setCurrentDifficulty(p.difficulty as "easy" | "medium" | "hard");
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
            if (stateSnapshot.current.currentLevel !== (level as Level)) {
              // User switched levels during the await — cache result, don't hijack UI.
              // triggerPrefetch already wrote to levelCacheRef; clear prefetch refs.
              prefetchedProblem.current = null;
              prefetchedLevel.current = 0;
              return p;
            }
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
        const {
          problem,
          pagination: pag,
          allow_answer_reveal: arFromGen,
          max_answer_reveals_per_lesson: maxFromGen,
          min_level1_examples_for_level2: minL1FromGen,
        } = await generateProblem(
          difficulty,
          excludeIds,
          level,
          false,
          forceRegenerate,
        );
        if (arFromGen !== undefined) setAllowAnswerReveal(arFromGen);
        if (maxFromGen !== undefined) setMaxAnswerRevealsPerLesson(maxFromGen);
        if (minL1FromGen !== undefined) setMinLevel1ExamplesForLevel2Nav(minL1FromGen);

        // Guard: if the user switched levels while we were awaiting the API, don't
        // overwrite the now-active level's problem/pagination/difficulty.
        const isCurrentLevel = stateSnapshot.current.currentLevel === expectedLevel;
        if (isCurrentLevel) {
          setCurrentProblem(problem);
          if (level === 1) {
            setPagination(makeLevel1Pagination(0, 1));
          } else {
            // L2/L3: append to history ref and derive pagination from it.
            const historyRef = level === 2 ? level2ProblemsRef : level3ProblemsRef;
            if (!historyRef.current.find((p) => p.id === problem.id)) {
              historyRef.current = [...historyRef.current, problem];
            }
            const total = Math.max(historyRef.current.length, pag?.total ?? 0);
            const idx = pag?.current_index ?? (historyRef.current.length - 1);
            setPagination({
              current_index: idx,
              total,
              max_problems: pag?.max_problems ?? total,
              has_prev: pag?.has_prev ?? (idx > 0),
              has_next: pag?.has_next ?? false,
              at_limit: false,
            });
            if ((pag?.has_prev ?? false) && historyRef.current.length <= 1) {
              void hydrateHistoryFromBackend(level, problem.id, idx, difficulty);
            }
          }
          setCurrentDifficulty(problem.difficulty as "easy" | "medium" | "hard");
        } else {
          // User switched levels during generation — cache the result for instant
          // restore when they return, instead of discarding and re-generating.
          const cachedPag = level === 1
            ? makeLevel1Pagination(0, 1)
            : (pag ?? defaultPaginationForLevel(level as Level));
          levelCacheRef.current[expectedLevel] = {
            problem,
            answers: {},
            hints: {},
            structuredStepComplete: {},
            pagination: cachedPag,
            difficulty: problem.difficulty as "easy" | "medium" | "hard",
          };
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
        // Only clear loading if this level is still active. If the user switched
        // levels, another loadNewProblem or restoreFromCache owns the flag now.
        if (stateSnapshot.current.currentLevel === expectedLevel) {
          setProblemLoading(false);
        }
        isFetchingLevelRef.current[level as Level] = false;
      }
    },
    [generateProblem, applyPrefetchedProblem, startAttemptForProblem, onAttemptStart, prefetchNextLevelIfNeeded],
  );

  const hydrateHistoryFromBackend = useCallback(
    async (
      level: number,
      currentProblemId: string,
      backendCurrentIndex: number,
      difficulty: "easy" | "medium" | "hard",
    ) => {
      if (!userId || level === 1) return;
      try {
        const expectedLevel = level as Level;
        const playlist = await apiGetPlaylist({
          unit_id: unitId,
          lesson_index: lessonIndex,
          level,
        });
        if (!playlist?.problems?.length) return;

        const hydratedProblems = parseHydratedProblems(playlist);
        if (hydratedProblems.length === 0) return;

        // Seed per-problem state from backend for every problem in the playlist.
        // Without this, navigating back to an earlier example after a level-switch
        // or hard refresh has no attempt data and shows empty answers.
        for (const hp of hydratedProblems) {
          const attemptForProblem = getHydratedAttemptForProblem(playlist, hp.id);
          if (attemptForProblem?.problem_id === hp.id) {
            hydratedAttemptByProblemRef.current[hp.id] = attemptForProblem;
          }
          const existing = perProblemCacheRef.current[hp.id];
          const merged = mergeHydratedProblemState(hp, existing, attemptForProblem ?? undefined);
          perProblemCacheRef.current[hp.id] = {
            answers: merged.answers,
            hints: existing?.hints ?? {},
            structuredStepComplete: merged.structuredStepComplete,
          };
        }

        const historyRef = level === 2 ? level2ProblemsRef : level3ProblemsRef;
        historyRef.current = hydratedProblems;
        const idx = Math.min(
          Math.max(backendCurrentIndex, 0),
          Math.max(hydratedProblems.length - 1, 0),
        );
        if (stateSnapshot.current.currentLevel !== expectedLevel) return;
        setPagination({
          current_index: idx,
          total: hydratedProblems.length,
          max_problems: hydratedProblems.length,
          has_prev: idx > 0,
          has_next: idx < hydratedProblems.length - 1,
          at_limit: false,
        });
        setCompletedProblemIds(
          hydratedProblems
            .map((p) => p.id)
            .filter((id) => id !== currentProblemId),
        );
      } catch {
        // Non-blocking hydration path.
      }
    },
    [userId, unitId, lessonIndex],
  );

  const restorePerProblemState = useCallback(
    (
      problem: Problem,
      activeAttempt?: HydratedAttempt,
    ) => {
      const effectiveAttempt = activeAttempt ?? hydratedAttemptByProblemRef.current[problem.id];
      const saved = perProblemCacheRef.current[problem.id];
      const merged = mergeHydratedProblemState(problem, saved, effectiveAttempt);
      const hints = saved?.hints ?? {};
      perProblemCacheRef.current[problem.id] = {
        answers: merged.answers,
        hints,
        structuredStepComplete: merged.structuredStepComplete,
      };
      stepSettersRef.current.setAnswers(merged.answers);
      stepSettersRef.current.setHints(hints);
      stepSettersRef.current.setStructuredStepComplete(merged.structuredStepComplete);
      if (effectiveAttempt?.problem_id === problem.id) {
        onAttemptStart(effectiveAttempt.is_complete ? null : merged.attemptId);
        setStepRemountKey((prev) => prev + 1);
      }
    },
    [onAttemptStart],
  ); // stepSettersRef is a stable ref

  const hydrateOrGenerateForLevel = useCallback(
    async (
      level: Level,
      difficulty: "easy" | "medium" | "hard",
      excludeIds: string[],
    ): Promise<Problem | null> => {
      if (userId && !(level === 1 && isKnownFirstLessonAccess)) {
        try {
          const expectedLevel = level;
          const playlist = await apiGetPlaylist({
            unit_id: unitId,
            lesson_index: lessonIndex,
            level,
          });
          if (playlist?.problems?.length) {
            const hydratedProblems = parseHydratedProblems(playlist);
            // Seed per-problem cache from backend hydration for the whole timeline, not just
            // the currently selected problem. This keeps saved attempts available when the user
            // navigates back to earlier examples after a hard refresh.
            for (const hydratedProblem of hydratedProblems) {
              const attemptForProblem = getHydratedAttemptForProblem(playlist, hydratedProblem.id);
              if (attemptForProblem?.problem_id === hydratedProblem.id) {
                hydratedAttemptByProblemRef.current[hydratedProblem.id] = attemptForProblem;
              }
              const existing = perProblemCacheRef.current[hydratedProblem.id];
              const merged = mergeHydratedProblemState(hydratedProblem, existing, attemptForProblem);
              perProblemCacheRef.current[hydratedProblem.id] = {
                answers: merged.answers,
                hints: existing?.hints ?? {},
                structuredStepComplete: merged.structuredStepComplete,
              };
            }
            const idx = Math.min(
              Math.max(playlist.current_index, 0),
              Math.max(hydratedProblems.length - 1, 0),
            );
            const restored = hydratedProblems[idx] ?? null;
            if (restored) {
              if (stateSnapshot.current.currentLevel !== expectedLevel) return restored;
              setCurrentProblem(restored);
              setCurrentDifficulty(restored.difficulty as "easy" | "medium" | "hard");
              if (level === 1) {
                level1ProblemsRef.current = [...hydratedProblems];
                const seenIds = hydratedProblems.map((p) => p.id);
                seenLevel1IdsRef.current = seenIds;
                setViewedLevel1Ids([...seenIds]);
                setPagination(makeLevel1Pagination(idx, hydratedProblems.length));
              } else {
                const historyRef = level === 2 ? level2ProblemsRef : level3ProblemsRef;
                historyRef.current = hydratedProblems;
                setPagination({
                  current_index: idx,
                  total: hydratedProblems.length,
                  max_problems: hydratedProblems.length,
                  has_prev: idx > 0,
                  has_next: idx < hydratedProblems.length - 1,
                  at_limit: false,
                });
                setCompletedProblemIds(
                  hydratedProblems
                    .map((p) => p.id)
                    .filter((id) => id !== restored.id),
                );
              }
              const restoredAttempt = getHydratedAttemptForProblem(playlist, restored.id);
              restorePerProblemState(restored, restoredAttempt);
              if (restoredAttempt?.problem_id !== restored.id) {
                startAttemptForProblem(
                  restored,
                  restored.difficulty as "easy" | "medium" | "hard",
                  level,
                );
              }
              setProblemLoading(false);
              return restored;
            }
          }
        } catch {
          // Fall through to generation.
        }
      }
      return await loadNewProblem(difficulty, excludeIds, level);
    },
    [
      userId,
      unitId,
      lessonIndex,
      loadNewProblem,
      restorePerProblemState,
      startAttemptForProblem,
      isKnownFirstLessonAccess,
    ],
  );

  // ── Init: reset guard on chapter/topic change ────────────────────────────
  // Align with `getTutorSessionStorageKey(userId, unitId, lessonIndex)` plus `lessonName`
  // (generation context). If deps drift from the restore effect, `hasInitializedRef` can stay
  // false with no re-run, or stale L1 policy can leak across lessons.

  useEffect(() => {
    hasInitializedRef.current = false;
    seenLevel1IdsRef.current = [];
    level1ProblemsRef.current = [];
    level2ProblemsRef.current = [];
    level3ProblemsRef.current = [];
    setAllowAnswerReveal(undefined);
    setMaxAnswerRevealsPerLesson(undefined);
    setMinLevel1ExamplesForLevel2Nav(undefined);
    setViewedLevel1Ids([]);
    setLevel1ExposureSatisfied(false);
  }, [unitId, lessonIndex, lessonName]);

  // ── Level 1 example-2 silent prefetch ────────────────────────────────────
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
        levelSolved?: Partial<Record<Level, number>>;
        viewedLevel1Ids?: string[];
        level1ExposureSatisfied?: boolean;
        minLevel1ExamplesForLevel2?: number;
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
          if (
            typeof parsed.minLevel1ExamplesForLevel2 === "number" &&
            Number.isFinite(parsed.minLevel1ExamplesForLevel2) &&
            parsed.minLevel1ExamplesForLevel2 >= 1
          ) {
            setMinLevel1ExamplesForLevel2Nav(Math.floor(parsed.minLevel1ExamplesForLevel2));
          }
          setCompletedProblemIds(parsed.completedProblemIds ?? []);
          setCurrentLevel(lvl as Level);
          if (parsed.levelSolved) {
            setLevelSolved({
              1: parsed.levelSolved[1] ?? 0,
              2: parsed.levelSolved[2] ?? 0,
              3: parsed.levelSolved[3] ?? 0,
            });
          }
          // Always restore viewed L1 IDs — needed to keep L2 unlocked on any level.
          if (parsed.viewedLevel1Ids?.length) {
            seenLevel1IdsRef.current = [...parsed.viewedLevel1Ids];
            setViewedLevel1Ids([...parsed.viewedLevel1Ids]);
          }
        };

        // Shared: compute and apply Level-1 client-side pagination from a cache entry.
        // Uses the max of cached total, restored problems array, and seen-IDs count so that
        // "Example X of Y" in the nav bar stays consistent with "Worked examples viewed: Y/min".
        const applyLevel1PaginationFromEntry = () => {
          const cachedTotal = entry.pagination?.total ?? 1;
          const n = Math.max(
            cachedTotal,
            level1ProblemsRef.current.filter(Boolean).length,
            seenLevel1IdsRef.current.length,
          );
          const curIdx = Math.min(entry.pagination?.current_index ?? 0, n - 1);
          setPagination(makeLevel1Pagination(curIdx, n));
        };

        if (cachedProblemHasBrokenMultiInput(entry.problem)) {
          // Snapshot predates `input_fields` on multi_input (or corrupt); refetch so UI matches API.
          applyCommonCacheInit();
          setCurrentDifficulty(entry.difficulty);
          if (lvl === 1) {
            level1ProblemsRef.current = [];
            applyLevel1PaginationFromEntry();
          } else {
            // Seed L2/L3 history ref at the correct index so prev/next navigation
            // is consistent while the async backend hydration fills the full history.
            const brokenHistRef = lvl === 2 ? level2ProblemsRef : level3ProblemsRef;
            if (brokenHistRef.current.length === 0) {
              const seedIdx = Math.max(entry.pagination?.current_index ?? 0, 0);
              const arr: Problem[] = [];
              arr[seedIdx] = entry.problem;
              brokenHistRef.current = arr;
            }
            setPagination(entry.pagination ?? defaultPaginationForLevel(lvl as Level));
          }
          if (typeof parsed.masteryScore === "number") onRestoreMasteryScore?.(parsed.masteryScore);
          if (parsed.hasCompletedLevel2 === true) onRestoreHasCompletedLevel2?.();
          clearAllStepState();
          void loadNewProblem(entry.difficulty, [], lvl as number);
          return () => {
            persistOnUnmountRef.current();
          };
        } else {
          applyCommonCacheInit();
          setCurrentProblem(entry.problem);
          // Restore the full L1 problems array so Prev/Next works entirely from local cache
          // after a page reload — avoids calling apiNavigateProblem with a stale backend index.
          if (lvl === 1) {
            if (parsed.level1Problems?.length) {
              level1ProblemsRef.current = [...parsed.level1Problems];
            } else if (entry.problem && level1ProblemsRef.current.length === 0) {
              // Fallback: seed at the correct index (not always [0]) to avoid wrong-problem-on-Prev.
              const curIdx = entry.pagination?.current_index ?? 0;
              if (level1ProblemsRef.current.length <= curIdx) level1ProblemsRef.current.length = curIdx + 1;
              level1ProblemsRef.current[curIdx] = entry.problem;
            }
          }
          const needL1 =
            typeof parsed.minLevel1ExamplesForLevel2 === "number" &&
            Number.isFinite(parsed.minLevel1ExamplesForLevel2) &&
            parsed.minLevel1ExamplesForLevel2 >= 1
              ? Math.floor(parsed.minLevel1ExamplesForLevel2)
              : getFallbackMinLevel1ExamplesForLevel2();
          const exposureOk =
            parsed.level1ExposureSatisfied === true ||
            (lvl != null && lvl >= 2) ||
            (parsed.viewedLevel1Ids?.length ?? 0) >= needL1;
          if (exposureOk) setLevel1ExposureSatisfied(true);
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
            // Seed L2/L3 history ref at the correct index so prev/next navigation
            // is consistent while the async backend hydration fills the full history.
            const normalHistRef = lvl === 2 ? level2ProblemsRef : level3ProblemsRef;
            if (normalHistRef.current.length === 0) {
              const seedIdx = Math.max(entry.pagination?.current_index ?? 0, 0);
              const arr: Problem[] = [];
              arr[seedIdx] = entry.problem;
              normalHistRef.current = arr;
            }
            setPagination(entry.pagination ?? defaultPaginationForLevel(lvl as Level));
          }
          if (typeof parsed.masteryScore === "number") onRestoreMasteryScore?.(parsed.masteryScore);
          if (parsed.hasCompletedLevel2 === true) onRestoreHasCompletedLevel2?.();
              if (userId && (lvl as Level) > 1) {
                void hydrateOrGenerateForLevel(lvl as Level, entry.difficulty, []);
              } else {
                startAttemptForProblem(entry.problem, entry.difficulty, lvl as Level);
              }
          setProblemLoading(false);
          return () => {
            persistOnUnmountRef.current();
          };
        }
      }
    }
    hasInitializedRef.current = true;
    void hydrateOrGenerateForLevel(1, "medium", []);
    return () => {
      persistOnUnmountRef.current();
    };
  }, [unitId, lessonIndex, lessonName, userId, clearAllStepState, hydrateOrGenerateForLevel]);

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
        // Deep copy to prevent reference sharing with React state that gets cleared on reset.
        perProblemCacheRef.current[p.id] = {
          answers: { ...a },
          hints: { ...h },
          structuredStepComplete: { ...s },
        };
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
            levelSolved: levelSolvedRef.current,
            viewedLevel1Ids: seenLevel1IdsRef.current,
            minLevel1ExamplesForLevel2: effectiveMinLevel1ForL2Ref.current,
            level1ExposureSatisfied:
              level1ExposureSatisfiedRef.current ||
              seenLevel1IdsRef.current.length >= effectiveMinLevel1ForL2Ref.current,
            // Persist the full L1 problems array so Prev/Next works after page reload
            // without falling back to apiNavigateProblem (which uses stale backend index).
            level1Problems: level1ProblemsRef.current.filter(Boolean) as Problem[],
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
        // Seed level1ProblemsRef from cache in case it was cleared by a page reload.
        // Use the actual current_index so the problem lands in the correct slot.
        if (level1ProblemsRef.current.length === 0) {
          const idx = entry.pagination?.current_index ?? 0;
          if (level1ProblemsRef.current.length <= idx) level1ProblemsRef.current.length = idx + 1;
          level1ProblemsRef.current[idx] = entry.problem;
        }
        setPagination(makeLevel1Pagination(curIdx, n));
      } else {
        // Seed L2/L3 history ref at the cached problem's correct index so navigation
        // works immediately while async backend hydration fills the rest of the history.
        // Using a sparse array (not index 0) prevents navigating "prev" from finding
        // the wrong problem before hydration completes.
        const histRefToSeed = level === 2 ? level2ProblemsRef : level3ProblemsRef;
        if (histRefToSeed.current.length === 0) {
          const seedIdx = Math.max(entry.pagination?.current_index ?? 0, 0);
          const arr: Problem[] = [];
          arr[seedIdx] = entry.problem;
          histRefToSeed.current = arr;
        }
        setPagination(entry.pagination ?? defaultPaginationForLevel(level));
        // Always refresh full backend timeline after cache restore so unsolved examples
        // are not lost if the local cache only had a partial history snapshot.
        if (userId) {
          void hydrateHistoryFromBackend(
            level,
            entry.problem.id,
            entry.pagination?.current_index ?? 0,
            entry.difficulty,
          );
        }
      }

      // Clear any in-flight loading state from a concurrent generate call on another level.
      setProblemLoading(false);
      const cachedState = perProblemCacheRef.current[entry.problem.id];
      const hasCachedStudentWork =
        Object.keys(cachedState?.answers ?? {}).length > 0 ||
        Object.keys(cachedState?.structuredStepComplete ?? {}).length > 0;
      // Avoid creating a newer empty attempt row that can overwrite hydrated answers for this problem.
      // Only start a fresh attempt when this cached problem has no prior student work in local state.
      if (!hasCachedStudentWork) {
        startAttemptForProblem(entry.problem, entry.difficulty, level);
      }
      // Eager loading: when restoring to Level 2, start Level 3 prefetch so advance is zero-wait.
      if (level === 2) {
        triggerPrefetch(entry.difficulty, [], 3);
      }
    },
    [triggerPrefetch, startAttemptForProblem, loadNewProblem, userId, hydrateHistoryFromBackend], // stepSettersRef, seenLevel1IdsRef, level1ProblemsRef are stable refs
  );

  /**
   * After clearing React step state, persist empty answers/drafts immediately.
   * Otherwise saveCurrentStateToCache (or a tab-hide save) can run before stepStateRef catches up
   * and re-write perProblemCache / localStorage with stale drafts — undoing the reset in the UI
   * on the next restore/remount.
   */
  const syncStoredSnapshotAfterStepReset = useCallback(() => {
    const p = stateSnapshot.current.currentProblem;
    const lvl = stateSnapshot.current.currentLevel;
    if (!p) return;

    // Only clear the level cache entry's step state (so the UI shows a clean slate),
    // but PRESERVE perProblemCacheRef — the student's answers for this problem are still valid
    // and needed for "Previous" navigation.
    const entry = levelCacheRef.current[lvl];
    if (entry?.problem?.id === p.id) {
      levelCacheRef.current[lvl] = {
        ...entry,
        answers: {},
        hints: {},
        structuredStepComplete: {},
        thinkingSteps: [],
        classifiedErrors: [],
      };
    }

    const storageKey = userId ? getTutorSessionStorageKey(userId, unitId, lessonIndex) : null;
    if (!storageKey) return;

    try {
      writeTutorSessionSnapshot(storageKey, {
        currentLevel: lvl,
        levelCache: levelCacheRef.current,
        perProblemCache: perProblemCacheRef.current,
        completedProblemIds: stateSnapshot.current.completedProblemIds ?? [],
        masteryScore: masteryScoreRef.current,
        hasCompletedLevel2: hasCompletedLevel2Ref.current,
        levelSolved: levelSolvedRef.current,
        viewedLevel1Ids: seenLevel1IdsRef.current,
        minLevel1ExamplesForLevel2: effectiveMinLevel1ForL2Ref.current,
        level1ExposureSatisfied:
          level1ExposureSatisfiedRef.current ||
          seenLevel1IdsRef.current.length >= effectiveMinLevel1ForL2Ref.current,
      });
    } catch {
      /* quota / private mode */
    }
  }, [userId, unitId, lessonIndex, masteryScoreRef, hasCompletedLevel2Ref]);

  const resetProblemState = useCallback(
    (opts?: { clearPagination?: boolean; clearCurrentProblemCache?: boolean }) => {
      const clearPagination = opts?.clearPagination ?? true;
      const clearCurrentProblemCache = opts?.clearCurrentProblemCache ?? false;
      if (clearCurrentProblemCache && stateSnapshot.current.currentProblem) {
        delete perProblemCacheRef.current[stateSnapshot.current.currentProblem.id];
      }
      clearAllStepState();
      stepSettersRef.current.resetTracking();
      syncStoredSnapshotAfterStepReset();
      if (clearPagination) setPagination(null);
    },
    [clearAllStepState, syncStoredSnapshotAfterStepReset],
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
          restorePerProblemState(cached);
          setPagination(makeLevel1Pagination(targetIdx, pag.total));
          stepSettersRef.current.setHintLoading(new Set());
          stepSettersRef.current.resetTracking();
          setIsNavigating(false);
          return;
        }
      }
      // Levels 2/3: use local history ref for Prev/Next — never hit the backend.
      if (lvl === 2 || lvl === 3) {
        const historyRef = lvl === 2 ? level2ProblemsRef : level3ProblemsRef;
        const curIdx = pag?.current_index ?? 0;
        const targetIdx = direction === "next" ? curIdx + 1 : curIdx - 1;
        const cached = historyRef.current[targetIdx];
        if (cached != null && targetIdx >= 0 && targetIdx < historyRef.current.length) {
          setIsNavigating(true);
          saveCurrentStateToCache();
          setCurrentProblem(cached);
          restorePerProblemState(cached);
          const cachedState = perProblemCacheRef.current[cached.id];
          const hasCachedStudentWork =
            Object.keys(cachedState?.answers ?? {}).length > 0 ||
            Object.keys(cachedState?.structuredStepComplete ?? {}).length > 0;
          // Start an attempt for unsolved cached problems so completion always has a live attempt_id.
          // Keep existing behavior for solved/restored problems to avoid creating empty newer attempts.
          if (!hasCachedStudentWork) {
            startAttemptForProblem(cached, cached.difficulty as "easy" | "medium" | "hard", lvl);
          }
          setPagination({
            current_index: targetIdx,
            total: historyRef.current.length,
            max_problems: historyRef.current.length,
            has_prev: targetIdx > 0,
            has_next: targetIdx + 1 < historyRef.current.length,
            at_limit: false,
          });
          stepSettersRef.current.setHintLoading(new Set());
          stepSettersRef.current.resetTracking();
          setIsNavigating(false);
        } else if (direction === "prev") {
          toast.info("Already at the first example.");
        }
        return;
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
          class_id: classroomId,
        });
        const {
          problem,
          pagination: navPag,
          allow_answer_reveal: arNav,
          max_answer_reveals_per_lesson: maxNav,
          min_level1_examples_for_level2: minL1Nav,
        } = parseProblemOutput(data);
        if (arNav !== undefined) setAllowAnswerReveal(arNav);
        if (maxNav !== undefined) setMaxAnswerRevealsPerLesson(maxNav);
        if (minL1Nav !== undefined) setMinLevel1ExamplesForLevel2Nav(minL1Nav);

        // Always populate Level 1 local cache regardless of active level.
        if (lvl === 1 && problem && navPag) {
          const idx = navPag.current_index;
          if (level1ProblemsRef.current.length <= idx) level1ProblemsRef.current.length = idx + 1;
          level1ProblemsRef.current[idx] = problem;
        }

        if (stateSnapshot.current.currentLevel !== lvl) {
          // User switched levels during the API call — cache the result for later
          // instead of overwriting the now-active level's display.
          levelCacheRef.current[lvl] = {
            problem,
            answers: {},
            hints: {},
            structuredStepComplete: {},
            pagination: lvl === 1
              ? makeLevel1Pagination(navPag?.current_index ?? 0, navPag?.total ?? 1)
              : (navPag ?? defaultPaginationForLevel(lvl)),
            difficulty: problem.difficulty as "easy" | "medium" | "hard",
          };
          return;
        }

        saveCurrentStateToCache();
        setCurrentProblem(problem);
        setCurrentDifficulty(problem.difficulty as "easy" | "medium" | "hard");
        stepSettersRef.current.setHintLoading(new Set());
        restorePerProblemState(problem);
        setPagination(navPag ?? defaultPaginationForLevel(lvl));
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
        } else if (lvl === 1 && direction === "next" && needsGeneration) {
          // L1: backend playlist exhausted (stale current_index after client-side navigation).
          // Do NOT silently generate a new problem — that discards the user's saved example.
          // The local cache (level1ProblemsRef) should have served this before reaching here;
          // reaching this branch means localStorage was cleared. Let the user decide.
          toast.info("No more saved examples. Click 'See Another Worked Example' to generate a new one.");
        } else if (needsGeneration || direction === "next") {
          // L2/L3: generate the next problem in the sequence.
          // Use the captured lvl/diff from the start of this navigation,
          // not the current stateSnapshot — the user may have switched levels.
          if (stateSnapshot.current.currentLevel !== lvl) return;
          resetProblemState({ clearPagination: false });
          const cpi = stateSnapshot.current.completedProblemIds;
          try {
            await loadNewProblem(diff, cpi, lvl);
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
    [
      userId,
      unitId,
      lessonIndex,
      saveCurrentStateToCache,
      loadNewProblem,
      restorePerProblemState,
      resetProblemState,
      startAttemptForProblem,
    ],
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

          if (result.allow_answer_reveal !== undefined) {
            setAllowAnswerReveal(result.allow_answer_reveal);
          }
          if (result.max_answer_reveals_per_lesson !== undefined) {
            setMaxAnswerRevealsPerLesson(result.max_answer_reveals_per_lesson);
          }
          if (result.min_level1_examples_for_level2 !== undefined) {
            setMinLevel1ExamplesForLevel2Nav(result.min_level1_examples_for_level2);
          }

          // seenLevel1IdsRef + level1ProblemsRef are the source of truth for Level 1 pagination.
          // restoreFromCache recomputes pagination from these refs when the user returns to Level 1,
          // so we do NOT need to update levelCacheRef here.
          if (!seenLevel1IdsRef.current.includes(newProblem.id)) {
            seenLevel1IdsRef.current = [...seenLevel1IdsRef.current, newProblem.id];
          }
          setViewedLevel1Ids([...seenLevel1IdsRef.current]);
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
          // Now that the user has seen enough L1 examples, kick off L2 prefetch.
          if (n >= effectiveMinLevel1ForL2Ref.current) {
            prefetchNextLevelIfNeeded(diff, 1);
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

    // Levels 2/3: navigate within local history if ahead, otherwise generate new and append
    const excludeIds = [...cpi];
    if (cur?.id) excludeIds.push(cur.id);

    const snap = stateSnapshot.current.pagination;
    const historyRef = lvl === 2 ? level2ProblemsRef : level3ProblemsRef;

    // Seed history from current problem on first "See Another" call
    if (historyRef.current.length === 0 && cur) {
      historyRef.current = [cur];
    }

    // Navigate forward within already-loaded history
    if (snap && snap.current_index + 1 < historyRef.current.length) {
      const nextIdx = snap.current_index + 1;
      const cached = historyRef.current[nextIdx];
      setCurrentProblem(cached);
      restorePerProblemState(cached);
      const cachedState = perProblemCacheRef.current[cached.id];
      const hasCachedStudentWork =
        Object.keys(cachedState?.answers ?? {}).length > 0 ||
        Object.keys(cachedState?.structuredStepComplete ?? {}).length > 0;
      if (!hasCachedStudentWork) {
        startAttemptForProblem(cached, cached.difficulty as "easy" | "medium" | "hard", lvl);
      }
      setPagination({
        ...snap,
        current_index: nextIdx,
        total: historyRef.current.length,
        has_prev: true,
        has_next: nextIdx + 1 < historyRef.current.length,
        at_limit: false,
      });
      stepSettersRef.current.resetTracking();
      return;
    }

    // No more history — generate a new problem and append it
    saveCurrentStateToCache();
    resetProblemState({ clearPagination: false });
    const newProblem = await loadNewProblem(diff, excludeIds, lvl);
    if (!newProblem) return;

    // Append to history (deduplicate)
    if (!historyRef.current.find((p) => p.id === newProblem.id)) {
      historyRef.current = [...historyRef.current, newProblem];
    }
    const newTotal = historyRef.current.length;
    const newIdx = newTotal - 1;
    setPagination({
      current_index: newIdx,
      total: newTotal,
      max_problems: snap?.max_problems ?? newTotal,
      has_prev: newIdx > 0,
      has_next: false,
      at_limit: false,
    });
  }, [handleNavigate, saveCurrentStateToCache, loadNewProblem, resetProblemState, generateProblem, startAttemptForProblem, restorePerProblemState, prefetchNextLevelIfNeeded]);

  const handleLevelChange = useCallback(
    (level: Level): boolean => {
      if (level === 3 && !hasCompletedLevel2Ref.current) return false;
      // Use seen ids + threshold refs — `level1ExposureSatisfied` state can lag one frame behind
      // after the last Level 1 view registers (layout effect order).
      if (level === 2) {
        const need = effectiveMinLevel1ForL2Ref.current;
        if (seenLevel1IdsRef.current.length < need) {
          toast.info(
            `View at least ${need} worked examples in Level 1 to unlock Level 2 Practice.`,
          );
          return false;
        }
        if (!level1ExposureSatisfiedRef.current) {
          setLevel1ExposureSatisfied(true);
        }
      }
      saveCurrentStateToCache();
      const cached = levelCacheRef.current[level];
      if (cached) {
        restoreFromCache(cached, level);
        return true;
      }
      setCurrentLevel(level);
      setCurrentProblem(null);
      setProblemLoading(true);
      resetProblemState();
      setPagination(defaultPaginationForLevel(level));
      // Reset L2/L3 history when switching to that level fresh (no cache)
      if (level === 2) level2ProblemsRef.current = [];
      if (level === 3) level3ProblemsRef.current = [];
      // Level 3 default difficulty is "medium" — backend recommendations override this
      // in handleContinueAfterProgression via the backendDiff path.
      const { completedProblemIds: cpi } = stateSnapshot.current;
      void hydrateOrGenerateForLevel(level, "medium", cpi);
      return true;
    },
    [saveCurrentStateToCache, restoreFromCache, resetProblemState, hydrateOrGenerateForLevel], // refs are stable
  );

  const handleStartFadedExample = useCallback(() => {
    if (handleLevelChange(2)) {
      toast.success("Let's try a faded example!");
    }
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
    const newProblem = await loadNewProblem(diff, [], lvl, true);
    if (!newProblem) return;
    // Keep L2/L3 history ref in sync so Prev navigation works after a force-regenerate.
    if (lvl === 2 || lvl === 3) {
      const historyRef = lvl === 2 ? level2ProblemsRef : level3ProblemsRef;
      if (!historyRef.current.find((p) => p.id === newProblem.id)) {
        historyRef.current = [...historyRef.current, newProblem];
      }
      const newTotal = historyRef.current.length;
      const newIdx = newTotal - 1;
      setPagination({
        current_index: newIdx,
        total: newTotal,
        max_problems: newTotal,
        has_prev: newIdx > 0,
        has_next: false,
        at_limit: false,
      });
    }
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
    stepRemountKey,
    loadNewProblem,
    hydrateOrGenerateForLevel,
    saveCurrentStateToCache,
    resetProblemState,
    handleResetProblem,
    handleNavigate,
    handleSeeAnother,
    handleLevelChange,
    handleStartFadedExample,
    handleForceRegenerate,
    allowAnswerReveal,
    maxAnswerRevealsPerLesson,
    minLevel1ExamplesForLevel2,
    viewedLevel1Ids,
    level1ExposureSatisfied,
  };
}
