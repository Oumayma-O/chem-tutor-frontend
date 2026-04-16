import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Problem, StudentAnswer, type SolutionStep } from "@/types/chemistry";
import { ExitTicketResult } from "@/types/cognitive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getExitTicketForStudent,
  submitExitTicketAttempt,
  type ExitTicketConfig,
} from "@/services/api/teacher";
import { mapExitTicketConfigToUiQuestions, type UiExitTicketQuestion } from "@/lib/exitTicketMap";
import {
  buildClassExitTicketResult,
  buildProblemExitTicketResult,
  gradeClassQuestions,
} from "@/lib/exitTicketAssessment";
import { ExitTicketResultsDialog } from "./ExitTicketResultsDialog";
import { ClassExitTicketQuestions } from "./ClassExitTicketQuestions";
import { ProblemExitTicketAssessment } from "./ProblemExitTicketAssessment";

interface ExitTicketModeProps {
  problem?: Problem;
  timeLimit?: number;
  onComplete: (result: ExitTicketResult) => void;
  onCancel: () => void;
  classId?: string;
  configId?: string;
  /** From GET /classrooms/me/live-session when the API embeds the full ticket (avoids a separate fetch). */
  prefetchedTicket?: ExitTicketConfig | null;
  /** When true the overlay opens directly in read-only review mode (already-submitted answers). */
  initialReviewMode?: boolean;
  /** Pre-populated answers for review mode (keyed by question id). */
  initialAnswers?: Record<string, string>;
  /** Pre-graded per-question results for review mode. */
  initialResults?: Record<string, boolean>;
  /** Called after the student submits so the parent can persist answers for later review. */
  onSubmitted?: (data: {
    answers: Record<string, string>;
    results: Record<string, boolean>;
    configId?: string;
  }) => void;
}

