import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepCard } from "./StepCard";
import { StepHeader } from "./StepHeader";
import { CorrectFeedback } from "./CorrectFeedback";
import { StepErrorFeedback } from "./StepErrorFeedback";
import { MathText } from "@/lib/mathDisplay";
import { RevealHelpSection } from "./RevealHelpSection";
import { STEP_ANSWER_TEXT } from "./stepAnswerStyles";
import { parseDraft, saveDraft } from "./draftPersistence";

interface DraftPayload {
  slots?: string[];
  hasAttempted?: boolean;
  isIncorrect?: boolean;
}

interface EquationBuilderProps {
  step_number: number;
  label: string;
  instruction: string;
  availableParts: string[];
  onValidate: (orderedParts: string[]) => Promise<boolean>;
  onComplete: (isCorrect: boolean) => void;
  onCheckStart?: () => void;
  isComplete: boolean;
  isLocked?: boolean;
  showHint: boolean;
  hintText?: string;
  hintLoading?: boolean;
  onRequestHint: () => void;
  draft?: string;
  onDraftChange?: (draft: string) => void;
  revealAnswerText?: string | null;
  revealLimitReached?: boolean;
}

export function EquationBuilder({
  step_number,
  label,
  instruction,
  availableParts,
  onValidate,
  onComplete,
  onCheckStart,
  isComplete,
  isLocked,
  showHint,
  hintText,
  hintLoading,
  onRequestHint,
  draft,
  onDraftChange,
  revealAnswerText,
  revealLimitReached,
}: EquationBuilderProps) {
  const { slots: initSlots, isIncorrect: initIncorrect } = parseDraft<DraftPayload>(draft,
    (raw) => Array.isArray(raw) ? { slots: raw as string[] } : null,
  );

  const [slots, setSlots] = useState<string[]>(initSlots ?? []);
  const [isIncorrect, setIsIncorrect] = useState(!isComplete && (initIncorrect ?? false));
  const [isValidating, setIsValidating] = useState(false);
  const [hintPanelOpen, setHintPanelOpen] = useState(false);

  useEffect(() => {
    if (!showHint && !hintLoading) setHintPanelOpen(false);
  }, [showHint, hintLoading]);

  useEffect(() => {
    if (isComplete) setHintPanelOpen(false);
  }, [isComplete]);

  const persist = useCallback(
    (nextSlots: string[], attempted: boolean, incorrect: boolean) =>
      saveDraft<DraftPayload>({ slots: nextSlots, hasAttempted: attempted, isIncorrect: incorrect }, onDraftChange),
    [onDraftChange],
  );

  const updateSlots = useCallback((next: string[]) => {
    setSlots(next);
    saveDraft<DraftPayload>({ slots: next }, onDraftChange);
  }, [onDraftChange]);

  const usedParts = new Set(slots);
  const remaining = availableParts.filter((p) => !usedParts.has(p));

  const handleDragStart = (e: React.DragEvent, part: string) => {
    e.dataTransfer.setData("text/plain", part);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const part = e.dataTransfer.getData("text/plain");
    if (part && !slots.includes(part)) {
      updateSlots([...slots, part]);
      setIsIncorrect(false);
    }
  }, [slots, updateSlots]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleClickAdd = (part: string) => {
    if (!slots.includes(part)) {
      updateSlots([...slots, part]);
      setIsIncorrect(false);
    }
  };

  const handleRemoveSlot = (index: number) => {
    updateSlots(slots.filter((_, i) => i !== index));
    setIsIncorrect(false);
  };

  const handleReset = () => {
    updateSlots([]);
    setIsIncorrect(false);
  };

  const handleCheck = useCallback(async () => {
    if (slots.length === 0 || isValidating || isComplete) return;
    onCheckStart?.();
    // Persist latest slot order before async validate/complete pipeline.
    onDraftChange?.(JSON.stringify(slots));
    setIsValidating(true);
    try {
      const correct = await onValidate(slots);
      setIsIncorrect(!correct);
      persist(slots, true, !correct);
      onComplete(correct);
    } catch {
      setIsIncorrect(true);
      persist(slots, true, true);
      onComplete(false);
    } finally {
      setIsValidating(false);
    }
  }, [slots, isValidating, isComplete, onCheckStart, onValidate, onComplete, onDraftChange, persist]);

  return (
    <StepCard isComplete={isComplete} isIncorrect={isIncorrect} isLocked={isLocked}>
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
                  STEP_ANSWER_TEXT,
                  "px-3 py-1.5 rounded-md font-medium border transition-all cursor-grab active:cursor-grabbing",
                  "bg-card border-border text-foreground hover:border-primary hover:bg-primary/5",
                  isComplete && "opacity-50 cursor-not-allowed",
                )}
              >
                <MathText>{part}</MathText>
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
            slots.length > 0 && !isComplete && !isIncorrect && "border-primary/40 bg-primary/5",
            isComplete && "border-success bg-success/5",
            isIncorrect && "border-destructive bg-destructive/5",
          )}
        >
          {slots.length === 0 && (
            <span className={cn(STEP_ANSWER_TEXT, "text-muted-foreground")}>
              Drag or click variables here to form the equation
            </span>
          )}
          {slots.map((part, idx) => (
            <button
              key={idx}
              onClick={() => !isComplete && handleRemoveSlot(idx)}
              disabled={isComplete}
              className={cn(
                STEP_ANSWER_TEXT,
                "px-3 py-1.5 rounded-md font-medium border transition-all",
                "bg-primary/10 border-primary/30 text-foreground hover:bg-destructive/10 hover:border-destructive/30",
                isComplete && "cursor-default hover:bg-primary/10 hover:border-primary/30",
              )}
            >
              <MathText>{part}</MathText>
            </button>
          ))}
        </div>

        {!isComplete && (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCheck} disabled={slots.length === 0 || isValidating}>
              {isValidating ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Checking...</> : "Check"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset} disabled={slots.length === 0 || isValidating}>
              <RotateCcw className="w-3 h-3 mr-1" />Reset
            </Button>
          </div>
        )}

        {isComplete && <CorrectFeedback />}

        {isIncorrect && !isValidating && (
          <StepErrorFeedback
            message="Not quite right. Try rearranging!"
            showHint={showHint}
            hintText={hintText}
            hintLoading={hintLoading}
            onRequestHint={onRequestHint}
            hintPanelOpen={hintPanelOpen}
            onHintPanelOpenChange={setHintPanelOpen}
          />
        )}

        <RevealHelpSection
          completed={isComplete}
          revealLimitReached={revealLimitReached}
          revealAnswerText={revealAnswerText}
        />
      </div>
    </StepCard>
  );
}
