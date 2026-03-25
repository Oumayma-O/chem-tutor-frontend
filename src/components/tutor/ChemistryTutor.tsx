import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Level, LEVEL_CONFIGS, StudentAnswer, ProgressionResult } from "@/types/chemistry";
import { ExitTicketResult, ThinkingStep, ClassifiedError } from "@/types/cognitive";
import { getRandomProblem, getDifficultyForMastery } from "@/data/sampleProblems";
import {
  apiGetMastery,
  apiUnlockLevel3,
  apiSetTopicStatus,
  apiSaveStep,
  apiCompleteAttempt,
} from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  apiGetReferenceCard,
  refCardQueryKey,
  REF_CARD_STALE_MS,
  REF_CARD_GC_MS,
  type ReferenceCardOutput,
} from "@/lib/api/problems";
import {
  useProblemNavigation,
  StepSetters,
} from "@/hooks/useProblemNavigation";
import { useStepHandlers, STEP_TYPE_MAP } from "@/hooks/useStepHandlers";
import { LevelSelector } from "./LevelSelector";
import { ProblemCard } from "./ProblemCard";
import { GivenStep } from "./GivenStep";
import { InteractiveStep } from "./InteractiveStep";
import { EquationBuilder } from "./EquationBuilder";
import { KnownsIdentifier } from "./KnownsIdentifier";
import { ComparisonStep } from "./ComparisonStep";
import { ReferencePanel } from "./ReferencePanel";
import { MasteryBreakdown } from "./MasteryBreakdown";
import { ProgressionModal } from "./ProgressionModal";
import { ThinkingTracker } from "./ThinkingTracker";
import { ExitTicketMode } from "./ExitTicketMode";
import { TimedModeLaunchScreen } from "./TimedModeLaunchScreen";
import { TimedModeTransitionScreen } from "./TimedModeTransitionScreen";
import { ToolsWidget } from "./ToolsWidget";
import { useAdaptiveProgression } from "@/hooks/useAdaptiveProgression";
import { useCognitiveTracking } from "@/hooks/useCognitiveTracking";
import { Button } from "@/components/ui/button";
import { ProblemLoadingState } from "@/components/tutor/ProblemLoadingState";

import {
  CheckCircle,
  RotateCcw,
  FlaskConical,
  ArrowRight,
  Zap,
  ClipboardCheck,
  ArrowLeft,
  Timer,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
/** Derive overall mastery % from backend state. Use category_scores average when mastery_score is 0 or missing. */
function overallMasteryPercent(
  mastery_score: number | undefined | null,
  category_scores?: { conceptual?: number; procedural?: number; computational?: number; representation?: number } | null
): number {
  const vals = category_scores
    ? [
        category_scores.conceptual,
        category_scores.procedural,
        category_scores.computational,
        category_scores.representation,
      ].filter((v): v is number => typeof v === "number")
    : [];
  if (vals.length > 0 && (typeof mastery_score !== "number" || mastery_score === 0)) {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 100);
  }
  return typeof mastery_score === "number" ? Math.round(mastery_score * 100) : 0;
}

/** Map step type to backend reasoningPattern for mastery step_log. */
const STEP_TYPE_TO_REASONING_PATTERN: Record<string, string> = {
  formula_selection: "Conceptual",
  variable_identification: "Conceptual",
  substitution: "Procedural",
  calculation: "Arithmetic",
  units_handling: "Units",
};

const REASONING_TO_ERROR_CATEGORY: Record<string, string> = {
  Conceptual: "conceptual",
  Procedural: "procedural",
  Substitution: "procedural",
  Arithmetic: "computational",
  Units: "computational",
  Symbolic: "representation",
};

interface ChemistryTutorProps {
  unitId: string;
  unitTitle: string;
  lessonName?: string;
  lessonIndex?: number;
  userId?: string;
  onTopicComplete?: () => void;
  onMarkInProgress?: () => void;
  /** When true, Level 3 is shown as unlocked (from parent's lesson completion state — avoids extra progress API call). */
  lessonCompleted?: boolean;
  interests?: string[];
  gradeLevel?: string | null;
  /** Tool keys for this lesson, e.g. ['periodic_table']. From API lesson.required_tools. */
  requiredTools?: string[];
}

/**
 * ChemistryTutor — main practice UI. Logic is split across:
 * - useProblemNavigation: load/cache/pagination/level switch + persistence
 * - useStepHandlers: answers, hints, validation, reset
 * - useCognitiveTracking: thinking steps, classification, skill map
 * - useAdaptiveProgression: checkProgression for advance/stay
 * This component wires hooks, handles progression modal/exit ticket, and renders layout.
 */
