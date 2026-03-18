import { useState } from "react";
import { XCircle } from "lucide-react";
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
import { HintToggle } from "./HintToggle";

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
  const [isIncorrect, setIsIncorrect] = useState(false);

  const handleValueChange = (value: string) => {
    if (isComplete) return;
    const op = value as Operator;
    setSelected(op);
    setIsIncorrect(false);
    if (op === correctAnswer) { onComplete(true); }
    else { setIsIncorrect(true); onComplete(false); }
  };

  return (
    <StepCard isComplete={isComplete} isIncorrect={isIncorrect}>
      <StepHeader step_number={step_number} label={label} instruction={instruction} isComplete={isComplete} />

      <div className="ml-16 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-sm bg-muted/80 px-3 py-2 rounded-lg border border-border shadow-sm min-w-0">
            {formatMathContent(comparisonParts[0])}
          </span>

          <Select value={selected || undefined} onValueChange={handleValueChange} disabled={isComplete}>
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
            {formatMathContent(comparisonParts[1])}
          </span>
        </div>

        {isComplete && <CorrectFeedback />}

        {isIncorrect && (
          <div className="space-y-2 fade-in">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Not quite. Try a different operator.</span>
            </div>
            <HintToggle showHint={showHint} hintText={hintText} hintLoading={hintLoading} onRequestHint={onRequestHint} />
          </div>
        )}
      </div>
    </StepCard>
  );
}
