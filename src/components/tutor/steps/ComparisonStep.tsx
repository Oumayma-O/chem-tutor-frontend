import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatMathContent } from "@/lib/mathDisplay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { StepCard } from "./StepCard";
import { StepHeader } from "./StepHeader";
import { CorrectFeedback } from "./CorrectFeedback";
import { StepErrorFeedback } from "./StepErrorFeedback";
import { STEP_ANSWER_TEXT, STEP_ANSWER_OUTLINE_SUCCESS, STEP_ANSWER_OUTLINE_ERROR } from "./stepAnswerStyles";
import { parseDraft, saveDraft } from "./draftPersistence";

interface DraftPayload {
  selected?: string;
  hasAttempted?: boolean;
  isIncorrect?: boolean;
}

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
  draft?: string;
  onDraftChange?: (draft: string) => void;
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
  draft,
  onDraftChange,
}: ComparisonStepProps) {
  const { selected: initSelected, hasAttempted: initAttempted, isIncorrect: initIncorrect } =
    parseDraft<DraftPayload>(draft, (raw) =>
      // Legacy: raw operator string e.g. "<" stored as plain JSON string
      typeof raw === "string" && ["<", ">", "="].includes(raw as string)
        ? { selected: raw as string }
        : null,
    );

  const [selected, setSelected] = useState<Operator | undefined>(
    initSelected as Operator | undefined,
  );
  const [isIncorrect, setIsIncorrect] = useState(
    !isComplete && (initIncorrect ?? false),
  );

  const persist = (sel: Operator | undefined, attempted: boolean, incorrect: boolean) =>
    saveDraft<DraftPayload>({ selected: sel, hasAttempted: attempted, isIncorrect: incorrect }, onDraftChange);

  const handleValueChange = (value: string) => {
    if (isComplete) return;
    const op = value as Operator;
    setSelected(op);
    setIsIncorrect(false);
    // Save selection; reset incorrect since user changed their answer
    persist(op, initAttempted ?? false, false);
  };

  const handleCheck = () => {
    if (!selected || isComplete) return;
    const correct = selected === correctAnswer;
    setIsIncorrect(!correct);
    persist(selected, true, !correct);
    onComplete(correct);
  };

  return (
    <StepCard isComplete={isComplete} isIncorrect={isIncorrect}>
      <StepHeader step_number={step_number} label={label} instruction={instruction} isComplete={isComplete} />

      <div className="ml-0 sm:ml-16 space-y-3">
        <div className="flex flex-wrap items-start gap-3 w-full min-w-0">
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-2 sm:gap-3 min-h-[3rem]">
            <span
              className={cn(
                STEP_ANSWER_TEXT,
                "equation min-w-0 flex-1 basis-[220px] max-w-full px-4 py-2 rounded-md border bg-card shadow-sm text-center sm:text-left",
              )}
            >
              {formatMathContent(comparisonParts[0])}
            </span>

            <Select value={selected} onValueChange={handleValueChange} disabled={isComplete}>
              <SelectTrigger
                className={cn(
                  STEP_ANSWER_TEXT,
                  "w-14 h-10 shrink-0 rounded-lg border bg-background text-center font-semibold shadow-sm",
                  "focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  isComplete && selected === correctAnswer && cn(STEP_ANSWER_OUTLINE_SUCCESS, "text-success"),
                  isIncorrect && STEP_ANSWER_OUTLINE_ERROR,
                )}
              >
                <SelectValue placeholder="?" />
              </SelectTrigger>
              <SelectContent align="center">
                {OPERATORS.map((op) => (
                  <SelectItem key={op} value={op} className={cn(STEP_ANSWER_TEXT, "text-center justify-center")}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span
              className={cn(
                STEP_ANSWER_TEXT,
                "equation min-w-0 flex-1 basis-[220px] max-w-full px-4 py-2 rounded-md border bg-card shadow-sm text-center sm:text-left",
              )}
            >
              {formatMathContent(comparisonParts[1])}
            </span>
          </div>
          <Button
            onClick={handleCheck}
            disabled={!selected || isComplete}
            size="sm"
            className="shrink-0 min-w-[80px] self-start w-full sm:w-auto sm:ml-auto"
          >
            Check
          </Button>
        </div>

        {isComplete && <CorrectFeedback />}

        {isIncorrect && (
          <StepErrorFeedback
            message="Not quite. Try a different operator."
            showHint={showHint}
            hintText={hintText}
            hintLoading={hintLoading}
            onRequestHint={onRequestHint}
          />
        )}
      </div>
    </StepCard>
  );
}
