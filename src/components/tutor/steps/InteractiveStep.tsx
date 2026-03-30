import { useCallback, useEffect, useRef, useState } from "react";
import { SolutionStep, StudentAnswer } from "@/types/chemistry";
import { Button } from "@/components/ui/button";
import { XCircle, X, Loader2, Sigma } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepCard } from "./StepCard";
import { StepHeader } from "./StepHeader";
import { CorrectFeedback } from "./CorrectFeedback";
import { HintToggle } from "./HintToggle";
import { MathToolbar } from "./MathToolbar";
import { MathFieldInput, type MathFieldInputHandle } from "./MathFieldInput";

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
  const [showToolbar, setShowToolbar] = useState(false);

  const mathRef = useRef<MathFieldInputHandle>(null);

  useEffect(() => setDismissed(false), [answer?.answer]);
  useEffect(() => {
    if (isCorrect) setShowToolbar(false);
  }, [isCorrect]);

  const insertAtCursor = useCallback((type: "cmd" | "write", value: string) => {
    if (type === "cmd") mathRef.current?.cmd(value);
    else mathRef.current?.write(value);
  }, []);

  const handleEnter = useCallback(() => {
    if (!checkingAnswer && !isCorrect && answer?.answer) {
      onCheckAnswer(step.id);
    }
  }, [checkingAnswer, isCorrect, answer?.answer, onCheckAnswer, step.id]);

  return (
    <StepCard isComplete={isCorrect} isIncorrect={isIncorrect}>
      <StepHeader
        step_number={step.step_number}
        label={step.label}
        instruction={step.instruction}
        isComplete={isCorrect}
      />

      <div className="ml-16 space-y-2">
        <div className="flex gap-2 items-start">
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div
              className={cn(
                "relative border rounded-md bg-white transition-all cursor-text min-h-[40px]",
                "focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1",
                !isCorrect && !isIncorrect && "border-gray-300",
                isCorrect && "border-success bg-success/10",
                isIncorrect && "border-destructive bg-destructive/10",
                !isCorrect && "pr-8",
              )}
              onClick={() => {
                if (isCorrect) return;
                mathRef.current?.focus();
              }}
            >
              <MathFieldInput
                key={step.id}
                ref={mathRef}
                value={answer?.answer ?? ""}
                onChange={(v) => onAnswerChange(step.id, v)}
                onEnter={handleEnter}
                readOnly={isCorrect}
              />

              {!isCorrect && (
                <div className="absolute right-1.5 inset-y-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
                  <button
                    type="button"
                    title="Clear answer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      mathRef.current?.clear();
                    }}
                    className="pointer-events-auto text-slate-300 hover:text-red-500 hover:bg-red-50 rounded p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    title={showToolbar ? "Hide math toolbar" : "Show math toolbar"}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowToolbar((v) => !v);
                    }}
                    className={cn(
                      "pointer-events-auto rounded p-0.5 transition-colors",
                      showToolbar
                        ? "text-blue-500 bg-blue-50"
                        : "text-slate-300 hover:text-slate-500 hover:bg-slate-100",
                    )}
                  >
                    <Sigma className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {showToolbar && !isCorrect && (
              <MathToolbar onInsert={insertAtCursor} />
            )}
          </div>

          {!isCorrect && (
            <Button
              onClick={() => onCheckAnswer(step.id)}
              disabled={!answer?.answer || checkingAnswer}
              className="bg-primary hover:bg-primary/90 min-w-[80px] h-[40px] shrink-0"
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