export function ExitTicketMode({
  problem,
  timeLimit: propTimeLimit,
  onComplete,
  onCancel,
  classId: _classId,
  configId,
  prefetchedTicket,
  initialReviewMode = false,
  initialAnswers,
  initialResults,
  onSubmitted,
}: ExitTicketModeProps) {
  /** Use prefetched ticket even when `configId` is not yet set (live-session race). */
  const embedded =
    prefetchedTicket && (!configId || prefetchedTicket.id === configId) ? prefetchedTicket : null;

  const fetchTicketId = configId ?? prefetchedTicket?.id;

  const {
    data: fetchedTicket,
    isLoading: ticketLoading,
    isError: ticketError,
  } = useQuery({
    queryKey: ["student", "exit-ticket", fetchTicketId],
    queryFn: () => getExitTicketForStudent(fetchTicketId!),
    enabled: Boolean(fetchTicketId && !embedded),
    // Keep cached ticket alive so review mode works after submission / session end
    // without an extra network round-trip.
    staleTime: 30 * 60 * 1000,
  });

  const ticket = embedded ?? fetchedTicket ?? null;

  const classQuestions: UiExitTicketQuestion[] = useMemo(
    () => (ticket ? mapExitTicketConfigToUiQuestions(ticket) : []),
    [ticket],
  );

  const derivedLimitSec = useMemo(() => {
    if (ticket?.time_limit_minutes != null) return Math.max(60, ticket.time_limit_minutes * 60);
    return propTimeLimit ?? 600;
  }, [ticket?.time_limit_minutes, propTimeLimit]);

  const [timeLimit, setTimeLimit] = useState(derivedLimitSec);
  const [timeRemaining, setTimeRemaining] = useState(derivedLimitSec);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(initialReviewMode);
  const [showResults, setShowResults] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(initialReviewMode);
  const [classAnswers, setClassAnswers] = useState<Record<string, string>>(initialAnswers ?? {});
  const [classResults, setClassResults] = useState<Record<string, boolean>>(initialResults ?? {});
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  /** Why the assessment closed — drives dialog copy (submit vs cancel vs time). */
  const [assessmentEndReason, setAssessmentEndReason] = useState<"submit" | "cancel" | "time" | null>(
    initialReviewMode ? "submit" : null,
  );
  const submittedRef = useRef(initialReviewMode);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    setTimeLimit(derivedLimitSec);
    setTimeRemaining(derivedLimitSec);
  }, [derivedLimitSec]);

  /** Class exit ticket = we successfully mapped questions from the ticket (do not require `configId` — it can lag behind prefetched ticket). */
  const hasClassQuestions = classQuestions.length > 0;
  const loading = Boolean(fetchTicketId && !ticket && ticketLoading);

  const steps: Array<SolutionStep & { type: "interactive" }> =
    problem?.steps.map((step) => ({ ...step, type: "interactive" as const })) ?? [];

  const calculateResult = useCallback((): ExitTicketResult => {
    return buildProblemExitTicketResult({
      problemId: problem?.id,
      answers,
      steps,
      timeLimitSec: timeLimit,
      timeRemainingSec: timeRemaining,
    });
  }, [answers, steps, timeLimit, timeRemaining, problem?.id]);

  const finalizeClassAssessment = useCallback(
    async (endReason: "submit" | "cancel" | "time") => {
      if (submittedRef.current || isSubmitting) return;

      const submitId = configId ?? ticket?.id;
      if (!submitId) {
        toast.error("Could not submit — missing exit ticket id.");
        return;
      }

      setIsSubmitting(true);
      try {
        const graded = await gradeClassQuestions(classQuestions, classAnswers);
        const timeSpentS = Math.round((Date.now() - startedAtRef.current) / 1000);
        await submitExitTicketAttempt(submitId, {
          answers: classAnswers,
          time_spent_s: timeSpentS,
        });
        submittedRef.current = true;
        setClassResults(graded.perQuestion);
        setAssessmentEndReason(endReason);
        setIsComplete(true);
        setShowResults(true);
        if (endReason === "time") {
          toast.info("Time's up! Your answers have been automatically submitted.");
        } else if (endReason === "cancel") {
          toast.info("Your answers have been submitted.");
        }
        onSubmitted?.({
          answers: classAnswers,
          results: graded.perQuestion,
          configId: submitId ?? undefined,
        });
        onComplete(
          buildClassExitTicketResult({
            configId: submitId ?? configId,
            correctCount: graded.correctCount,
            total: graded.total,
            timeLimitSec: timeLimit,
            timeRemainingSec: timeRemaining,
          }),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not submit your exit ticket.";
        toast.error(`${msg} Your teacher may not see this attempt until it succeeds.`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, classQuestions, classAnswers, configId, ticket, timeLimit, timeRemaining, onComplete, onSubmitted],
  );

  const handleSubmitClass = useCallback(async () => {
    await finalizeClassAssessment("submit");
  }, [finalizeClassAssessment]);

  const handleTimeUp = useCallback(() => {
    if (hasClassQuestions) {
      void finalizeClassAssessment("time");
      return;
    }
    if (!hasClassQuestions && problem && steps.length > 0) {
      setAssessmentEndReason("time");
      setIsComplete(true);
      setShowResults(true);
      onComplete(calculateResult());
      return;
    }
    setAssessmentEndReason("time");
    setIsComplete(true);
    setShowResults(true);
  }, [
    hasClassQuestions,
    classQuestions.length,
    finalizeClassAssessment,
    problem,
    steps.length,
    onComplete,
    calculateResult,
  ]);

  // Keep a stable ref so the setInterval callback always reads the latest handleTimeUp
  // (avoids the stale-closure bug where classAnswers/hasClassQuestions freeze at initial values).
  const handleTimeUpRef = useRef(handleTimeUp);
  useEffect(() => {
    handleTimeUpRef.current = handleTimeUp;
  }, [handleTimeUp]);

  useEffect(() => {
    if (isComplete || loading) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isComplete, loading]);

  const handleClassAnswer = (questionId: string, answer: string) => {
    setClassAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleAnswerChange = (stepId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [stepId]: { step_id: stepId, answer, is_correct: undefined, attempts: prev[stepId]?.attempts || 0 },
    }));
  };

  const handleCheckAnswer = (stepId: string) => {
    const step = problem?.steps.find((s) => s.id === stepId);
    if (!step?.correct_answer) return;
    const currentAnswer = answers[stepId];
    const isCorrect = currentAnswer?.answer.trim().toLowerCase() === step.correct_answer.toLowerCase();
    setAnswers((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], is_correct: isCorrect, attempts: (prev[stepId]?.attempts || 0) + 1 },
    }));
    const allAnswered = steps.every((s) => {
      const ans = stepId === s.id ? { ...answers[stepId], is_correct: isCorrect } : answers[s.id];
      return ans?.is_correct !== undefined;
    });
    if (allAnswered) {
      setAssessmentEndReason("submit");
      setIsComplete(true);
      setTimeout(() => setShowResults(true), 500);
    }
  };

  /** Cancel: grade whatever was answered (blanks count wrong), record result, then user continues back to tutor. */
  const handleCancelWithEvaluation = useCallback(async () => {
    if (loading) {
      onCancel();
      return;
    }
    if (hasClassQuestions) {
      await finalizeClassAssessment("cancel");
      return;
    }
    if (!hasClassQuestions && problem && steps.length > 0) {
      setAssessmentEndReason("cancel");
      setIsComplete(true);
      setShowResults(true);
      onComplete(calculateResult());
      return;
    }
    onCancel();
  }, [
    loading,
    hasClassQuestions,
    classQuestions.length,
    finalizeClassAssessment,
    problem,
    steps.length,
    onCancel,
    onComplete,
    calculateResult,
  ]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const timePercentage = timeLimit > 0 ? (timeRemaining / timeLimit) * 100 : 0;
  const isLowTime = timeRemaining <= 30;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading exit ticket…</p>
        </div>
      </div>
    );
  }

  if (fetchTicketId && !ticket && ticketError && !ticketLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
        <div className="max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Could not load this exit ticket. The API should expose the ticket via{" "}
            <code className="rounded bg-muted px-1 text-xs">GET /student/exit-tickets/{"{id}"}</code> (or{" "}
            <code className="rounded bg-muted px-1 text-xs">GET /exit-tickets/{"{id}"}</code>), or embed{" "}
            <code className="rounded bg-muted px-1 text-xs">exit_ticket</code> on{" "}
            <code className="rounded bg-muted px-1 text-xs">GET /classrooms/me/live-session</code>. Confirm you are
            enrolled in the class.
          </p>
          <Button onClick={onCancel}>Close</Button>
        </div>
      </div>
    );
  }

  if (ticket && classQuestions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
        <div className="max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">This exit ticket has no questions.</p>
          <Button onClick={onCancel}>Close</Button>
        </div>
      </div>
    );
  }

  if (!hasClassQuestions && !problem) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
        <div className="max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No practice problem is loaded. Return to the tutor, wait for a problem to appear, then open the exit
            ticket again.
          </p>
          <Button onClick={onCancel}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className={cn("h-5 w-5", isReviewMode ? "text-muted-foreground" : isLowTime ? "animate-pulse text-destructive" : "text-primary")} />
              <h2 className="text-lg font-bold text-foreground">
                {isReviewMode ? "Review: Exit Ticket" : "Exit Ticket Assessment"}
              </h2>
              {isReviewMode && classQuestions.length > 0 && (
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-2",
                    Object.values(classResults).filter(Boolean).length === classQuestions.length
                      ? "border-green-500 text-green-700 dark:text-green-400"
                      : "border-yellow-500 text-yellow-700 dark:text-yellow-400",
                  )}
                >
                  {Object.values(classResults).filter(Boolean).length}/{classQuestions.length} correct
                </Badge>
              )}
            </div>
            {isReviewMode ? (
              <Button variant="outline" size="sm" onClick={onCancel}>
                Finish Review
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => void handleCancelWithEvaluation()}>
                Cancel
              </Button>
            )}
          </div>
          {!isReviewMode && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Progress value={timePercentage} className={cn("h-2", isLowTime && "[&>div]:bg-destructive")} />
                </div>
                <span
                  className={cn("font-mono text-lg font-bold", isLowTime ? "text-destructive" : "text-foreground")}
                >
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {hasClassQuestions
                  ? "Complete all questions. Class assessment — no hints."
                  : "Complete this problem without hints. Your performance determines readiness."}
              </p>
            </>
          )}
          {isReviewMode && (
            <p className="mt-2 text-xs text-muted-foreground">
              Review your answers below. Correct answers are highlighted in green.
            </p>
          )}
        </div>

        {hasClassQuestions ? (
          <ClassExitTicketQuestions
            questions={classQuestions}
            classAnswers={classAnswers}
            classResults={classResults}
            isComplete={isComplete}
            isSubmitting={isSubmitting}
            onAnswer={handleClassAnswer}
            onSubmitAll={handleSubmitClass}
          />
        ) : problem ? (
          <ProblemExitTicketAssessment
            problem={problem}
            steps={steps}
            answers={answers}
            onAnswerChange={handleAnswerChange}
            onCheckAnswer={handleCheckAnswer}
          />
        ) : null}

        {isComplete && showResults && (
          <div className="mt-6">
            <ExitTicketResultsDialog
              open={showResults}
              onOpenChange={(open) => {
                if (!open) {
                  if (hasClassQuestions) {
                    setIsReviewMode(true);
                  }
                  setShowResults(false);
                } else {
                  setShowResults(true);
                }
              }}
              assessmentEndReason={assessmentEndReason}
              isClassMode={hasClassQuestions}
              classResults={classResults}
              classQuestionCount={classQuestions.length}
              timeLimitSec={timeLimit}
              timeRemainingSec={timeRemaining}
              getProblemResult={calculateResult}
              onContinue={() => {
                if (hasClassQuestions) {
                  setIsReviewMode(true);
                  setShowResults(false);
                } else {
                  setShowResults(false);
                  if (assessmentEndReason === "submit") {
                    onComplete(calculateResult());
                  }
                  onCancel();
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
