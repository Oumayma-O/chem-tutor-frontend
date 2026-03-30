import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputField } from "@/types/chemistry";
import { StepCard } from "./StepCard";
import { StepHeader } from "./StepHeader";
import { CorrectFeedback } from "./CorrectFeedback";
import { HintToggle } from "./HintToggle";
import { MathToolbar } from "./MathToolbar";
import { STEP_ANSWER_FIELD_TEXT, FX_TOGGLE_ACTIVE, FX_TOGGLE_IDLE } from "./stepAnswerStyles";
import { MathFieldInput, type MathFieldInputHandle } from "./MathFieldInput";

interface MultiInputProps {
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

export function MultiInput({
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
}: MultiInputProps) {
  const [values, setValues] = useState<Record<string, { value: string; unit: string }>>(
    // When restoring from cache (isComplete already true), populate with correct answers
    // so the read-only view shows the values that were entered, not blank fields.
    () => Object.fromEntries(variables.map((v) => [v.label, {
      value: isComplete ? v.value : "",
      unit:  isComplete ? v.unit  : "",
    }])),
  );
  const [hasAttempted, setHasAttempted] = useState(false);
  const [isIncorrect,  setIsIncorrect]  = useState(false);
  const [fieldErrors,  setFieldErrors]  = useState<Record<string, boolean>>({});
  const [focusedVar,   setFocusedVar]   = useState<string | null>(null);
  const [showToolbar,  setShowToolbar]  = useState(false);

  // Imperative handles for each MathFieldInput
  // If isComplete arrives after mount (restored from cache asynchronously), fill values.
  useEffect(() => {
    if (isComplete) {
      setValues(Object.fromEntries(variables.map((v) => [v.label, { value: v.value, unit: v.unit }])));
    }
  }, [isComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const mathRefs = useRef<Map<string, MathFieldInputHandle>>(new Map());

  const handleChange = useCallback((name: string, field: "value" | "unit", val: string) => {
    setValues((prev) => ({ ...prev, [name]: { ...prev[name], [field]: val } }));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setIsIncorrect(false);
  }, []);

  /** Insert LaTeX at the focused (or first) value field. */
  const insertAtCursor = useCallback(
    (type: 'cmd' | 'write', value: string) => {
      const key = focusedVar ?? variables[0]?.label;
      if (!key) return;
      const handle = mathRefs.current.get(key);
      if (!handle) return;
      if (type === 'cmd') handle.cmd(value);
      else                handle.write(value);
    },
    [focusedVar, variables],
  );

  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");
  const hasUnit   = (v: InputField) => Boolean(v.unit?.trim());

  const handleCheck = () => {
    setHasAttempted(true);
    const errors: Record<string, boolean> = {};
    let allCorrect = true;

    variables.forEach((v) => {
      const studentVal  = normalize(values[v.label]?.value || "");
      const studentUnit = normalize(values[v.label]?.unit  || "");
      const correctVal  = normalize(v.value);
      const correctUnit = normalize(v.unit);
      const numStudent  = parseFloat(studentVal);
      const numCorrect  = parseFloat(correctVal);
      const valMatch    = !isNaN(numStudent) && !isNaN(numCorrect)
        ? Math.abs(numStudent - numCorrect) < 0.001
        : studentVal === correctVal;
      const unitMatch   = !hasUnit(v) ? true : studentUnit === correctUnit;
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
          const showUnitField = hasUnit(v);
          const hasError      = !!fieldErrors[v.label];
          const isGreen       = isComplete || (hasAttempted && !hasError);

          return (
            <div key={v.label} className="flex flex-row items-center w-full">
              <div className="text-sm font-medium text-slate-600 w-[45%] text-right pr-4 leading-snug font-sans shrink-0">
                {v.label}:
              </div>
              <div className="flex-1 flex gap-2">
                {/*
                 * Wrapper div captures focus/blur bubbling from <math-field>
                 * so we know which variable's toolbar insert should target.
                 */}
                <div
                  className={cn(
                    "relative flex-1 min-w-0 border rounded-md bg-white transition-all cursor-text",
                    "focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1",
                    !isGreen && !hasError && "border-gray-300",
                    isGreen  && "border-success bg-success/10",
                    hasError && "border-destructive bg-destructive/10",
                  )}
                  onFocus={() => setFocusedVar(v.label)}
                  onBlur={() => setFocusedVar((prev) => (prev === v.label ? null : prev))}
                  onClick={() => !isComplete && mathRefs.current.get(v.label)?.focus()}
                >
                  <MathFieldInput
                    ref={(handle: MathFieldInputHandle | null) => {
                      if (handle) mathRefs.current.set(v.label, handle);
                      else        mathRefs.current.delete(v.label);
                    }}
                    value={values[v.label]?.value ?? ''}
                    onChange={(val: string) => handleChange(v.label, 'value', val)}
                    onEnter={handleCheck}
                    readOnly={isComplete}
                  />

                  {!isComplete && (
                    <button
                      type="button"
                      title="Clear"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        mathRefs.current.get(v.label)?.clear();
                      }}
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded p-0.5 transition-colors"
                    >
                      <span className="text-xs leading-none">✕</span>
                    </button>
                  )}
                </div>

                {showUnitField && (
                  <Input
                    value={values[v.label]?.unit || ""}
                    onChange={(e) => handleChange(v.label, "unit", e.target.value)}
                    disabled={isComplete}
                    placeholder="Unit"
                    className={cn(
                      STEP_ANSWER_FIELD_TEXT,
                      "w-20 shrink-0",
                      isGreen  && "border-success bg-success/10",
                      hasError && "border-destructive bg-destructive/10",
                    )}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-2">
        {!isComplete && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleCheck}>Check</Button>
            <button
              type="button"
              title="Toggle math toolbar"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowToolbar((s) => !s);
              }}
              className={cn(
                "text-xs font-mono px-1 py-0.5 rounded leading-none transition-colors",
                showToolbar ? FX_TOGGLE_ACTIVE : FX_TOGGLE_IDLE,
              )}
            >
              fx
            </button>
          </div>
        )}
        {showToolbar && !isComplete && <MathToolbar onInsert={insertAtCursor} />}
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
