import { useEffect, useState } from "react";
import { SolutionStep, StudentAnswer } from "@/types/chemistry";
import { StepBadge } from "./StepBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, X, XCircle, Lightbulb, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveStepProps {
  step: SolutionStep;
  answer: StudentAnswer | undefined;
  onAnswerChange: (stepId: string, answer: string) => void;
  onCheckAnswer: (stepId: string) => void;
  showHint: boolean;
  hintText?: string;
  hintLoading?: boolean;
  checkingAnswer?: boolean;
  onRequestHint: (stepId: string) => void;
}

export function InteractiveStep({
  step,
  answer,
  onAnswerChange,
  onCheckAnswer,
  showHint,
  hintText,
  hintLoading,
  checkingAnswer,
  onRequestHint,
}: InteractiveStepProps) {
  const isCorrect = answer?.isCorrect === true;
  const isIncorrect = answer?.isCorrect === false;
  const displayHint = hintText || step.hint;
  const [dismissed, setDismissed] = useState(false);
  // Reset dismiss when the student changes their answer (new attempt)
  useEffect(() => setDismissed(false), [answer?.answer]);

  return (
    <div
      className={cn(
        "step-card rounded-lg p-5 shadow-step border-l-4 transition-all",
        isCorrect && "bg-step-complete border-step-complete-border",
        isIncorrect && "bg-step-interactive border-destructive",
        !isCorrect && !isIncorrect && "bg-step-interactive border-step-interactive-border"
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <StepBadge stepNumber={step.stepNumber} type="interactive" isComplete={isCorrect} />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-accent-foreground bg-accent px-2 py-0.5 rounded">
            {step.label}
          </span>
          <span className="text-foreground font-medium">{step.instruction}</span>
        </div>
      </div>

      <div className="ml-16 space-y-3">
        <div className="flex gap-3">
          <Input
            value={answer?.answer || ""}
            onChange={(e) => onAnswerChange(step.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && answer?.answer && !checkingAnswer && !isCorrect) {
                e.preventDefault();
                onCheckAnswer(step.id);
              }
            }}
            placeholder="Enter your answer"
            disabled={isCorrect}
            className={cn(
              "flex-1 bg-card border-2 transition-all",
              isCorrect && "border-success bg-success/10",
              isIncorrect && "border-destructive bg-destructive/10"
            )}
          />
          {!isCorrect && (
            <Button
              onClick={() => onCheckAnswer(step.id)}
              disabled={!answer?.answer || checkingAnswer}
              className="bg-primary hover:bg-primary/90 min-w-[80px]"
            >
              {checkingAnswer ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
            </Button>
          )}
        </div>

        {/* Feedback */}
        {isCorrect && (
          <div className="flex items-center gap-2 text-success fade-in">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Correct!</span>
          </div>
        )}

        {isIncorrect && !dismissed && (
          <div className="space-y-2 fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Not quite right. Try again!</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setDismissed(true)}
                aria-label="Dismiss feedback"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            {!showHint && !hintLoading && (step.hint || true) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRequestHint(step.id)}
                className="text-muted-foreground"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Get a hint
              </Button>
            )}
          </div>
        )}

        {/* Hint loading */}
        {hintLoading && (
          <div className="flex items-center gap-2 text-muted-foreground fade-in">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Generating hint…</span>
          </div>
        )}

        {/* Hint */}
        {showHint && displayHint && (
          <div className="bg-warning/20 border border-warning/40 rounded-md p-3 fade-in">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-warning mt-0.5" />
              <p className="text-sm text-foreground">{displayHint}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
