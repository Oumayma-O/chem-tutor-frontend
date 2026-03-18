import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { XCircle, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepCard } from "./StepCard";
import { StepHeader } from "./StepHeader";
import { CorrectFeedback } from "./CorrectFeedback";
import { HintToggle } from "./HintToggle";

function buildMathExpression(tokens: string[]): string {
  return tokens
    .join(" ")
    .replace(/·/g, " * ")
    .replace(/×/g, " * ")
    .replace(/−/g, " - ")
    .replace(/–/g, " - ")
    .replace(/\[([A-Za-z]+)\](\w*)/g, "$1$2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

interface EquationBuilderProps {
  step_number: number;
  label: string;
  instruction: string;
  availableParts: string[];
  onValidate: (mathExpr: string) => Promise<boolean>;
  onComplete: (isCorrect: boolean) => void;
  isComplete: boolean;
  showHint: boolean;
  hintText?: string;
  hintLoading?: boolean;
  onRequestHint: () => void;
}

export function EquationBuilder({
  step_number,
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
  const [isIncorrect, setIsIncorrect] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const part = e.dataTransfer.getData("text/plain");
    if (part && !slots.includes(part)) { setSlots((prev) => [...prev, part]); setIsIncorrect(false); }
  }, [slots]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleClickAdd = (part: string) => {
    if (!slots.includes(part)) { setSlots((prev) => [...prev, part]); setIsIncorrect(false); }
  };

  const handleRemoveSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
    setIsIncorrect(false);
  };

  const handleCheck = useCallback(async () => {
    if (slots.length === 0 || isValidating || isComplete) return;
    setIsValidating(true);
    try {
      const isCorrect = await onValidate(buildMathExpression(slots));
      if (isCorrect) { setIsIncorrect(false); onComplete(true); }
      else { setIsIncorrect(true); onComplete(false); }
    } catch {
      setIsIncorrect(true); onComplete(false);
    } finally {
      setIsValidating(false);
    }
  }, [slots, isValidating, isComplete, onValidate, onComplete]);

  return (
    <StepCard isComplete={isComplete} isIncorrect={isIncorrect}>
      <StepHeader step_number={step_number} label={label} instruction={instruction} isComplete={isComplete} />

      <div className="ml-16 space-y-3">
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

        {!isComplete && (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCheck} disabled={slots.length === 0 || isValidating}>
              {isValidating ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Checking…</> : "Check"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setSlots([]); setIsIncorrect(false); }} disabled={slots.length === 0 || isValidating}>
              <RotateCcw className="w-3 h-3 mr-1" />Reset
            </Button>
          </div>
        )}

        {isComplete && <CorrectFeedback />}

        {isIncorrect && !isValidating && (
          <div className="space-y-2 fade-in">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Not quite right. Try rearranging!</span>
            </div>
            <HintToggle showHint={showHint} hintText={hintText} hintLoading={hintLoading} onRequestHint={onRequestHint} />
          </div>
        )}
      </div>
    </StepCard>
  );
}
