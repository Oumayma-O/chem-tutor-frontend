import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepBadge } from "./StepBadge";
import { CheckCircle, XCircle, Lightbulb, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KnownVariable {
  name: string;
  value: string;
  unit: string;
}

interface KnownsIdentifierProps {
  stepNumber: number;
  label: string;
  instruction: string;
  variables: KnownVariable[];
  onComplete: (isCorrect: boolean) => void;
  isComplete: boolean;
  showHint: boolean;
  hintText?: string;
  hintLoading?: boolean;
  onRequestHint: () => void;
}

export function KnownsIdentifier({
  stepNumber,
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
    Object.fromEntries(variables.map((v) => [v.name, { value: "", unit: "" }]))
  );
  const [hasAttempted, setHasAttempted] = useState(false);
  const [isIncorrect, setIsIncorrect] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const handleChange = (name: string, field: "value" | "unit", val: string) => {
    setValues((prev) => ({
      ...prev,
      [name]: { ...prev[name], [field]: val },
    }));
    setIsIncorrect(false);
  };

  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");

  const handleCheck = () => {
    setHasAttempted(true);
    const errors: Record<string, boolean> = {};
    let allCorrect = true;

    variables.forEach((v) => {
      const studentVal = normalize(values[v.name]?.value || "");
      const studentUnit = normalize(values[v.name]?.unit || "");
      const correctVal = normalize(v.value);
      const correctUnit = normalize(v.unit);
      
      // Check numeric equivalence for values
      const numStudent = parseFloat(studentVal);
      const numCorrect = parseFloat(correctVal);
      const valMatch = !isNaN(numStudent) && !isNaN(numCorrect) 
        ? Math.abs(numStudent - numCorrect) < 0.001 
        : studentVal === correctVal;
      const unitMatch = studentUnit === correctUnit;

      if (!valMatch || !unitMatch) {
        errors[v.name] = true;
        allCorrect = false;
      }
    });

    setFieldErrors(errors);
    if (allCorrect) {
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
        {/* Variable fields */}
        <div className="space-y-2">
          {variables.map((v) => (
            <div key={v.name} className="grid grid-cols-[100px_1fr_100px] gap-2 items-center">
              <span className="text-sm font-mono font-medium text-foreground">{v.name} →</span>
              <Input
                value={values[v.name]?.value || ""}
                onChange={(e) => handleChange(v.name, "value", e.target.value)}
                disabled={isComplete}
                placeholder="Enter your answer"
                className={cn(
                  "text-sm",
                  isComplete && "border-success bg-success/10",
                  fieldErrors[v.name] && "border-destructive bg-destructive/10"
                )}
              />
              <Input
                value={values[v.name]?.unit || ""}
                onChange={(e) => handleChange(v.name, "unit", e.target.value)}
                disabled={isComplete}
                placeholder="Unit"
                className={cn(
                  "text-sm",
                  isComplete && "border-success bg-success/10",
                  fieldErrors[v.name] && "border-destructive bg-destructive/10"
                )}
              />
            </div>
          ))}
        </div>

        {/* Check button */}
        {!isComplete && (
          <Button size="sm" onClick={handleCheck}>
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
              <span className="font-medium">Some values are incorrect. Check the highlighted fields.</span>
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
