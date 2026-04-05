import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Problem, StudentAnswer, type SolutionStep } from "@/types/chemistry";
import { ExitTicketResult } from "@/types/cognitive";
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
}

export function ExitTicketMode({
  problem,
  timeLimit: propTimeLimit,
  onComplete,
  onCancel,
  classId: _classId,
  configId,
  prefetchedTicket,
}: ExitTicketModeProps) {
  const embedded =
    prefetchedTicket && configId && prefetchedTicket.id === configId ? prefetchedTicket : null;

  const {
    data: fetchedTicket,
    isLoading: ticketLoading,
    isError: ticketError,
  } = useQuery({
    queryKey: ["student", "exit-ticket", configId],
    queryFn: () => getExitTicketForStudent(configId!),
    enabled: Boolean(configId && !embedded),
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
  const [isComplete, setIsComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [classAnswers, setClassAnswers] = useState<Record<string, string>>({});
  const [classResults, setClassResults] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  /** Why the assessment closed — drives dialog copy (submit vs cancel vs time). */
  const [assessmentEndReason, setAssessmentEndReason] = useState<"submit" | "cancel" | "time" | null>(null);

  useEffect(() => {
    setTimeLimit(derivedLimitSec);
    setTimeRemaining(derivedLimitSec);
  }, [derivedLimitSec]);

  const isClassMode = Boolean(configId && classQuestions.length > 0);
  const loading = Boolean(configId && !ticket && ticketLoading);

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
      const graded = gradeClassQuestions(classQuestions, classAnswers);
      setClassResults(graded.perQuestion);
      setAssessmentEndReason(endReason);
      setIsComplete(true);
      setShowResults(true);
      if (configId) {
        try {
          await submitExitTicketAttempt(configId, { answers: classAnswers });
        } catch {
          /* submission optional if route missing */
        }
      }
      onComplete(
        buildClassExitTicketResult({
          configId,
          correctCount: graded.correctCount,
          total: graded.total,
          timeLimitSec: timeLimit,
          timeRemainingSec: timeRemaining,
        }),
      );
    },
    [classQuestions, classAnswers, configId, timeLimit, timeRemaining, onComplete],
  );

  const handleSubmitClass = useCallback(async () => {
    await finalizeClassAssessment("submit");
  }, [finalizeClassAssessment]);

  const handleTimeUp = useCallback(() => {
    if (isClassMode && classQuestions.length > 0) {
      void finalizeClassAssessment("time");
      return;
    }
    if (!isClassMode && problem && steps.length > 0) {
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
    isClassMode,
    classQuestions.length,
    finalizeClassAssessment,
    problem,
    steps.length,
    onComplete,
    calculateResult,
  ]);

  useEffect(() => {
    if (isComplete || loading) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isComplete, loading, handleTimeUp]);

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
    if (isClassMode && classQuestions.length > 0) {
      await finalizeClassAssessment("cancel");
      return;
    }
    if (!isClassMode && problem && steps.length > 0) {
      setAssessmentEndReason("cancel");
      setIsComplete(true);
      setShowResults(true);
      onComplete(calculateResult());
      return;
    }
    onCancel();
  }, [
    loading,
    isClassMode,
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

  if (configId && !ticket && ticketError && !ticketLoading) {
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

  if (configId && classQuestions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
        <div className="max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">This exit ticket has no questions.</p>
          <Button onClick={onCancel}>Close</Button>
        </div>
      </div>
    );
  }

  if (!configId && !problem) {
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
              <Timer className={cn("h-5 w-5", isLowTime ? "animate-pulse text-destructive" : "text-primary")} />
              <h2 className="text-lg font-bold text-foreground">Exit Ticket Assessment</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void handleCancelWithEvaluation()}>
              Cancel
            </Button>
          </div>
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
            {isClassMode
              ? "Complete all questions. Class assessment — no hints."
              : "Complete this problem without hints. Your performance determines readiness."}
          </p>
        </div>

        {isClassMode ? (
          <ClassExitTicketQuestions
            questions={classQuestions}
            classAnswers={classAnswers}
            classResults={classResults}
            isComplete={isComplete}
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
              onOpenChange={setShowResults}
              assessmentEndReason={assessmentEndReason}
              isClassMode={isClassMode}
              classResults={classResults}
              classQuestionCount={classQuestions.length}
              timeLimitSec={timeLimit}
              timeRemainingSec={timeRemaining}
              getProblemResult={calculateResult}
              onContinue={() => {
                setShowResults(false);
                if (!isClassMode && assessmentEndReason === "submit") {
                  onComplete(calculateResult());
                }
                onCancel();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
