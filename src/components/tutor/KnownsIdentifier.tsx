import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepCard } from "./StepCard";
import { StepHeader } from "./StepHeader";
import { CorrectFeedback } from "./CorrectFeedback";
import { HintToggle } from "./HintToggle";

interface LabeledValue {
  variable: string;
  value: string;
  unit: string;
}

interface KnownsIdentifierProps {
  step_number: number;
  label: string;
  instruction: string;
  variables: LabeledValue[];
  onComplete: (isCorrect: boolean) => void;
  isComplete: boolean;
  showHint: boolean;
  hintText?: string;
  hintLoading?: boolean;
  onRequestHint: () => void;
}

export function KnownsIdentifier({
  step_number,
  label,
  instruction,
  variables,
  onComplete,
  isComplete,
  showHint,
  hintText,
  hintLoading,
  onRequestHint,
}: KnownsIdentifierProps) {
  const [values, setValues] = useState<Record<string, { value: string; unit: string }>>(
    Object.fromEntries(variables.map((v) => [v.variable, { value: "", unit: "" }]))
  );
  const [hasAttempted, setHasAttempted] = useState(false);
  const [isIncorrect, setIsIncorrect] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const handleChange = (name: string, field: "value" | "unit", val: string) => {
    setValues((prev) => ({ ...prev, [name]: { ...prev[name], [field]: val } }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setIsIncorrect(false);
  };

  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");
  const hasUnit = (v: LabeledValue) => Boolean(v.unit?.trim());

  const handleCheck = () => {
    setHasAttempted(true);
    const errors: Record<string, boolean> = {};
    let allCorrect = true;

    variables.forEach((v) => {
      const studentVal = normalize(values[v.variable]?.value || "");
      const studentUnit = normalize(values[v.variable]?.unit || "");
      const correctVal = normalize(v.value);
      const correctUnit = normalize(v.unit);
      const numStudent = parseFloat(studentVal);
      const numCorrect = parseFloat(correctVal);
      const valMatch = !isNaN(numStudent) && !isNaN(numCorrect)
        ? Math.abs(numStudent - numCorrect) < 0.001
        : studentVal === correctVal;
      const unitMatch = !hasUnit(v) ? true : studentUnit === correctUnit;
      if (!valMatch || !unitMatch) { errors[v.variable] = true; allCorrect = false; }
    });

    setFieldErrors(errors);
    if (allCorrect) { onComplete(true); } else { setIsIncorrect(true); onComplete(false); }
  };

  return (
    <StepCard isComplete={isComplete} isIncorrect={isIncorrect}>
      <StepHeader step_number={step_number} label={label} instruction={instruction} isComplete={isComplete} />

      <div className="ml-16 space-y-3">
        <div className="space-y-2">
          {variables.map((v) => {
            const showUnit = hasUnit(v);
            return (
              <div
                key={v.variable}
                className={cn(
                  "grid gap-2 items-center",
                  showUnit ? "grid-cols-[100px_1fr_100px]" : "grid-cols-[100px_1fr]"
                )}
              >
                <span className="text-sm font-mono font-medium text-foreground">{v.variable} →</span>
                <Input
                  value={values[v.variable]?.value || ""}
                  onChange={(e) => handleChange(v.variable, "value", e.target.value)}
                  disabled={isComplete}
                  placeholder="Enter your answer"
                  className={cn(
                    "text-sm",
                    (isComplete || (hasAttempted && !fieldErrors[v.variable])) && "border-success bg-success/10",
                    fieldErrors[v.variable] && "border-destructive bg-destructive/10"
                  )}
                />
                {showUnit && (
                  <Input
                    value={values[v.variable]?.unit || ""}
                    onChange={(e) => handleChange(v.variable, "unit", e.target.value)}
                    disabled={isComplete}
                    placeholder="Unit"
                    className={cn(
                      "text-sm",
                      (isComplete || (hasAttempted && !fieldErrors[v.variable])) && "border-success bg-success/10",
                      fieldErrors[v.variable] && "border-destructive bg-destructive/10"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {!isComplete && <Button size="sm" onClick={handleCheck}>Check</Button>}
        {isComplete && <CorrectFeedback />}

        {isIncorrect && (
          <div className="space-y-2 fade-in">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Some values are incorrect. Check the highlighted fields.</span>
            </div>
            <HintToggle showHint={showHint} hintText={hintText} hintLoading={hintLoading} onRequestHint={onRequestHint} />
          </div>
        )}
      </div>
    </StepCard>
  );
}
