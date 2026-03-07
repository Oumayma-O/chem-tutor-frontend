import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StepBadge } from "./StepBadge";
import { CheckCircle, XCircle, Lightbulb, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonStepProps {
  stepNumber: number;
  label: string;
  instruction: string;
  comparisonParts: [string, string];
  correctAnswer: "<" | ">" | "=";
  onComplete: (isCorrect: boolean) => void;
  isComplete: boolean;
  showHint: boolean;
  hintText?: string;
  hintLoading?: boolean;
  onRequestHint: () => void;
}

const OPERATORS = ["<", ">", "="] as const;

export function ComparisonStep({
  stepNumber,
  label,
  instruction,
  comparisonParts,
  correctAnswer,
  onComplete,
  isComplete,
  showHint,
  hintText,
  hintLoading,
  onRequestHint,
}: ComparisonStepProps) {
  const [selected, setSelected] = useState<"<" | ">" | "=" | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [isIncorrect, setIsIncorrect] = useState(false);

  const handleSelect = (op: "<" | ">" | "=") => {
    if (isComplete) return;
    setSelected(op);
    setIsIncorrect(false);
  };

  const handleCheck = () => {
    if (!selected) return;
    setHasAttempted(true);
    const correct = selected === correctAnswer;
    if (correct) {
      onComplete(true);
    } else {
      setIsIncorrect(true);
      onComplete(false);
    }
  };

  return (
    <div
      className={cn(
        "step-card rounded-lg p-5 shadow-step border-l-4 transition-all",
        isComplete && "bg-step-complete border-step-complete-border",
        isIncorrect && "bg-step-interactive border-destructive",
        !isComplete && !isIncorrect && "bg-step-interactive border-step-interactive-border"
      )}
    >
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <StepBadge stepNumber={stepNumber} type="interactive" isComplete={isComplete} />
        <span className="text-xs font-semibold text-accent-foreground bg-accent px-2 py-0.5 rounded">
          {label}
        </span>
        <span className="text-foreground font-medium">{instruction}</span>
      </div>

      <div className="ml-16 space-y-3">
        {/* Comparison row */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm bg-muted px-3 py-1.5 rounded border">
            {comparisonParts[0]}
          </span>

          <div className="flex gap-1">
            {OPERATORS.map((op) => (
              <button
                key={op}
                onClick={() => handleSelect(op)}
                disabled={isComplete}
                className={cn(
                  "w-9 h-9 rounded-md border text-sm font-bold transition-colors",
                  selected === op && !isComplete
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted",
                  isComplete && selected === op && "bg-success/20 border-success text-success",
                  isComplete && "cursor-default"
                )}
              >
                {op}
              </button>
            ))}
          </div>

          <span className="font-mono text-sm bg-muted px-3 py-1.5 rounded border">
            {comparisonParts[1]}
          </span>
        </div>

        {/* Check button */}
        {!isComplete && (
          <Button size="sm" onClick={handleCheck} disabled={!selected}>
            Check
          </Button>
        )}

        {/* Feedback */}
        {isComplete && (
          <div className="flex items-center gap-2 text-success fade-in">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Correct!</span>
          </div>
        )}

        {isIncorrect && (
          <div className="space-y-2 fade-in">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Not quite. Try a different operator.</span>
            </div>
            {!showHint && !hintLoading && (
              <Button variant="outline" size="sm" onClick={onRequestHint} className="text-muted-foreground">
                <Lightbulb className="w-4 h-4 mr-2" />
                Need a hint?
              </Button>
            )}
          </div>
        )}

        {hintLoading && (
          <div className="flex items-center gap-2 text-muted-foreground fade-in">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Generating hint…</span>
          </div>
        )}

        {showHint && hintText && (
          <div className="bg-warning/20 border border-warning/40 rounded-md p-3 fade-in">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-warning mt-0.5" />
              <p className="text-sm text-foreground">{hintText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
