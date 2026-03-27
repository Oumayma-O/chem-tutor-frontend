import { useEffect, useRef, useState } from "react";
import { SolutionStep, StudentAnswer } from "@/types/chemistry";
import { Button } from "@/components/ui/button";
import { XCircle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepCard } from "./StepCard";
import { StepHeader } from "./StepHeader";
import { CorrectFeedback } from "./CorrectFeedback";
import { HintToggle } from "./HintToggle";
import { STEP_ANSWER_FIELD_TEXT } from "./stepAnswerStyles";

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
  const isCorrect = answer?.is_correct === true;
  const isIncorrect = answer?.is_correct === false;
  const displayHint = hintText || step.hint;
  const [dismissed, setDismissed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setDismissed(false), [answer?.answer]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeightPx = Number.parseFloat(window.getComputedStyle(el).lineHeight || "20");
    const maxHeight = lineHeightPx * 3;
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [answer?.answer]);

  return (
    <StepCard isComplete={isCorrect} isIncorrect={isIncorrect}>
      <StepHeader
        step_number={step.step_number}
        label={step.label}
        instruction={step.instruction}
        isComplete={isCorrect}
      />

      <div className="ml-16 space-y-3">
        <div className="flex gap-3 items-stretch">
          <textarea
            ref={textareaRef}
            value={answer?.answer || ""}
            onChange={(e) => onAnswerChange(step.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && answer?.answer && !checkingAnswer && !isCorrect) {
                e.preventDefault();
                onCheckAnswer(step.id);
              }
            }}
            placeholder="Enter your answer"
            disabled={isCorrect}
            rows={1}
            className={cn(
              STEP_ANSWER_FIELD_TEXT,
              "flex-1 min-h-[40px] resize-none overflow-y-auto disabled:opacity-50",
              isCorrect && "border-success bg-success/10",
              isIncorrect && "border-destructive bg-destructive/10",
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

        {isCorrect && <CorrectFeedback />}

        {isIncorrect && !dismissed && (
          <div className="flex items-center justify-between fade-in">
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
        )}

        {isIncorrect && (
          <HintToggle
            showHint={showHint}
            hintText={displayHint}
            hintLoading={hintLoading}
            onRequestHint={() => onRequestHint(step.id)}
          />
        )}
      </div>
    </StepCard>
  );
}

