import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputField } from "@/types/chemistry";
import { StepCard } from "./StepCard";
import { StepHeader } from "./StepHeader";
import { CorrectFeedback } from "./CorrectFeedback";
import { HintToggle } from "./HintToggle";
import { STEP_ANSWER_FIELD_TEXT } from "./stepAnswerStyles";

interface KnownsIdentifierProps {
  step_number: number;
  label: string;
  instruction: string;
  variables: InputField[];
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
    Object.fromEntries(variables.map((v) => [v.label, { value: "", unit: "" }])),
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
  const hasUnit = (v: InputField) => Boolean(v.unit?.trim());

  const handleCheck = () => {
    setHasAttempted(true);
    const errors: Record<string, boolean> = {};
    let allCorrect = true;

    variables.forEach((v) => {
      const studentVal = normalize(values[v.label]?.value || "");
      const studentUnit = normalize(values[v.label]?.unit || "");
      const correctVal = normalize(v.value);
      const correctUnit = normalize(v.unit);
      const numStudent = parseFloat(studentVal);
      const numCorrect = parseFloat(correctVal);
      const valMatch = !isNaN(numStudent) && !isNaN(numCorrect)
        ? Math.abs(numStudent - numCorrect) < 0.001
        : studentVal === correctVal;
      const unitMatch = !hasUnit(v) ? true : studentUnit === correctUnit;
      if (!valMatch || !unitMatch) { errors[v.label] = true; allCorrect = false; }
    });

    setFieldErrors(errors);
    if (allCorrect) { onComplete(true); } else { setIsIncorrect(true); onComplete(false); }
  };

  return (
    <StepCard isComplete={isComplete} isIncorrect={isIncorrect}>
      <StepHeader step_number={step_number} label={label} instruction={instruction} isComplete={isComplete} />

      <div className="w-full max-w-[400px] mx-auto flex flex-col gap-3 py-2">
        {variables.map((v) => {
          const showUnit = hasUnit(v);
          return (
            <div key={v.label} className="flex flex-row items-center w-full">
              <div className="text-sm font-medium text-slate-600 w-[45%] text-right pr-4 leading-snug font-sans shrink-0">
                {v.label}:
              </div>
              <div className="flex-1 flex gap-2">
                <Input
                  value={values[v.label]?.value || ""}
                  onChange={(e) => handleChange(v.label, "value", e.target.value)}
                  disabled={isComplete}
                  placeholder="Enter your answer"
                  className={cn(
                    STEP_ANSWER_FIELD_TEXT,
                    "flex-1",
                    (isComplete || (hasAttempted && !fieldErrors[v.label])) && "border-success bg-success/10",
                    fieldErrors[v.label] && "border-destructive bg-destructive/10",
                  )}
                />
                {showUnit && (
                  <Input
                    value={values[v.label]?.unit || ""}
                    onChange={(e) => handleChange(v.label, "unit", e.target.value)}
                    disabled={isComplete}
                    placeholder="Unit"
                    className={cn(
                      STEP_ANSWER_FIELD_TEXT,
                      "w-20 shrink-0",
                      (isComplete || (hasAttempted && !fieldErrors[v.label])) && "border-success bg-success/10",
                      fieldErrors[v.label] && "border-destructive bg-destructive/10",
                    )}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-3">
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
