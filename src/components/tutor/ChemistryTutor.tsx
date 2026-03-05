import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Level, LEVEL_CONFIGS, StudentAnswer, ProgressionResult } from "@/types/chemistry";
import { ExitTicketResult } from "@/types/cognitive";
import { referenceSteps, getRandomProblem, getDifficultyForMastery } from "@/data/sampleProblems";
import {
  apiGetMastery,
  apiUnlockLevel3,
  apiSetTopicStatus,
  apiCompleteAttempt,
} from "@/lib/api";
import { apiGetReferenceCard, type ReferenceCardOutput } from "@/lib/api/problems";
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
import { ReferencePanel } from "./ReferencePanel";
import { MasteryBreakdown } from "./MasteryBreakdown";
import { ProgressionModal } from "./ProgressionModal";
import { ThinkingTracker } from "./ThinkingTracker";
import { ExitTicketMode } from "./ExitTicketMode";
import { TimedModeLaunchScreen } from "./TimedModeLaunchScreen";
import { TimedModeTransitionScreen } from "./TimedModeTransitionScreen";
import { Calculator } from "./Calculator";
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

/** Map step type to backend reasoningPattern for mastery step_log. */
const STEP_TYPE_TO_REASONING_PATTERN: Record<string, string> = {
  formula_selection: "Conceptual",
  variable_identification: "Conceptual",
  substitution: "Procedural",
  calculation: "Arithmetic",
  units_handling: "Units",
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
  topicCompleted?: boolean;
  interests?: string[];
  gradeLevel?: string | null;
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
  topicCompleted = false,
  interests = [],
  gradeLevel = null,
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

  // ── Reference card (fiche de cours) — fetched once per topic ─────────────
  const [referenceCard, setReferenceCard] = useState<ReferenceCardOutput | null>(null);

  // ── Timed mode state ──────────────────────────────────────────────────────
  const [timedModeActive, setTimedModeActive] = useState(false);
  const [timedPracticeMinutes, setTimedPracticeMinutes] = useState<number | null>(null);
  const [timedStartedAt, setTimedStartedAt] = useState<string | null>(null);
  const [showLaunchScreen, setShowLaunchScreen] = useState(false);
  const [showTransitionScreen, setShowTransitionScreen] = useState(false);
  const [timedExitTicketConfigId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  const navigate = useNavigate();

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
  });

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
    stepSettersRef,
    onMarkInProgress,
    onAttemptStart: setCurrentAttemptId,
    onRestoreMasteryScore: (s) => setMasteryScore(s),
    onRestoreHasCompletedLevel2: () => setHasCompletedLevel2(true),
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
    setMasteryScore,
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
    stepSettersRef.current = {
      setAnswers: steps.setAnswers,
      setHints: steps.setHints,
      setHintLoading: steps.setHintLoading,
      setStructuredStepComplete: steps.setStructuredStepComplete,
      resetTracking,
    };
  }); // no deps — runs every render

  // ── Derived values ────────────────────────────────────────────────────────
  const problem = nav.currentProblem;
  const displaySteps = useMemo(() => (problem ? problem.steps : []), [problem]);
  const interactiveStepIds = steps.interactiveSteps.map((s) => s.id);
  const isLevel3Locked = !hasCompletedLevel2;

  const completedSteps = steps.interactiveSteps.filter(
    (s) => steps.answers[s.id]?.isCorrect === true || steps.structuredStepComplete[s.id],
  );
  const allComplete =
    steps.interactiveSteps.length > 0 &&
    steps.interactiveSteps.every(
      (s) => steps.answers[s.id]?.isCorrect === true || steps.structuredStepComplete[s.id],
    );

  const levelConfig = LEVEL_CONFIGS.find((c) => c.level === nav.currentLevel)!;

  // ── Adaptive progression ──────────────────────────────────────────────────
  const { checkProgression } = useAdaptiveProgression({
    currentLevel: nav.currentLevel,
    masteryScore,
    answers: steps.answers,
    interactiveStepIds,
  });

  // ── Side effects ──────────────────────────────────────────────────────────

  // Fetch mastery from backend on load
  useEffect(() => {
    if (!userId) return;
    apiGetMastery(userId, unitId, lessonIndex)
      .then((state) => {
        setHasCompletedLevel2((prev) => prev || !!state.level3_unlocked);
        const rawScore = state.mastery_score ?? 0;
        const attempts = state.attempts_count ?? 0;
        // Backend often defaults to 0.5 for new users — treat as 0 so new accounts start at 0%
        const isDefaultEmpty = rawScore <= 0.5 && attempts === 0;
        const apiScore = isDefaultEmpty ? 0 : Math.round(rawScore * 100);
        setMasteryScore((prev) => (isDefaultEmpty ? 0 : apiScore > 0 ? apiScore : prev));
        const cs = state.category_scores;
        // Only use category_scores when they're not the default 0.5-everywhere (new user)
        const allDefaultHalf = cs && Object.values(cs).every((v) => typeof v === "number" && v === 0.5);
        if (cs && !allDefaultHalf) {
          setBackendCategoryScores({
            conceptual: cs.conceptual ?? 0.0,
            procedural: cs.procedural ?? 0.0,
            computational: cs.computational ?? 0.0,
            representation: cs.representation ?? 0.0,
          });
        } else if (allDefaultHalf || isDefaultEmpty) {
          setBackendCategoryScores(null);
        }
      })
      .catch(() => {});

  }, [userId, unitId, lessonIndex]);

  // Level 3 unlock from parent's lesson completion (avoids duplicate progress API)
  useEffect(() => {
    if (topicCompleted) setHasCompletedLevel2((prev) => prev || true);
  }, [topicCompleted]);

  // Fetch reference card once per topic (topic-level cache — backend persists it)
  useEffect(() => {
    setReferenceCard(null);
    apiGetReferenceCard(unitId, lessonIndex, currentTopicName).then((card) => {
      if (card) setReferenceCard(card);
    });
  }, [unitId, lessonIndex, currentTopicName]);

  // Start step timer when interactive steps become available
  useEffect(() => {
    steps.interactiveSteps.forEach((step) => {
      if (!steps.answers[step.id]) {
        startStepTimer(step.id);
      }
    });
  }, [steps.interactiveSteps, steps.answers, startStepTimer]);

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

    if (result.shouldAdvance && result.nextLevel === 3 && nav.currentLevel === 2) {
      setHasCompletedLevel2(true);
      persistLevel3Unlock();
    }

    const allFirstAttempt = interactiveStepIds.every(
      (id) => steps.answers[id]?.firstAttemptCorrect === true,
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
          steps.answers[s.id]?.isCorrect === true || steps.structuredStepComplete[s.id] === true;
        const stepType = STEP_TYPE_MAP[s.stepNumber] ?? "calculation";
        const reasoningPattern = STEP_TYPE_TO_REASONING_PATTERN[stepType] ?? "Procedural";
        return { isCorrect, reasoningPattern };
      });
      const correctCount = step_log.filter((e) => e.isCorrect).length;
      const score = correctCount / step_log.length;
      apiCompleteAttempt({
        attempt_id: currentAttemptId,
        user_id: userId,
        unit_id: unitId,
        lesson_index: lessonIndex,
        score,
        step_log,
        level: nav.currentLevel,
      })
        .then((decision) => {
          if (decision.mastery) {
            const ms = decision.mastery.mastery_score;
            setMasteryScore(typeof ms === "number" ? Math.round(ms * 100) : 0);
            if (decision.mastery.level3_unlocked) setHasCompletedLevel2(true);
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

  const handleContinueAfterProgression = useCallback(() => {
    if (!progressionResult || !nav.currentProblem) return;

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

    const backendDiff = recommendedDifficulty;
    setRecommendedDifficulty(null);

    if (progressionResult.shouldAdvance && progressionResult.nextLevel === 3 && nav.currentLevel === 2) {
      setHasCompletedLevel2(true);
      persistLevel3Unlock();
      nav.setCurrentLevel(3);
      const difficulty = backendDiff ?? getDifficultyForMastery(masteryScore);
      nav.loadNewProblem(difficulty, nextExcludeIds, 3);
      toast.success(`Level 3 unlocked! Loading ${difficulty} difficulty problem…`);
    } else if (nav.currentLevel === 3) {
      onTopicComplete?.();
      if (userId) apiSetTopicStatus(userId, unitId, lessonIndex, "completed").catch(() => {});
      const difficulty = backendDiff ?? getDifficultyForMastery(masteryScore);
      nav.loadNewProblem(difficulty, nextExcludeIds, 3);
      toast.success(`Next problem: ${difficulty} difficulty!`);
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
      const difficulty = getDifficultyForMastery(masteryScore);
      nav.loadNewProblem(difficulty, nextExcludeIds, 3);
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
        {/* ── Controls bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            {nav.currentLevel === 1 ? (
              <h2 className="text-xl font-bold text-foreground">Fully Worked Example</h2>
            ) : (
              <span className="text-sm font-semibold text-foreground">{levelConfig.title}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
              <div className="text-center py-12 text-muted-foreground">
                <p>Failed to load problem. Please refresh the page.</p>
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
                        const displayStep =
                          !step.content && step.correctAnswer
                            ? { ...step, content: step.correctAnswer }
                            : step;
                        return <GivenStep key={step.id} step={displayStep} />;
                      }

                      // Level 3 Step 1: EquationBuilder
                      if (nav.currentLevel === 3 && index === 0 && step.equationParts) {
                        return (
                          <EquationBuilder
                            key={step.id}
                            stepNumber={step.stepNumber}
                            label={step.label}
                            instruction="Drag and drop to form the correct equation"
                            availableParts={step.equationParts}
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

                      // Level 3 Step 2: KnownsIdentifier
                      if (nav.currentLevel === 3 && index === 1 && step.knownVariables) {
                        return (
                          <KnownsIdentifier
                            key={step.id}
                            stepNumber={step.stepNumber}
                            label={step.label}
                            instruction="Identify the known variables with their values and units"
                            variables={step.knownVariables}
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
                {nav.currentLevel !== 1 && thinkingSteps.length > 0 && (
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
                          disabled={
                            nav.problemLoading ||
                            nav.isNavigating ||
                            (!!nav.pagination &&
                              nav.pagination.at_limit &&
                              !nav.pagination.has_next)
                          }
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

            {/* Reference panel: Level 2 only (hidden in Level 3) */}
            {nav.currentLevel === 2 && (
              <ReferencePanel
                steps={
                  referenceCard
                    ? referenceCard.steps.map((s, i) => ({
                        stepNumber: i + 1,
                        title: s.label,
                        content: s.content,
                      }))
                    : (nav.dynamicReferenceSteps ?? referenceSteps)
                }
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
                        steps.answers[step.id]?.isCorrect || steps.structuredStepComplete[step.id]
                          ? "bg-success text-success-foreground"
                          : steps.answers[step.id]?.isCorrect === false
                            ? "bg-destructive/20 text-destructive border-2 border-destructive"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {step.stepNumber}
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

      {/* Calculator */}
      <Calculator enabled={calculatorEnabled} />

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
