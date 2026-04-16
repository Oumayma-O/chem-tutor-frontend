import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { Level, LEVEL_CONFIGS, StudentAnswer } from "@/types/chemistry";
import { ExitTicketResult, ThinkingStep, ClassifiedError } from "@/types/cognitive";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiGetReferenceCard,
  refCardQueryKey,
  type ReferenceCardOutput,
} from "@/lib/api/problems";
import { staticQueryOptions } from "@/lib/api/queryOptions";
import {
  useProblemNavigation,
  StepSetters,
} from "@/hooks/useProblemNavigation";
import { useStepHandlers } from "@/hooks/useStepHandlers";
import { LevelSelector, ProblemCard, ProblemLoadingState } from "@/components/tutor/layout";
import {
  TutorStepRenderer,
} from "@/components/tutor/steps";
import { ReferencePanel, MasteryBreakdown, ProgressionModal, ThinkingTracker } from "@/components/tutor/progress";
import { ExitTicketMode, TimedModeLaunchScreen, TimedModeTransitionScreen } from "@/components/tutor/modes";
import { ToolsWidget } from "@/components/tutor/widgets";
import { useAdaptiveProgression } from "@/hooks/useAdaptiveProgression";
import { useCognitiveTracking } from "@/hooks/useCognitiveTracking";
import { useTutorAnswerReveal } from "@/hooks/useTutorAnswerReveal";
import { useTutorMasterySync } from "@/hooks/useTutorMasterySync";
import { useTutorProgression } from "@/hooks/useTutorProgression";
import { useTutorTimedMode } from "@/hooks/useTutorTimedMode";
import { useStudentLiveSessionTimedSync } from "@/hooks/useStudentLiveSessionTimedSync";
import { studentQueryKeys } from "@/lib/studentQueryKeys";
import { setDismissedLiveBannerAnchor } from "@/lib/studentLiveBannerDismiss";
import { loadExitTicketSubmitForUser, saveExitTicketSubmitForUser } from "@/lib/exitTicketSubmitPersistence";
import { liveSessionAnchorKey } from "@/services/api/classroomSession";
import { isStepAnswerCorrect } from "@/lib/masteryTransforms";
import { effectiveLevel2CompletedCountIncludingCurrent } from "@/lib/progressionUtils";
import { Button } from "@/components/ui/button";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

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
  lessonStatus?: "not-started" | "in-progress" | "completed";
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
 * - useTutorAnswerReveal: 3-strikes reveal + session cap + `getInteractiveReveal` for steps
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
  lessonStatus,
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
  } | null>(null);
  const [hasCompletedLevel2, setHasCompletedLevel2] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [recommendedDifficulty, setRecommendedDifficulty] = useState<
    "easy" | "medium" | "hard" | null
  >(null);
  /** Optional backend `level_2_completions` from mastery API; merged with session `levelSolved[2]`. */
  const [masteryLevel2Completions, setMasteryLevel2Completions] = useState<number | null>(null);

  const mergeLevel2CompletionsFromMastery = useCallback((n: number) => {
    setMasteryLevel2Completions((prev) => Math.max(prev ?? 0, n));
  }, []);

  // ── UI / modal state ──────────────────────────────────────────────────────
  const [exitTicketResults, setExitTicketResults] = useState<ExitTicketResult[]>([]);
  const [calculatorEnabled] = useState(true);
  /** Shown once per lesson after the student’s first answer reveal (policy notice). */
  const [revealBudgetInfoOpen, setRevealBudgetInfoOpen] = useState(false);
  const revealBudgetModalLessonKeyRef = useRef<string | null>(null);

  // Persists submitted class exit-ticket answers so re-opening shows review mode.
  const exitTicketSubmittedRef = useRef<{
    configId: string;
    answers: Record<string, string>;
    results: Record<string, boolean>;
  } | null>(null);

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
    setCheckingAnswer: (_v) => {},
    resetTracking: () => {},
    setThinkingSteps: (_v) => {},
    setClassifiedErrors: (_v) => {},
  });
  const cognitiveStateRef = useRef<{ thinkingSteps: ThinkingStep[]; classifiedErrors: ClassifiedError[] }>({
    thinkingSteps: [],
    classifiedErrors: [],
  });

  // ── Cognitive tracking ────────────────────────────────────────────────────
  const {
    thinkingSteps,
    classifiedErrors,
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

  const { profile, isStudent, user } = useAuth();
  const persistenceUserId = user?.id ?? userId ?? null;

  const timed = useTutorTimedMode();

  const { liveSession, liveSessionLoading, showExitTicketAction, sessionMatchesLesson, dismissExitTicketOverlays, prefetchedExitTicket } =
    useStudentLiveSessionTimedSync({
      isStudent: Boolean(isStudent),
      classroomId: profile?.classroom_id,
      timed,
      unitId,
      lessonIndex,
    });

  // ── Problem navigation hook ───────────────────────────────────────────────
  const nav = useProblemNavigation({
    unitId,
    lessonIndex,
    lessonName: currentTopicName,
    userId,
    interests,
    gradeLevel,
    classroomId: profile?.classroom_id,
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
    liveSessionMinLevel1ExamplesForLevel2: liveSession?.min_level1_examples_for_level2,
    lessonStatus,
  });

  const tutorAnswerReveal = useTutorAnswerReveal({
    unitId,
    lessonIndex,
    problemId: nav.currentProblem?.id,
    currentLevel: nav.currentLevel,
    navAllowAnswerReveal: nav.allowAnswerReveal,
    liveSessionAllowAnswerReveal: liveSession?.allow_answer_reveal,
    navMaxAnswerRevealsPerLesson: nav.maxAnswerRevealsPerLesson,
    liveSessionMaxAnswerRevealsPerLesson: liveSession?.max_answer_reveals_per_lesson,
  });
  const { getInteractiveReveal, totalRevealsUsed, maxAnswerRevealsPerLesson } = tutorAnswerReveal;

  useEffect(() => {
    if (totalRevealsUsed !== 1) return;
    const key = `${unitId}:${lessonIndex}`;
    if (revealBudgetModalLessonKeyRef.current === key) return;
    revealBudgetModalLessonKeyRef.current = key;
    setRevealBudgetInfoOpen(true);
  }, [totalRevealsUsed, unitId, lessonIndex]);

  // ── Reference card (fiche de cours) — React Query handles caching/dedup ──
  // The prefetch fired from UnitLandingPage may already be in-flight; useQuery
  // attaches to that same promise instead of starting a new request.
  // nav must be declared before this hook so we can read nav.currentLevel.
  const { data: referenceCard = null, isLoading: referenceCardLoading } = useQuery({
    queryKey: refCardQueryKey(unitId, lessonIndex),
    queryFn: () => apiGetReferenceCard(unitId, lessonIndex, currentTopicName),
    ...staticQueryOptions,
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
    onCheckAnswerResult: (stepId, isCorrect) => tutorAnswerReveal.recordCheckResult(stepId, isCorrect),
  });
  const queryClient = useQueryClient();
  const heartbeatStepId = useMemo(() => {
    const prob = nav.currentProblem;
    if (!prob) return `${unitId}:${lessonIndex}`;
    const pending = steps.interactiveSteps.find(
      (s) => !isStepAnswerCorrect(steps.answers, steps.structuredStepComplete, s.id),
    );
    const sid =
      pending?.id ??
      steps.interactiveSteps[steps.interactiveSteps.length - 1]?.id ??
      "done";
    return `${unitId}:${lessonIndex}:${sid}`;
  }, [
    unitId,
    lessonIndex,
    nav.currentProblem,
    steps.interactiveSteps,
    steps.answers,
    steps.structuredStepComplete,
  ]);

  usePresenceHeartbeat(
    profile?.classroom_id ?? null,
    heartbeatStepId,
    Boolean(isStudent && profile?.classroom_id),
  );

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
      setCheckingAnswer: steps.setCheckingAnswer,
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
  const isLevel2Locked = !nav.level1ExposureSatisfied;
  const prevViewedL1CountRef = useRef(0);
  const autoProgressTimeoutRef = useRef<number | null>(null);
  const autoProgressArmedProblemIdRef = useRef<string | null>(null);

  useEffect(() => {
    prevViewedL1CountRef.current = 0;
  }, [unitId, lessonIndex, currentTopicName]);

  useEffect(() => {
    const prev = prevViewedL1CountRef.current;
    const len = nav.viewedLevel1Ids.length;
    const min = nav.minLevel1ExamplesForLevel2;
    if (prev === min - 1 && len >= min && nav.currentLevel === 1) {
      toast.success("Level 2 unlocked! Open the Level 2 tab when you're ready for faded practice.");
    }
    prevViewedL1CountRef.current = len;
  }, [nav.viewedLevel1Ids, nav.currentLevel, nav.minLevel1ExamplesForLevel2]);

  const completedSteps = steps.interactiveSteps.filter((s) =>
    isStepAnswerCorrect(steps.answers, steps.structuredStepComplete, s.id),
  );
  const allComplete =
    steps.interactiveSteps.length > 0 &&
    steps.interactiveSteps.every((s) =>
      isStepAnswerCorrect(steps.answers, steps.structuredStepComplete, s.id),
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

  const { persistLevel3Unlock } = useTutorMasterySync({
    userId,
    unitId,
    lessonIndex,
    lessonCompleted,
    currentAttemptId,
    currentLevel: nav.currentLevel,
    currentProblemId: nav.currentProblem?.id,
    problemSteps: displaySteps,
    answers: steps.answers,
    hints: steps.hints,
    structuredStepComplete: steps.structuredStepComplete,
    setHasCompletedLevel2,
    setBackendCategoryScores,
    setMasteryScore,
    onMasteryLevel2Completions: mergeLevel2CompletionsFromMastery,
    consumeWasRevealedForSave: tutorAnswerReveal.consumeWasRevealedForSave,
    isStepRevealed: tutorAnswerReveal.isStepRevealed,
  });

  // ── Side effects ──────────────────────────────────────────────────────────
  // Start step timer when interactive steps become available
  useEffect(() => {
    steps.interactiveSteps.forEach((step) => {
      if (!steps.answers[step.id]) {
        startStepTimer(step.id);
      }
    });
  }, [steps.interactiveSteps, steps.answers, startStepTimer]);

  const {
    showProgressionModal,
    setShowProgressionModal,
    progressionResult,
    handleCheckProgression,
    handleContinueAfterProgression,
    handleAutoProgression,
    handleStayAtLevel,
    handleLevel1SeeAnother,
    handleLevel1StartFadedExample,
  } = useTutorProgression({
    userId,
    unitId,
    lessonIndex,
    currentAttemptId,
    setCurrentAttemptId,
    recommendedDifficulty,
    setRecommendedDifficulty,
    onTopicComplete,
    setHasCompletedLevel2,
    setBackendCategoryScores,
    setMasteryScore,
    persistLevel3Unlock,
    onMasteryLevel2Completions: mergeLevel2CompletionsFromMastery,
    checkProgression,
    completeProblemAttempt,
    interactiveStepIds,
    steps: {
      hints: steps.hints,
      answers: steps.answers,
      problemSteps: displaySteps,
      structuredStepComplete: steps.structuredStepComplete,
      isStepRevealed: tutorAnswerReveal.isStepRevealed,
    },
    nav: {
      currentProblem: nav.currentProblem ? { id: nav.currentProblem.id } : null,
      currentLevel: nav.currentLevel,
      currentDifficulty: nav.currentDifficulty,
      completedProblemIds: nav.completedProblemIds,
      setCompletedProblemIds: nav.setCompletedProblemIds,
      saveCurrentStateToCache: nav.saveCurrentStateToCache,
      setLevelSolved: nav.setLevelSolved,
      resetProblemState: nav.resetProblemState,
      levelCacheRef: nav.levelCacheRef,
      setCurrentLevel: nav.setCurrentLevel,
      loadNewProblem: nav.loadNewProblem,
      hydrateOrGenerateForLevel: nav.hydrateOrGenerateForLevel,
      handleSeeAnother: nav.handleSeeAnother,
      handleStartFadedExample: nav.handleStartFadedExample,
      canAccessLevel2: nav.level1ExposureSatisfied,
    },
  });

  // Auto-submit on final-step completion (L2/L3 only), then continue progression automatically.
  useEffect(() => {
    if (autoProgressTimeoutRef.current != null) {
      window.clearTimeout(autoProgressTimeoutRef.current);
      autoProgressTimeoutRef.current = null;
    }
    const problemId = nav.currentProblem?.id ?? null;
    if (!problemId || nav.currentLevel === 1 || !allComplete) {
      // Re-arm on any incomplete state so reset/retry of the same problem id can auto-submit again.
      autoProgressArmedProblemIdRef.current = null;
      return;
    }
    if (autoProgressArmedProblemIdRef.current === problemId) return;

    autoProgressArmedProblemIdRef.current = problemId;
    autoProgressTimeoutRef.current = window.setTimeout(() => {
      void handleAutoProgression();
    }, 1500);

    return () => {
      if (autoProgressTimeoutRef.current != null) {
        window.clearTimeout(autoProgressTimeoutRef.current);
        autoProgressTimeoutRef.current = null;
      }
    };
  }, [allComplete, nav.currentLevel, nav.currentProblem?.id, handleAutoProgression]);

  useEffect(() => {
    setMasteryLevel2Completions(null);
  }, [unitId, lessonIndex]);

  const level2CompletedCountForModal = useMemo(() => {
    if (nav.currentLevel !== 2) return undefined;
    return effectiveLevel2CompletedCountIncludingCurrent({
      levelSolvedAtLevel2: nav.levelSolved[2],
      masteryLevel2Completions,
    });
  }, [nav.currentLevel, nav.levelSolved[2], masteryLevel2Completions]);

  /** Records exit-ticket outcome; overlay stays open until the user dismisses the results dialog (ExitTicketMode calls onCancel). */
  const handleExitTicketComplete = (result: ExitTicketResult) => {
    setExitTicketResults((prev) => [result, ...prev]);
    if (result.readyFlag) {
      toast.success("Excellent! You're ready to progress!");
    } else {
      toast.info("Keep practicing to build mastery.");
    }
  };

  /** Timed hook id can lag or clear while live-session still carries `active_exit_ticket_id` — coalesce for UI + persistence. */
  const resolvedExitTicketId =
    timed.timedExitTicketConfigId ?? liveSession?.active_exit_ticket_id ?? null;
  const submittedForActiveTicket =
    resolvedExitTicketId != null &&
    (exitTicketSubmittedRef.current?.configId === resolvedExitTicketId ||
      loadExitTicketSubmitForUser(resolvedExitTicketId, persistenceUserId) != null);

  useEffect(() => {
    const tid = liveSession?.active_exit_ticket_id ?? timed.timedExitTicketConfigId ?? null;
    if (!tid) return;
    const persisted = loadExitTicketSubmitForUser(tid, persistenceUserId);
    if (!persisted) return;
    if (exitTicketSubmittedRef.current?.configId === tid) return;
    exitTicketSubmittedRef.current = {
      configId: tid,
      answers: persisted.answers,
      results: persisted.results,
    };
  }, [liveSession?.active_exit_ticket_id, timed.timedExitTicketConfigId, persistenceUserId]);

  // ── Timed mode overlays ───────────────────────────────────────────────────

  if (timed.showLaunchScreen && timed.timedPracticeMinutes && !liveSessionLoading) {
    return (
      <TimedModeLaunchScreen
        practiceMinutes={timed.timedPracticeMinutes}
        onDismiss={() => timed.setShowLaunchScreen(false)}
      />
    );
  }

  if (timed.showTransitionScreen) {
    return <TimedModeTransitionScreen onTransitionComplete={timed.handleTimedTransitionComplete} />;
  }

  if (timed.showExitTicket) {
    const configId = resolvedExitTicketId ?? undefined;
    const persisted = configId != null ? loadExitTicketSubmitForUser(configId, persistenceUserId) : null;
    const fromRef =
      configId != null && exitTicketSubmittedRef.current?.configId === configId
        ? exitTicketSubmittedRef.current
        : null;
    const initialAnswers = submittedForActiveTicket ? (fromRef?.answers ?? persisted?.answers) : undefined;
    const initialResults = submittedForActiveTicket ? (fromRef?.results ?? persisted?.results) : undefined;
    return (
      <ExitTicketMode
        problem={nav.currentProblem ?? undefined}
        timeLimit={180}
        onComplete={handleExitTicketComplete}
        onCancel={dismissExitTicketOverlays}
        configId={configId}
        classId={profile?.classroom_id ?? undefined}
        prefetchedTicket={prefetchedExitTicket}
        initialReviewMode={submittedForActiveTicket}
        initialAnswers={initialAnswers}
        initialResults={initialResults}
        onSubmitted={(data) => {
          const id = data.configId ?? configId;
          if (id) {
            exitTicketSubmittedRef.current = { configId: id, answers: data.answers, results: data.results };
            saveExitTicketSubmitForUser(
              id,
              { answers: data.answers, results: data.results },
              persistenceUserId,
            );
          }
          if (profile?.classroom_id) {
            void queryClient.invalidateQueries({ queryKey: studentQueryKeys.liveSession(profile.classroom_id) });
          }
          if (liveSession) {
            setDismissedLiveBannerAnchor(liveSessionAnchorKey(liveSession));
          }
        }}
      />
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="bg-background">
      <AlertDialog open={revealBudgetInfoOpen} onOpenChange={setRevealBudgetInfoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Answer reveal limit</AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2">
              <span className="block">
                You can use “Reveal answer” up to{" "}
                <span className="font-medium text-foreground">{maxAnswerRevealsPerLesson}</span> times
                per lesson (this limit resets when you open a different lesson). Each reveal counts when
                you reach three incorrect checks on a step.
              </span>
              <span className="block text-muted-foreground">
                You have used 1 of {maxAnswerRevealsPerLesson} reveals in this lesson —{" "}
                <span className="font-medium text-foreground">
                  {Math.max(0, maxAnswerRevealsPerLesson - 1)} remaining
                </span>
                .
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction type="button">OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Timed mode countdown banner */}
      {timed.timedModeActive && timed.timeRemaining !== null && (
        <div className="bg-primary/10 border-b border-primary/30 px-4 py-2 flex items-center justify-center gap-3">
          <Timer className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Timed Practice Mode</span>
          <Badge
            variant={timed.timeRemaining < 60 ? "destructive" : "outline"}
            className="font-mono text-sm"
          >
            {timed.formatTime(timed.timeRemaining)}
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
              isLevel2Locked={isLevel2Locked}
              minLevel1ExamplesForLevel2={nav.minLevel1ExamplesForLevel2}
              isLevel3Locked={isLevel3Locked}
              masteryScore={masteryScore}
            />
            {(showExitTicketAction || (submittedForActiveTicket && sessionMatchesLesson)) && (
              <Button
                variant={
                  submittedForActiveTicket
                    ? "outline"
                    : liveSession?.session_phase === "exit_ticket"
                      ? "default"
                      : "outline"
                }
                size="sm"
                onClick={() => {
                  if (resolvedExitTicketId && !timed.timedExitTicketConfigId) {
                    timed.setTimedExitTicketConfigId(resolvedExitTicketId);
                  }
                  timed.setShowExitTicket(true);
                }}
                disabled={false}
                className={cn(
                  "gap-1.5",
                  submittedForActiveTicket && "border-border bg-background text-foreground shadow-sm",
                  liveSession?.session_phase === "exit_ticket" &&
                    !submittedForActiveTicket &&
                    "ring-2 ring-primary/60 shadow-sm",
                )}
              >
                <ClipboardCheck className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {submittedForActiveTicket ? "Review exit ticket" : "Exit Ticket"}
                </span>
              </Button>
            )}
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
                    {nav.currentLevel === 1 && nav.isBackgroundGenerating ? (
                      <span className="ml-1 text-xs text-primary animate-pulse">· generating next…</span>
                    ) : nav.pagination.at_limit ? (
                      <span className="ml-1 text-xs text-warning">· limit reached</span>
                    ) : null}
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
                {nav.currentLevel === 1 && (
                  <p className="text-xs text-muted-foreground text-center px-2">
                    Worked examples viewed: {nav.viewedLevel1Ids.length}/{nav.minLevel1ExamplesForLevel2}
                    {nav.viewedLevel1Ids.length < nav.minLevel1ExamplesForLevel2
                      ? ` — view ${nav.minLevel1ExamplesForLevel2 - nav.viewedLevel1Ids.length} more to unlock Level 2.`
                      : " — Level 2 is unlocked."}
                  </p>
                )}
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
                  <div className="space-y-4" key={`${problem.id}-${nav.stepRemountKey}`}>
                    <TutorStepRenderer
                      problemId={problem.id}
                      displaySteps={displaySteps}
                      answers={steps.answers}
                      hints={steps.hints}
                      structuredStepComplete={steps.structuredStepComplete}
                      hintLoading={steps.hintLoading}
                      checkingAnswer={steps.checkingAnswer}
                      clearStaleHintForStep={steps.clearStaleHintForStep}
                      validateMultiInputStep={steps.validateMultiInputStep}
                      handleValidateEquation={steps.handleValidateEquation}
                      handleStructuredStepComplete={steps.handleStructuredStepComplete}
                      handleRequestHint={steps.handleRequestHint}
                      handleAnswerChange={steps.handleAnswerChange}
                      handleCheckAnswer={(stepOrId) =>
                        steps.handleCheckAnswer(
                          typeof stepOrId === "string" ? stepOrId : stepOrId.id,
                        )
                      }
                      getInteractiveReveal={getInteractiveReveal}
                    />
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
                      <Button onClick={() => { void handleLevel1StartFadedExample(); }} className="gap-2">
                        <ArrowRight className="w-4 h-4" />
                        Ready to Try? Start Faded Example
                      </Button>
                      {(!nav.pagination ||
                        !nav.pagination.at_limit ||
                        nav.pagination.has_next) && (
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => { void handleLevel1SeeAnother(); }}
                          disabled={nav.problemLoading || nav.isNavigating || nav.isBackgroundGenerating}
                        >
                          <BookOpen className={cn("w-4 h-4", nav.isBackgroundGenerating && "animate-spin")} />
                          {nav.isBackgroundGenerating ? "Generating…" : "See Another Worked Example"}
                          {nav.pagination && !nav.isBackgroundGenerating && (
                            <span className="text-xs opacity-70">
                              ({nav.pagination.total}/{nav.pagination.max_problems})
                            </span>
                          )}
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button onClick={nav.handleResetProblem} variant="outline" className="gap-2">
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </Button>

                      {allComplete && (
                        <Button
                          onClick={() => {
                            if (autoProgressTimeoutRef.current != null) {
                              window.clearTimeout(autoProgressTimeoutRef.current);
                              autoProgressTimeoutRef.current = null;
                            }
                            handleCheckProgression();
                          }}
                          className="gap-2"
                        >
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
          level2CompletedCount={level2CompletedCountForModal}
        />
      )}
    </div>
  );
}
