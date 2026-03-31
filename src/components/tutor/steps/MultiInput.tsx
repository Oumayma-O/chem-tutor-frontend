import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { InputField } from "@/types/chemistry";
import { StepCard } from "./StepCard";
import { StepHeader } from "./StepHeader";
import { CorrectFeedback } from "./CorrectFeedback";
import { StepErrorFeedback } from "./StepErrorFeedback";
import { MathToolbar } from "./MathToolbar";
import {
  STEP_ANSWER_FIELD_TEXT,
  FX_TOGGLE_ACTIVE,
  FX_TOGGLE_IDLE,
  STEP_ANSWER_FOCUS_RING,
  STEP_ANSWER_OUTLINE_NEUTRAL,
  STEP_ANSWER_OUTLINE_SUCCESS,
  STEP_ANSWER_OUTLINE_ERROR,
} from "./stepAnswerStyles";
import { MathFieldInput, type MathFieldInputHandle } from "./MathFieldInput";
import { parseDraft, saveDraft } from "./draftPersistence";

type FieldValues = Record<string, { value: string; unit: string }>;

interface DraftPayload {
  fields?: FieldValues;
  hasAttempted?: boolean;
  fieldErrors?: Record<string, boolean>;
}

function emptyFields(variables: InputField[]): FieldValues {
  return Object.fromEntries(variables.map((v) => [v.label, { value: "", unit: "" }]));
}

function normalizeAnswer(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

function fieldHasUnit(v: InputField) {
  return Boolean(v.unit?.trim());
}

/** Pure validation for multi-field numeric / unit answers. */
function validateMultiInputFields(
  variables: InputField[],
  values: FieldValues,
): { errors: Record<string, boolean>; allCorrect: boolean } {
  const errors: Record<string, boolean> = {};
  let allCorrect = true;

  variables.forEach((v) => {
    const studentVal = normalizeAnswer(values[v.label]?.value || "");
    const studentUnit = normalizeAnswer(values[v.label]?.unit || "");
    const correctVal = normalizeAnswer(v.value);
    const correctUnit = normalizeAnswer(v.unit);
    const numStudent = parseFloat(studentVal);
    const numCorrect = parseFloat(correctVal);
    const valMatch =
      !isNaN(numStudent) && !isNaN(numCorrect)
        ? Math.abs(numStudent - numCorrect) < 0.001
        : studentVal === correctVal;
    const unitMatch = !fieldHasUnit(v) ? true : studentUnit === correctUnit;
    if (!valMatch || !unitMatch) {
      errors[v.label] = true;
      allCorrect = false;
    }
  });

  return { errors, allCorrect };
}

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
  draft?: string;
  onDraftChange?: (draft: string) => void;
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
  draft,
  onDraftChange,
}: MultiInputProps) {
  const { fields: initialFields, hasAttempted: initAttempted, fieldErrors: initErrors } =
    parseDraft<DraftPayload>(draft, (raw) =>
      // Legacy: flat FieldValues stored directly
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? { fields: raw as FieldValues }
        : null,
    );

  const [values, setValues] = useState<FieldValues>(initialFields ?? emptyFields(variables));
  const [hasAttempted, setHasAttempted] = useState(initAttempted ?? false);
  const [isIncorrect,  setIsIncorrect]  = useState(() => !isComplete && (initAttempted ?? false) && Object.keys(initErrors ?? {}).length > 0);
  const [fieldErrors,  setFieldErrors]  = useState<Record<string, boolean>>(initErrors ?? {});
  const [focusedVar,   setFocusedVar]   = useState<string | null>(null);
  const [showToolbar,  setShowToolbar]  = useState(false);

  const mathRefs = useRef<Map<string, MathFieldInputHandle>>(new Map());

  const persist = useCallback(
    (fields: FieldValues, attempted: boolean, errors: Record<string, boolean>) =>
      saveDraft<DraftPayload>({ fields, hasAttempted: attempted, fieldErrors: errors }, onDraftChange),
    [onDraftChange],
  );

  const handleChange = useCallback((name: string, field: "value" | "unit", val: string) => {
    setValues((prev) => {
      const next = { ...prev, [name]: { ...prev[name], [field]: val } };
      setFieldErrors((prevErr) => {
        const nextErr = { ...prevErr };
        delete nextErr[name];
        persist(next, hasAttempted, nextErr);
        return nextErr;
      });
      return next;
    });
    setIsIncorrect(false);
  }, [hasAttempted, persist]);

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

  const handleCheck = () => {
    const { errors, allCorrect } = validateMultiInputFields(variables, values);

    setHasAttempted(true);
    setFieldErrors(errors);
    persist(values, true, errors);

    if (allCorrect) {
      onComplete(true);
    } else {
      setIsIncorrect(true);
      onComplete(false);
    }
  };

  return (
    <StepCard isComplete={isComplete} isIncorrect={isIncorrect}>
      <StepHeader step_number={step_number} label={label} instruction={instruction} isComplete={isComplete} />

      <div className="w-full max-w-[400px] mx-auto flex flex-col gap-3 py-2">
        {variables.map((v) => {
          const showUnitField = fieldHasUnit(v);
          const hasError      = !!fieldErrors[v.label];
          const isGreen       = isComplete || (hasAttempted && !hasError);

          return (
            <div key={v.label} className="flex flex-row items-center w-full">
              <div className="text-sm font-medium text-slate-600 w-[45%] text-right pr-4 leading-snug font-sans shrink-0">
                {v.label}:
              </div>
              <div className="flex-1 flex gap-2">
                <div
                  className={cn(
                    "relative flex-1 min-w-0 border rounded-md bg-white transition-all cursor-text",
                    STEP_ANSWER_FOCUS_RING,
                    !isGreen && !hasError && STEP_ANSWER_OUTLINE_NEUTRAL,
                    isGreen && STEP_ANSWER_OUTLINE_SUCCESS,
                    hasError && STEP_ANSWER_OUTLINE_ERROR,
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
                      isGreen && STEP_ANSWER_OUTLINE_SUCCESS,
                      hasError && STEP_ANSWER_OUTLINE_ERROR,
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
          <StepErrorFeedback
            message="Some values are incorrect. Check the highlighted fields."
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
