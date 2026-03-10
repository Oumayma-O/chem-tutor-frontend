import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepBadge } from "./StepBadge";
import { CheckCircle, XCircle, Lightbulb, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonStepProps {
  step_number: number;
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

const OPERATORS = ["<", "=", ">"] as const;
type Operator = (typeof OPERATORS)[number];

export function ComparisonStep({
  step_number,
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
  const [selected, setSelected] = useState<Operator | "">("");
  const [hasAttempted, setHasAttempted] = useState(false);
  const [isIncorrect, setIsIncorrect] = useState(false);

  const handleValueChange = (value: string) => {
    if (isComplete) return;
    const op = value as Operator;
    setSelected(op);
    setHasAttempted(true);
    setIsIncorrect(false);
    const correct = op === correctAnswer;
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
        <StepBadge step_number={step_number} type="interactive" isComplete={isComplete} />
        <span className="text-xs font-semibold text-accent-foreground bg-accent px-2 py-0.5 rounded">
          {label}
        </span>
        <span className="text-foreground font-medium">{instruction}</span>
      </div>

      <div className="ml-16 space-y-3">
        {/* [ Left box ] [ Dropdown ] [ Right box ] */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-sm bg-muted/80 px-3 py-2 rounded-lg border border-border shadow-sm min-w-0">
            {comparisonParts[0]}
          </span>

          <Select
            value={selected || undefined}
            onValueChange={handleValueChange}
            disabled={isComplete}
          >
            <SelectTrigger
              className={cn(
                "w-14 h-10 rounded-lg border bg-muted/50 text-center font-mono text-lg font-semibold shadow-sm",
                "focus:ring-2 focus:ring-ring focus:ring-offset-1",
                isComplete && selected === correctAnswer && "border-success bg-success/10 text-success",
                isIncorrect && "border-destructive bg-destructive/5"
              )}
            >
              <SelectValue placeholder="?" />
            </SelectTrigger>
            <SelectContent align="center">
              {OPERATORS.map((op) => (
                <SelectItem key={op} value={op} className="font-mono text-center justify-center">
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="font-mono text-sm bg-muted/80 px-3 py-2 rounded-lg border border-border shadow-sm min-w-0">
            {comparisonParts[1]}
          </span>
        </div>

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
