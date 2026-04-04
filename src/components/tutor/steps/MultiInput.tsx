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

function fieldHasUnit(v: InputField) {
  return Boolean(v.unit?.trim());
}

/** Strip LaTeX wrappers so the backend receives a plain numeric expression or clean unit string.
 *  "$3.60 \\times 10^{-4}$" → "3.60e-4",  "J/(mol \\cdot K)" → "J/(mol K)" */
function stripLatex(raw: string): string {
  return raw
    .replace(/\u2212/g, "-")                                             // unicode minus → ASCII hyphen
    .replace(/^\$+|\$+$/g, "")                                           // strip $...$
    .replace(/\s*\\times\s*10\s*\^\{?\s*([+-]?\d+)\s*\}?/gi, "e$1")    // \times 10^{n} → eN
    .replace(/\s*\\cdot\s*10\s*\^\{?\s*([+-]?\d+)\s*\}?/gi, "e$1")     // \cdot 10^{n} → eN
    .replace(/\\(?:text|mathrm)\{([^{}]*)\}/g, "$1")                    // \text{x} → x (keep content)
    .replace(/\\[a-zA-Z]+/g, "")                                         // remove remaining LaTeX cmds
    .replace(/[{}]/g, "")                                                 // stray braces
    .replace(/\s+/g, " ")                                                 // collapse multiple spaces
    .trim();
}

/** Serialize student field values as JSON for backend check_multi_input.
 *  Format: {"Label": {"value": "...", "unit": "..."}, ...} */
function serializeFields(variables: InputField[], fieldValues: FieldValues): string {
  const obj: Record<string, { value: string; unit: string }> = {};
  for (const v of variables) {
    obj[v.label] = {
      value: fieldValues[v.label]?.value?.trim() ?? "",
      unit: fieldValues[v.label]?.unit?.trim() ?? "",
    };
  }
  return JSON.stringify(obj);
}

/** Serialize correct answers as JSON for backend check_multi_input.
 *  LaTeX is stripped from both values and units (e.g. "s^{-1}" → "s^-1"). */
function serializeCorrect(variables: InputField[]): string {
  const obj: Record<string, { value: string; unit: string }> = {};
  for (const v of variables) {
    obj[v.label] = {
      value: stripLatex(v.value),
      unit: stripLatex(v.unit ?? ""),
    };
  }
  return JSON.stringify(obj);
}

interface MultiInputProps {
  step_number: number;
  label: string;
  instruction: string;
  variables: InputField[];
  /** Called with (studentAnswer, correctAnswer) strings — must call backend and return per-field errors. */
  onValidate: (studentAnswer: string, correctAnswer: string) => Promise<{ isCorrect: boolean; feedback?: string }>;
  onComplete: (isCorrect: boolean) => void;
  isComplete: boolean;
  isLocked?: boolean;
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
  onValidate,
  onComplete,
  isComplete,
  isLocked,
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
  const [isChecking,   setIsChecking]   = useState(false);
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

  const handleCheck = async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const studentAnswer = serializeFields(variables, values);
      const correctAnswer = serializeCorrect(variables);
      const { isCorrect, feedback } = await onValidate(studentAnswer, correctAnswer);

      // Mark all fields as errors when backend says incorrect; clear all on correct.
      // Granular per-field highlighting would require backend changes — keep it simple.
      const errors: Record<string, boolean> = isCorrect
        ? {}
        : Object.fromEntries(variables.map((v) => [v.label, true]));

      // If backend provides per-field feedback (e.g. "Field 'k1' is missing."), narrow to that field.
      if (!isCorrect && feedback) {
        const match = feedback.match(/Field '([^']+)'/);
        if (match) {
          const specific = Object.fromEntries([[match[1], true]]);
          Object.assign(errors, specific);
          // clear the rest
          variables.forEach((v) => { if (v.label !== match[1]) delete errors[v.label]; });
        }
      }

      setHasAttempted(true);
      setFieldErrors(errors);
      persist(values, true, errors);

      if (isCorrect) {
        onComplete(true);
      } else {
        setIsIncorrect(true);
        onComplete(false);
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <StepCard isComplete={isComplete} isIncorrect={isIncorrect} isLocked={isLocked}>
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
            <Button size="sm" onClick={handleCheck} disabled={isChecking}>
              {isChecking ? "Checking…" : "Check"}
            </Button>
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
