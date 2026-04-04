import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputField } from "@/types/chemistry";
import { CHEMISTRY_UNITS } from "@/data/chemistryUnits";
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
  const [openUnit,     setOpenUnit]     = useState<string | null>(null);

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

      {/* Compact form (max-width); left-aligned in the step card — matches label column edge */}
      <div className="w-full max-w-xl space-y-4 px-1 py-2">
        {variables.map((v) => {
          const showUnitField = fieldHasUnit(v);
          const hasError      = !!fieldErrors[v.label];
          const isGreen       = isComplete || (hasAttempted && !hasError);

          return (
            <div
              key={v.label}
              className={cn(
                "grid w-full min-w-0 items-center gap-4",
                "grid-cols-1",
                "sm:grid-cols-[180px_1fr]",
              )}
            >
              <div className="min-w-0 break-words text-left text-sm font-medium leading-snug text-gray-700 font-sans">
                {v.label}:
              </div>
              <div className="flex min-w-0 w-full flex-row items-center gap-2">
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
                  <Popover
                    open={openUnit === v.label}
                    onOpenChange={(o) => !isComplete && setOpenUnit(o ? v.label : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={isComplete}
                        className={cn(
                          "h-10 w-28 shrink-0 flex items-center justify-between gap-1 px-3",
                          "rounded-md border bg-white text-sm transition-all",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          STEP_ANSWER_FOCUS_RING,
                          !isGreen && !hasError && STEP_ANSWER_OUTLINE_NEUTRAL,
                          isGreen && STEP_ANSWER_OUTLINE_SUCCESS,
                          hasError && STEP_ANSWER_OUTLINE_ERROR,
                        )}
                      >
                        <span className={cn("truncate", !values[v.label]?.unit && "text-gray-400")}>
                          {values[v.label]?.unit || "Unit"}
                        </span>
                        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search units…" className="h-9" />
                        <CommandList className="max-h-[300px]">
                          <CommandEmpty>No unit found.</CommandEmpty>
                          {CHEMISTRY_UNITS.map((group) => (
                            <CommandGroup key={group.group} heading={group.group}>
                              {group.units.map((unit) => (
                                <CommandItem
                                  key={unit.value}
                                  value={unit.value}
                                  onSelect={(val) => {
                                    handleChange(v.label, "unit", val);
                                    setOpenUnit(null);
                                    mathRefs.current.get(v.label)?.focus();
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-3.5 w-3.5",
                                      values[v.label]?.unit === unit.value ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {unit.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          );
        })}

        <div className="space-y-2">
          {!isComplete && (
            <div className="flex flex-wrap items-center justify-start gap-3">
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
          {showToolbar && !isComplete && (
            <div className="flex w-full min-w-0 justify-start">
              <MathToolbar onInsert={insertAtCursor} />
            </div>
          )}
          {isComplete && <CorrectFeedback />}

          {isIncorrect && (
            <div className="w-full">
              <StepErrorFeedback
                message="Some values are incorrect. Check the highlighted fields."
                showHint={showHint}
                hintText={hintText}
                hintLoading={hintLoading}
                onRequestHint={onRequestHint}
              />
            </div>
          )}
        </div>
      </div>
    </StepCard>
  );
}