export function ChemistryTutor({
  unitId,
  unitTitle,
  lessonName,
  lessonIndex = 0,
  userId,
  onTopicComplete,
  onMarkInProgress,
  lessonCompleted = false,
  interests = [],
  gradeLevel = null,
  requiredTools = [],
}: ChemistryTutorProps) {
  const currentTopicName = lessonName || unitTitle;

  // ── Mastery state (owned by component — cross-cutting between both hooks) ─
  const [masteryScore, setMasteryScore] = useState(0);
  const [backendCategoryScores, setBackendCategoryScores] = useState<{
    conceptual: number;
    procedural: number;
    computational: number;
    representation: number;
  } | null>(null);
  const [hasCompletedLevel2, setHasCompletedLevel2] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [recommendedDifficulty, setRecommendedDifficulty] = useState<
    "easy" | "medium" | "hard" | null
  >(null);

  // ── UI / modal state ──────────────────────────────────────────────────────
  const [showProgressionModal, setShowProgressionModal] = useState(false);
  const [progressionResult, setProgressionResult] = useState<ProgressionResult | null>(null);
  const [showExitTicket, setShowExitTicket] = useState(false);
  const [exitTicketResults, setExitTicketResults] = useState<ExitTicketResult[]>([]);
  const [calculatorEnabled] = useState(true);

  // ── Timed mode state ──────────────────────────────────────────────────────
  const [timedModeActive, setTimedModeActive] = useState(false);
  const [timedPracticeMinutes, setTimedPracticeMinutes] = useState<number | null>(null);
  const [timedStartedAt, setTimedStartedAt] = useState<string | null>(null);
  const [showLaunchScreen, setShowLaunchScreen] = useState(false);
  const [showTransitionScreen, setShowTransitionScreen] = useState(false);
  const [timedExitTicketConfigId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const fromSimulationLab = Boolean(
    (location.state as { fromSimulationLab?: boolean } | null)?.fromSimulationLab,
  );

  // ── Bridge refs: give useProblemNavigation access to step state / mastery ─
  const masteryScoreRef = useRef(masteryScore);
  const hasCompletedLevel2Ref = useRef(hasCompletedLevel2);
  const stepStateRef = useRef<{
    answers: Record<string, StudentAnswer>;
    hints: Record<string, string>;
    structuredStepComplete: Record<string, boolean>;
  }>({ answers: {}, hints: {}, structuredStepComplete: {} });
  const stepSettersRef = useRef<StepSetters>({
    setAnswers: (_v) => {},
    setHints: (_v) => {},
    setHintLoading: (_v) => {},
    setStructuredStepComplete: (_v) => {},
    resetTracking: () => {},
    setThinkingSteps: (_v) => {},
    setClassifiedErrors: (_v) => {},
  });
  const cognitiveStateRef = useRef<{ thinkingSteps: ThinkingStep[]; classifiedErrors: ClassifiedError[] }>({
    thinkingSteps: [],
    classifiedErrors: [],
  });
  const lastSavedStepLogKeyRef = useRef<string>("");
  /** Stores the in-flight apiCompleteAttempt promise so handleContinueAfterProgression can await it. */
  const completeAttemptPromiseRef = useRef<Promise<unknown> | null>(null);

  // ── Cognitive tracking ────────────────────────────────────────────────────
  const {
    thinkingSteps,
    classifiedErrors,
    skillMap,
    recentAttempts,
    learningInsight,
    isAnalyzing,
    startStepTimer,
    recordThinkingStep,
    classifyErrors,
    updateSkillFromAttempt,
    completeProblemAttempt,
    resetTracking,
    setThinkingSteps: restoreThinkingSteps,
    setClassifiedErrors: restoreClassifiedErrors,
  } = useCognitiveTracking();

  // ── Problem navigation hook ───────────────────────────────────────────────
  const nav = useProblemNavigation({
    unitId,
    lessonIndex,
    lessonName: currentTopicName,
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
    onAttemptStart: setCurrentAttemptId,
    onRestoreMasteryScore: (s) => setMasteryScore(s),
    onRestoreHasCompletedLevel2: () => setHasCompletedLevel2(true),
  });

  // ── Reference card (fiche de cours) — React Query handles caching/dedup ──
  // The prefetch fired from UnitLandingPage may already be in-flight; useQuery
  // attaches to that same promise instead of starting a new request.
  // nav must be declared before this hook so we can read nav.currentLevel.
  const { data: referenceCard = null, isLoading: referenceCardLoading } = useQuery({
    queryKey: refCardQueryKey(unitId, lessonIndex),
    queryFn: () => apiGetReferenceCard(unitId, lessonIndex, currentTopicName),
    staleTime: REF_CARD_STALE_MS,
    gcTime: REF_CARD_GC_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: nav.currentLevel !== 3,
  });

  // ── Step handlers hook ────────────────────────────────────────────────────
  const steps = useStepHandlers({
    currentProblem: nav.currentProblem,
    currentLevel: nav.currentLevel,
    calculatorEnabled,
    interests,
    gradeLevel,
    perProblemCacheRef: nav.perProblemCacheRef,
    thinkingSteps,
    classifiedErrors,
    recordThinkingStep,
    updateSkillFromAttempt,
    classifyErrors,
    resetTracking,
    onMarkInProgress,
  });

  // ── Sync bridge refs (runs after all hooks' useLayoutEffects) ─────────────
  useLayoutEffect(() => {
    masteryScoreRef.current = masteryScore;
    hasCompletedLevel2Ref.current = hasCompletedLevel2;
    stepStateRef.current = {
      answers: steps.answers,
      hints: steps.hints,
      structuredStepComplete: steps.structuredStepComplete,
    };
    cognitiveStateRef.current = { thinkingSteps, classifiedErrors };
    stepSettersRef.current = {
      setAnswers: steps.setAnswers,
      setHints: steps.setHints,
      setHintLoading: steps.setHintLoading,
      setStructuredStepComplete: steps.setStructuredStepComplete,
      resetTracking,
      setThinkingSteps: restoreThinkingSteps,
      setClassifiedErrors: restoreClassifiedErrors,
    };
  }); // no deps — runs every render

  // ── Derived values ────────────────────────────────────────────────────────
  const problem = nav.currentProblem;
  const displaySteps = useMemo(() => (problem ? problem.steps : []), [problem]);
  const interactiveStepIds = steps.interactiveSteps.map((s) => s.id);
  const isLevel3Locked = !hasCompletedLevel2;

  const completedSteps = steps.interactiveSteps.filter(
    (s) => steps.answers[s.id]?.is_correct === true || steps.structuredStepComplete[s.id],
  );
  const allComplete =
    steps.interactiveSteps.length > 0 &&
    steps.interactiveSteps.every(
      (s) => steps.answers[s.id]?.is_correct === true || steps.structuredStepComplete[s.id],
    );

  const levelConfig = LEVEL_CONFIGS.find((c) => c.level === nav.currentLevel) ?? LEVEL_CONFIGS[0];

  // ── Adaptive progression ──────────────────────────────────────────────────
  const { checkProgression } = useAdaptiveProgression({
    currentLevel: nav.currentLevel,
    masteryScore,
    answers: steps.answers,
    interactiveStepIds,
    structuredStepComplete: steps.structuredStepComplete,
  });

  // ── Side effects ──────────────────────────────────────────────────────────

  // Fetch mastery from backend on load
  useEffect(() => {
    if (!userId) return;
    apiGetMastery(userId, unitId, lessonIndex)
      .then((state) => {
        setHasCompletedLevel2((prev) => prev || !!state.level3_unlocked);
        const cs = state.category_scores;
        if (cs) {
          setBackendCategoryScores({
            conceptual: cs.conceptual ?? 0.0,
            procedural: cs.procedural ?? 0.0,
            computational: cs.computational ?? 0.0,
            representation: cs.representation ?? 0.0,
          });
        } else {
          setBackendCategoryScores(null);
        }
        setMasteryScore(overallMasteryPercent(state.mastery_score, state.category_scores));
      })
      .catch(() => {});

  }, [userId, unitId, lessonIndex]);

  // Level 3 unlock from parent's lesson completion (avoids duplicate progress API)
  useEffect(() => {
    if (lessonCompleted) setHasCompletedLevel2((prev) => prev || true);
  }, [lessonCompleted]);


  // Start step timer when interactive steps become available
  useEffect(() => {
    steps.interactiveSteps.forEach((step) => {
      if (!steps.answers[step.id]) {
        startStepTimer(step.id);
      }
    });
  }, [steps.interactiveSteps, steps.answers, startStepTimer]);

  useEffect(() => {
    lastSavedStepLogKeyRef.current = "";
  }, [currentAttemptId, nav.currentProblem?.id]);

  // Persist per-step progress and get a live mastery snapshot after each validated step.
  useEffect(() => {
    if (!userId || !currentAttemptId || nav.currentLevel === 1 || steps.interactiveSteps.length === 0) return;

    const attempted = steps.interactiveSteps
      .map((s) => {
        const answerState = steps.answers[s.id];
        const hasDecision =
          typeof answerState?.is_correct === "boolean" || steps.structuredStepComplete[s.id] === true;
        if (!hasDecision) return null;
        const isCorrect =
          answerState?.is_correct === true || steps.structuredStepComplete[s.id] === true;
        const stepType = STEP_TYPE_MAP[s.step_number] ?? "calculation";
        const reasoningPattern = STEP_TYPE_TO_REASONING_PATTERN[stepType] ?? "Procedural";
        return {
          step_id: s.id,
          is_correct: isCorrect,
          reasoning_pattern: reasoningPattern,
          error_category: REASONING_TO_ERROR_CATEGORY[reasoningPattern] ?? "procedural",
        };
      })
      .filter(
        (x): x is {
          step_id: string;
          is_correct: boolean;
          reasoning_pattern: string;
          error_category: string;
        } => !!x
      );

    if (attempted.length === 0) return;

    const requestStepLog = attempted.map((x) => ({
      is_correct: x.is_correct,
      reasoning_pattern: x.reasoning_pattern,
      error_category: x.error_category,
    }));
    const payloadKey = JSON.stringify(requestStepLog);
    if (payloadKey === lastSavedStepLogKeyRef.current) return;
    lastSavedStepLogKeyRef.current = payloadKey;

    apiSaveStep({
      attempt_id: currentAttemptId,
      step_log: requestStepLog,
    })
      .then((res) => {
        const cs = res.mastery?.category_scores;
        if (cs) {
          setBackendCategoryScores({
            conceptual: cs.conceptual ?? 0.0,
            procedural: cs.procedural ?? 0.0,
            computational: cs.computational ?? 0.0,
            representation: cs.representation ?? 0.0,
          });
        }
        setMasteryScore(overallMasteryPercent(res.mastery?.mastery_score, res.mastery?.category_scores));
      })
      .catch(() => {});
  }, [
    userId,
    currentAttemptId,
    nav.currentLevel,
    steps.interactiveSteps,
    steps.answers,
    steps.structuredStepComplete,
  ]);

  // Timed mode countdown
  useEffect(() => {
    if (!timedModeActive || !timedStartedAt || !timedPracticeMinutes) {
      setTimeRemaining(null);
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - new Date(timedStartedAt).getTime()) / 1000;
      const remaining = Math.max(0, timedPracticeMinutes * 60 - elapsed);
      setTimeRemaining(Math.ceil(remaining));
      if (remaining <= 0 && !showTransitionScreen && !showExitTicket) {
        setShowTransitionScreen(true);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [timedModeActive, timedStartedAt, timedPracticeMinutes, showTransitionScreen, showExitTicket]);

  // ── Mastery / progression handlers ───────────────────────────────────────

  const persistLevel3Unlock = useCallback(async () => {
    if (!userId) return;
    try {
      await apiUnlockLevel3(userId, unitId, lessonIndex);
      await apiSetTopicStatus(userId, unitId, lessonIndex, "in-progress");
    } catch {
      /* non-critical */
    }
  }, [userId, unitId, lessonIndex]);

  const handleTimedTransitionComplete = useCallback(async () => {
    setShowTransitionScreen(false);
    setShowExitTicket(true);
  }, []);

  const handleCheckProgression = useCallback(() => {
    if (!nav.currentProblem) return;
    const result = checkProgression();
    setProgressionResult(result);
    setShowProgressionModal(true);

    if (result.should_advance && result.next_level === 3 && nav.currentLevel === 2) {
      setHasCompletedLevel2(true);
    }

    const allFirstAttempt = interactiveStepIds.every(
      (id) => steps.answers[id]?.first_attempt_correct === true,
    );
    completeProblemAttempt(
      nav.currentProblem.id,
      Object.keys(steps.hints).length,
      nav.currentLevel,
      allFirstAttempt,
    );

    if (userId && currentAttemptId && steps.interactiveSteps.length > 0) {
      const step_log = steps.interactiveSteps.map((s) => {
        const isCorrect =
          steps.answers[s.id]?.is_correct === true || steps.structuredStepComplete[s.id] === true;
        const stepType = STEP_TYPE_MAP[s.step_number] ?? "calculation";
        const reasoningPattern = STEP_TYPE_TO_REASONING_PATTERN[stepType] ?? "Procedural";
        return {
          is_correct: isCorrect,
          reasoning_pattern: reasoningPattern,
          error_category: REASONING_TO_ERROR_CATEGORY[reasoningPattern] ?? "procedural",
        };
      });
      const correctCount = step_log.filter((e) => e.is_correct).length;
      const score = correctCount / step_log.length;
      const completePromise = apiCompleteAttempt({
        attempt_id: currentAttemptId,
        user_id: userId,
        unit_id: unitId,
        lesson_index: lessonIndex,
        score,
        step_log,
        level: nav.currentLevel,
      });
      completeAttemptPromiseRef.current = completePromise;
      completePromise
        .then((decision) => {
          if (decision.mastery) {
            if (decision.mastery.level3_unlocked) setHasCompletedLevel2(true);
            const cs = decision.mastery.category_scores;
            if (cs) {
              setBackendCategoryScores({
                conceptual: cs.conceptual ?? 0.0,
                procedural: cs.procedural ?? 0.0,
                computational: cs.computational ?? 0.0,
                representation: cs.representation ?? 0.0,
              });
            }
            setMasteryScore(overallMasteryPercent(decision.mastery.mastery_score, decision.mastery.category_scores));
          }
          if (decision.recommended_next_difficulty) {
            setRecommendedDifficulty(
              decision.recommended_next_difficulty as "easy" | "medium" | "hard",
            );
          }
          setCurrentAttemptId(null);
        })
        .catch(() => setCurrentAttemptId(null));
    } else {
      setCurrentAttemptId(null);
    }
  }, [
    checkProgression,
    completeProblemAttempt,
    nav.currentProblem,
    steps.hints,
    nav.currentLevel,
    interactiveStepIds,
    steps.interactiveSteps,
    steps.answers,
    steps.structuredStepComplete,
    persistLevel3Unlock,
    userId,
    currentAttemptId,
    unitId,
    lessonIndex,
  ]);

  const handleContinueAfterProgression = useCallback(async () => {
    if (!progressionResult || !nav.currentProblem) return;

    // Await the in-flight complete-attempt response so mastery scores are up-to-date
    // before the next problem loads, eliminating the 0% sidebar desync.
    if (completeAttemptPromiseRef.current) {
      try { await completeAttemptPromiseRef.current; } catch { /* non-blocking */ }
      completeAttemptPromiseRef.current = null;
    }

    nav.saveCurrentStateToCache();
    nav.setLevelSolved((prev) => ({ ...prev, [nav.currentLevel]: prev[nav.currentLevel] + 1 }));

    const nextExcludeIds = [...nav.completedProblemIds, nav.currentProblem.id];
    nav.setCompletedProblemIds(nextExcludeIds);
    steps.setAnswers({});
    steps.setHints({});
    steps.setHintLoading(new Set());
    steps.setStructuredStepComplete({});
    nav.setPagination(null);
    resetTracking();
    setShowProgressionModal(false);
    // When advancing 2 → 3, keep level 2 in cache so switching back shows the submitted attempt
    const advancingToLevel3 = progressionResult.should_advance && progressionResult.next_level === 3 && nav.currentLevel === 2;
    if (!advancingToLevel3) {
      delete nav.levelCacheRef.current[nav.currentLevel];
    }

    const backendDiff = recommendedDifficulty;
    setRecommendedDifficulty(null);

    if (progressionResult.should_advance && progressionResult.next_level === 3 && nav.currentLevel === 2) {
      setHasCompletedLevel2(true);
      persistLevel3Unlock();
      nav.setCurrentLevel(3);
      nav.loadNewProblem(backendDiff ?? "medium", nextExcludeIds, 3);
      toast.success("Level 3 unlocked! Here's your first challenge…");
      // Re-fetch mastery so sidebar shows latest backend category scores (in case complete response omitted them).
      if (userId) {
        apiGetMastery(userId, unitId, lessonIndex).then((state) => {
          const cs = state.category_scores;
          if (cs) {
            setBackendCategoryScores({
              conceptual: cs.conceptual ?? 0.0,
              procedural: cs.procedural ?? 0.0,
              computational: cs.computational ?? 0.0,
              representation: cs.representation ?? 0.0,
            });
          }
          setMasteryScore(overallMasteryPercent(state.mastery_score, state.category_scores));
        }).catch(() => {});
      }
    } else if (nav.currentLevel === 3) {
      onTopicComplete?.();
      if (userId) apiSetTopicStatus(userId, unitId, lessonIndex, "completed").catch(() => {});
      nav.loadNewProblem(backendDiff ?? "medium", nextExcludeIds, 3);
      toast.success("Next challenge loaded!");
    } else {
      nav.setCurrentLevel(2);
      nav.loadNewProblem(backendDiff ?? "medium", nextExcludeIds, 2);
      toast.info("New faded example loaded!");
    }
  }, [
    progressionResult,
    nav,
    steps,
    masteryScore,
    resetTracking,
    recommendedDifficulty,
    persistLevel3Unlock,
    onTopicComplete,
    userId,
    unitId,
    lessonIndex,
  ]);

  const handleStayAtLevel = useCallback(() => {
    if (!nav.currentProblem) return;
    nav.saveCurrentStateToCache();
    nav.setLevelSolved((prev) => ({ ...prev, [nav.currentLevel]: prev[nav.currentLevel] + 1 }));
    const nextExcludeIds = [...nav.completedProblemIds, nav.currentProblem.id];
    nav.setCompletedProblemIds(nextExcludeIds);
    steps.setAnswers({});
    steps.setHints({});
    steps.setHintLoading(new Set());
    steps.setStructuredStepComplete({});
    nav.setPagination(null);
    resetTracking();
    setShowProgressionModal(false);
    delete nav.levelCacheRef.current[nav.currentLevel];

    if (nav.currentLevel === 2) {
      nav.loadNewProblem("medium", nextExcludeIds, 2);
      toast.info("Great choice! Here's another Level 2 problem for extra practice.");
    } else if (nav.currentLevel === 3) {
      nav.loadNewProblem("medium", nextExcludeIds, 3);
      toast.success("Another Level 3 problem loaded!");
    }
  }, [nav, steps, masteryScore, resetTracking]);

  const handleExitTicketComplete = (result: ExitTicketResult) => {
    setExitTicketResults((prev) => [result, ...prev]);
    setShowExitTicket(false);
    if (result.readyFlag) {
      toast.success("Excellent! You're ready to progress!");
    } else {
      toast.info("Keep practicing to build mastery.");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Timed mode overlays ───────────────────────────────────────────────────

  if (showLaunchScreen && timedPracticeMinutes) {
    return (
      <TimedModeLaunchScreen
        practiceMinutes={timedPracticeMinutes}
        onDismiss={() => setShowLaunchScreen(false)}
      />
    );
  }

  if (showTransitionScreen) {
    return <TimedModeTransitionScreen onTransitionComplete={handleTimedTransitionComplete} />;
  }

  if (showExitTicket) {
    return (
      <ExitTicketMode
        problem={getRandomProblem(getDifficultyForMastery(masteryScore), nav.completedProblemIds)}
        timeLimit={180}
        onComplete={handleExitTicketComplete}
        onCancel={() => setShowExitTicket(false)}
        configId={timedExitTicketConfigId || undefined}
      />
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="bg-background">
      {/* Timed mode countdown banner */}
      {timedModeActive && timeRemaining !== null && (
        <div className="bg-primary/10 border-b border-primary/30 px-4 py-2 flex items-center justify-center gap-3">
          <Timer className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Timed Practice Mode</span>
          <Badge
            variant={timeRemaining < 60 ? "destructive" : "outline"}
            className="font-mono text-sm"
          >
            {formatTime(timeRemaining)}
          </Badge>
        </div>
      )}

      <main className="px-4 py-6 max-w-6xl mx-auto">
        {/* ── Back link — Lesson Overview */}
        <button
          onClick={() => {
            const destination = fromSimulationLab
              ? `/unit/${unitId}/${lessonIndex}/simulation`
              : `/unit/${unitId}/${lessonIndex}`;
            navigate(destination);
          }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {fromSimulationLab ? "Back to Simulation Lab" : "Back to Lesson Overview"}
        </button>

        {/* ── Title left, level tabs + actions right ───────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 shrink-0">
            <FlaskConical className="w-4 h-4 text-primary" />
            <h2 className="text-xl font-bold text-foreground">{levelConfig.title}</h2>
          </div>
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            <LevelSelector
              currentLevel={nav.currentLevel}
              onLevelChange={nav.handleLevelChange}
              isLevel3Locked={isLevel3Locked}
              masteryScore={masteryScore}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExitTicket(true)}
              className="gap-1.5"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Exit Ticket</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left column: problem card + solution steps ─────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <p className="text-sm text-muted-foreground">{levelConfig.description}</p>

            {/* ── Pagination ──────────────────────────────────────────────── */}
            {nav.pagination && !nav.problemLoading && (
              <div className="space-y-1">
                <div className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => nav.handleNavigate("prev")}
                    disabled={!nav.pagination.has_prev || nav.isNavigating}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Example {nav.pagination.current_index + 1} of {nav.pagination.total}
                    {nav.pagination.at_limit && (
                      <span className="ml-1 text-xs text-warning">· limit reached</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-1 text-muted-foreground hover:text-foreground",
                      (!nav.pagination.has_next || nav.isNavigating || nav.pagination.current_index + 1 >= nav.pagination.total) &&
                        "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => nav.handleNavigate("next")}
                    disabled={
                      !nav.pagination.has_next ||
                      nav.isNavigating ||
                      nav.pagination.current_index + 1 >= nav.pagination.total
                    }
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Problem loading (molecular loader after 500ms) ────────────── */}
            {nav.problemLoading || nav.isNavigating ? (
              <ProblemLoadingState />
            ) : !problem ? (
              <div className="text-center py-12 text-muted-foreground space-y-1">
                <p>Failed to load problem. Please refresh the page.</p>
                <p className="text-xs">If this persists, the backend may be returning 502 — check server logs.</p>
              </div>
            ) : (
              <>
                <ProblemCard problem={problem} />

                {/* ── Solution steps ────────────────────────────────────────── */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Solution Steps</h3>
                  <div className="space-y-4">
                    {displaySteps.map((step, index) => {
                      // Level 1: all steps shown as fully worked
                      if (nav.currentLevel === 1 || step.type === "given") {
                        return <GivenStep key={step.id} step={step} />;
                      }

                      // Level 3 structured equation step: drag_drop
                      if (nav.currentLevel === 3 && step.type === "drag_drop" && step.equation_parts) {
                        return (
                          <EquationBuilder
                            key={step.id}
                            step_number={step.step_number}
                            label={step.label}
                            instruction="Drag and drop to form the correct equation"
                            availableParts={step.equation_parts}
                            onValidate={(expr) => steps.handleValidateEquation(expr, step)}
                            onComplete={(correct) =>
                              steps.handleStructuredStepComplete(step.id, correct)
                            }
                            isComplete={!!steps.structuredStepComplete[step.id]}
                            showHint={!!steps.hints[step.id]}
                            hintText={steps.hints[step.id]}
                            hintLoading={steps.hintLoading.has(step.id)}
                            onRequestHint={() => steps.handleRequestHint(step.id)}
                          />
                        );
                      }

                      // Multi-value input step: variable_id (any level)
                      if (step.type === "variable_id" && step.labeled_values) {
                        return (
                          <KnownsIdentifier
                            key={step.id}
                            step_number={step.step_number}
                            label={step.label}
                            instruction={step.instruction}
                            variables={step.labeled_values}
                            onComplete={(correct) =>
                              steps.handleStructuredStepComplete(step.id, correct)
                            }
                            isComplete={!!steps.structuredStepComplete[step.id]}
                            showHint={!!steps.hints[step.id]}
                            hintText={steps.hints[step.id]}
                            hintLoading={steps.hintLoading.has(step.id)}
                            onRequestHint={() => steps.handleRequestHint(step.id)}
                          />
                        );
                      }

                      // Comparison step: pick <, >, or =
                      // Both parts must be non-empty strings; falls through to InteractiveStep otherwise.
                      if (step.type === "comparison" && step.comparison_parts?.length === 2 && step.comparison_parts[0]?.trim() && step.comparison_parts[1]?.trim()) {
                        return (
                          <ComparisonStep
                            key={step.id}
                            step_number={step.step_number}
                            label={step.label}
                            instruction={step.instruction}
                            comparisonParts={step.comparison_parts as [string, string]}
                            correctAnswer={step.correct_answer as "<" | ">" | "="}
                            onComplete={(correct) =>
                              steps.handleStructuredStepComplete(step.id, correct)
                            }
                            isComplete={!!steps.structuredStepComplete[step.id]}
                            showHint={!!steps.hints[step.id]}
                            hintText={steps.hints[step.id]}
                            hintLoading={steps.hintLoading.has(step.id)}
                            onRequestHint={() => steps.handleRequestHint(step.id)}
                          />
                        );
                      }

                      return (
                        <InteractiveStep
                          key={step.id}
                          step={step}
                          answer={steps.answers[step.id]}
                          onAnswerChange={steps.handleAnswerChange}
                          onCheckAnswer={steps.handleCheckAnswer}
                          showHint={!!steps.hints[step.id]}
                          hintText={steps.hints[step.id]}
                          hintLoading={steps.hintLoading.has(step.id)}
                          checkingAnswer={steps.checkingAnswer.has(step.id)}
                          onRequestHint={steps.handleRequestHint}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Thinking tracker */}
                {nav.currentLevel !== 1 && (
                  <ThinkingTracker
                    steps={thinkingSteps}
                    errors={classifiedErrors}
                    isAnalyzing={isAnalyzing}
                  />
                )}

                {/* ── Action buttons ────────────────────────────────────────── */}
                <div className="flex items-center gap-4 flex-wrap">
                  {nav.currentLevel === 1 ? (
                    <>
                      <Button onClick={nav.handleStartFadedExample} className="gap-2">
                        <ArrowRight className="w-4 h-4" />
                        Ready to Try? Start Faded Example
                      </Button>
                      {(!nav.pagination ||
                        !nav.pagination.at_limit ||
                        nav.pagination.has_next) && (
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={nav.handleSeeAnother}
                          disabled={nav.problemLoading || nav.isNavigating}
                        >
                          <BookOpen className="w-4 h-4" />
                          See Another Worked Example
                          {nav.pagination && (
                            <span className="text-xs opacity-70">
                              ({nav.pagination.total}/{nav.pagination.max_problems})
                            </span>
                          )}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button onClick={steps.handleReset} variant="outline" className="gap-2">
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </Button>

                      {allComplete && (
                        <Button onClick={handleCheckProgression} className="gap-2">
                          <Zap className="w-4 h-4" />
                          Continue
                        </Button>
                      )}

                      {allComplete && (
                        <div className="flex items-center gap-2 text-success fade-in">
                          <CheckCircle className="w-6 h-6" />
                          <span className="font-semibold">All steps completed!</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Right column: mastery + reference + progress ───────────────── */}
          <aside className="space-y-6">
            <MasteryBreakdown
              score={masteryScore}
              skillMap={skillMap}
              errors={classifiedErrors}
              categoryScores={backendCategoryScores ?? undefined}
              level3Unlocked={hasCompletedLevel2}
            />

            {/* Reference panel: Level 1 and 2 only, fetched once per lesson; always show area (skeleton until loaded) */}
            {nav.currentLevel !== 3 && (referenceCardLoading || referenceCard || (unitId != null && lessonIndex != null)) && (
              <ReferencePanel
                steps={
                  referenceCardLoading || !referenceCard
                    ? []
                    : referenceCard.steps.map((s, i) => ({
                        step_number: i + 1,
                        title: s.label,
                        content: s.content,
                      }))
                }
                isLoading={referenceCardLoading || !referenceCard}
                hint={referenceCard?.hint}
              />
            )}

            {nav.currentLevel !== 1 && steps.interactiveSteps.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Progress</h4>
                <div className="flex items-center gap-2">
                  {steps.interactiveSteps.map((step) => (
                    <div
                      key={step.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        steps.answers[step.id]?.is_correct || steps.structuredStepComplete[step.id]
                          ? "bg-success text-success-foreground"
                          : steps.answers[step.id]?.is_correct === false
                            ? "bg-destructive/20 text-destructive border-2 border-destructive"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {step.step_number}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {completedSteps.length} of {steps.interactiveSteps.length} steps completed
                </p>
              </div>
            )}

            {/* Session stats */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Session</h4>
              <div className="space-y-1">
                {([1, 2, 3] as Level[]).map((lvl) => {
                  const cached = nav.levelCacheRef.current[lvl];
                  const seen =
                    cached?.pagination?.total ??
                    (lvl === nav.currentLevel ? nav.pagination?.total : undefined) ??
                    0;
                  const solved = nav.levelSolved[lvl];
                  return (
                    <div
                      key={lvl}
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span
                        className={
                          lvl === nav.currentLevel ? "font-medium text-foreground" : ""
                        }
                      >
                        Level {lvl}
                        {lvl === 1 ? " (worked)" : lvl === 2 ? " (faded)" : " (practice)"}
                      </span>
                      <span>
                        {seen > 0 ? `${seen} seen` : "—"}
                        {lvl > 1 && solved > 0 ? ` · ${solved} solved` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Tools: calculator always; periodic table when lesson.required_tools includes it */}
      <ToolsWidget requiredTools={requiredTools} />


      {/* Progression Modal */}
      {showProgressionModal && progressionResult && (
        <ProgressionModal
          isOpen={showProgressionModal}
          onClose={() => setShowProgressionModal(false)}
          result={progressionResult}
          masteryScore={masteryScore}
          onContinue={handleContinueAfterProgression}
          onStayAtLevel={handleStayAtLevel}
          currentLevel={nav.currentLevel}
        />
      )}
    </div>
  );
}
