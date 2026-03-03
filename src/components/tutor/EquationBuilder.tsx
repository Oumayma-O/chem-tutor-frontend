import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { StepBadge } from "./StepBadge";
import { CheckCircle, XCircle, RotateCcw, Lightbulb, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Token → canonical math string ────────────────────────────

/**
 * Converts an ordered list of drag tokens into a normalised math string
 * suitable for backend algebraic validation.
 *
 * Steps:
 *   1. Join tokens with spaces.
 *   2. Replace Unicode math operators with ASCII equivalents.
 *   3. Strip chemistry bracket-subscript notation ([A]t → At).
 *
 * Examples:
 *   ["[A]t","=","[A]0","−","k","·","t"] → "At = A0 - k * t"
 *   ["[A]t","=","[A]0","−","t","·","k"] → "At = A0 - t * k"
 *   Both are algebraically equivalent and the backend validates them as such.
 */
function buildMathExpression(tokens: string[]): string {
  return tokens
    .join(" ")
    .replace(/·/g, " * ")
    .replace(/×/g, " * ")
    .replace(/−/g, " - ")
    .replace(/–/g, " - ")
    // Strip bracket subscript notation: [A]t → At, [A]0 → A0
    .replace(/\[([A-Za-z]+)\](\w*)/g, "$1$2")
    // Collapse multiple spaces
    .replace(/\s{2,}/g, " ")
    .trim();
}

interface EquationBuilderProps {
  stepNumber: number;
  label: string;
  instruction: string;
  availableParts: string[];
  /** Called with the normalised math string; returns true if algebraically correct. */
  onValidate: (mathExpr: string) => Promise<boolean>;
  onComplete: (isCorrect: boolean) => void;
  isComplete: boolean;
  showHint: boolean;
  hintText?: string;
  hintLoading?: boolean;
  onRequestHint: () => void;
}

export function EquationBuilder({
  stepNumber,
  label,
  instruction,
  availableParts,
  onValidate,
  onComplete,
  isComplete,
  showHint,
  hintText,
  hintLoading,
  onRequestHint,
}: EquationBuilderProps) {
  const [slots, setSlots] = useState<string[]>([]);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [isIncorrect, setIsIncorrect] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Shuffle available parts on mount so correct order isn't obvious
  const [shuffledParts] = useState(() => {
    const arr = [...availableParts];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  const usedParts = new Set(slots);
  const remaining = shuffledParts.filter((p) => !usedParts.has(p));

  const handleDragStart = (e: React.DragEvent, part: string) => {
    e.dataTransfer.setData("text/plain", part);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const part = e.dataTransfer.getData("text/plain");
      if (part && !slots.includes(part)) {
        setSlots((prev) => [...prev, part]);
        setIsIncorrect(false);
      }
    },
    [slots]
  );

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleClickAdd = (part: string) => {
    if (!slots.includes(part)) {
      setSlots((prev) => [...prev, part]);
      setIsIncorrect(false);
    }
  };

  const handleRemoveSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
    setIsIncorrect(false);
  };

  const handleReset = () => {
    setSlots([]);
    setIsIncorrect(false);
  };

  const handleCheck = useCallback(async () => {
    if (slots.length === 0 || isValidating || isComplete) return;
    setHasAttempted(true);
    setIsValidating(true);
    try {
      // 1. Convert tokens → structured math string
      const mathExpr = buildMathExpression(slots);
      // 2. Send to backend for algebraic validation
      const isCorrect = await onValidate(mathExpr);
      if (isCorrect) {
        setIsIncorrect(false);
        onComplete(true);
      } else {
        setIsIncorrect(true);
        onComplete(false);
      }
    } catch {
      setIsIncorrect(true);
      onComplete(false);
    } finally {
      setIsValidating(false);
    }
  }, [slots, isValidating, isComplete, onValidate, onComplete]);

  return (
    <div
      className={cn(
        "step-card rounded-lg p-5 shadow-step border-l-4 transition-all",
        isComplete && "bg-step-complete border-step-complete-border",
        isIncorrect && "bg-step-interactive border-destructive",
        !isComplete && !isIncorrect && "bg-step-interactive border-step-interactive-border"
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <StepBadge stepNumber={stepNumber} type="interactive" isComplete={isComplete} />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-accent-foreground bg-accent px-2 py-0.5 rounded">
            {label}
          </span>
          <span className="text-foreground font-medium">{instruction}</span>
        </div>
      </div>

      <div className="ml-16 space-y-3">
        {/* Available chips */}
        <div>
          <span className="text-xs text-muted-foreground mb-2 block">Available variables:</span>
          <div className="flex flex-wrap gap-2">
            {remaining.map((part) => (
              <button
                key={part}
                draggable={!isComplete}
                onDragStart={(e) => handleDragStart(e, part)}
                onClick={() => !isComplete && handleClickAdd(part)}
                disabled={isComplete}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-mono font-medium border transition-all cursor-grab active:cursor-grabbing",
                  "bg-card border-border text-foreground hover:border-primary hover:bg-primary/5",
                  isComplete && "opacity-50 cursor-not-allowed"
                )}
              >
                {part}
              </button>
            ))}
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={cn(
            "min-h-[48px] rounded-lg border-2 border-dashed p-3 flex flex-wrap gap-2 items-center transition-all",
            slots.length === 0 && "border-muted-foreground/30",
            slots.length > 0 && "border-primary/40 bg-primary/5",
            isComplete && "border-success bg-success/5",
            isIncorrect && "border-destructive bg-destructive/5"
          )}
        >
          {slots.length === 0 && (
            <span className="text-sm text-muted-foreground">Drag or click variables here to form the equation</span>
          )}
          {slots.map((part, idx) => (
            <button
              key={idx}
              onClick={() => !isComplete && handleRemoveSlot(idx)}
              disabled={isComplete}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-mono font-medium border transition-all",
                "bg-primary/10 border-primary/30 text-foreground hover:bg-destructive/10 hover:border-destructive/30",
                isComplete && "cursor-default hover:bg-primary/10 hover:border-primary/30"
              )}
            >
              {part}
            </button>
          ))}
        </div>

        {/* Actions */}
        {!isComplete && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCheck}
              disabled={slots.length === 0 || isValidating}
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Checking…
                </>
              ) : (
                "Check"
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset} disabled={slots.length === 0 || isValidating}>
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        )}

        {/* Feedback */}
        {isComplete && (
          <div className="flex items-center gap-2 text-success fade-in">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Correct!</span>
          </div>
        )}

        {isIncorrect && !isValidating && (
          <div className="space-y-2 fade-in">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Not quite right. Try rearranging!</span>
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
