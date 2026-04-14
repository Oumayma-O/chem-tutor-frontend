import type { InputField, SolutionStep } from "@/types/chemistry";
import { capitalizeFirst } from "@/lib/capitalizeFirst";
import {
  canonicalDragDropFromParts,
  joinEquationPartsForDisplayString,
} from "@/lib/equationDragDrop";
import { combineMultiInputFieldLatex } from "@/lib/mathNormalize";

/** Same layout intent as `GivenStep` `formatInputFields`: label + value/unit per field. */
function formatMultiInputRevealFromFields(fields: InputField[]): string {
  return fields
    .map((field) => {
      const combined = combineMultiInputFieldLatex(field.value ?? "", field.unit ?? "");
      const label = capitalizeFirst((field.label ?? "").trim());
      return combined ? `${label}: ${combined}` : `${label}: —`;
    })
    .join(" · ");
}

/**
 * Text shown in “Stuck? The correct answer is: …” — matches what a **given** step would show:
 * drag_drop: ordered tokens concatenated like `GivenStep`; multi_input: label + combined LaTeX per field;
 * comparison: left, operator, right; otherwise `correct_answer`.
 */
export function correctAnswerTextForReveal(step: SolutionStep): string | undefined {
  if (step.type === "drag_drop") {
    if (step.equation_parts?.length) {
      const s = joinEquationPartsForDisplayString(step.equation_parts).trim();
      return s || undefined;
    }
    const fallback = (step.correct_equation?.trim() || canonicalDragDropFromParts(step.equation_parts)).trim();
    return fallback || undefined;
  }

  if (step.type === "multi_input" && step.input_fields?.length) {
    const s = formatMultiInputRevealFromFields(step.input_fields).trim();
    return s || undefined;
  }

  if (step.type === "comparison") {
    const parts = step.comparison_parts;
    const op = step.correct_answer?.trim();
    if (parts?.length === 2 && parts[0]?.trim() && parts[1]?.trim() && op) {
      return `${parts[0].trim()} ${op} ${parts[1].trim()}`;
    }
    return op || undefined;
  }

  return step.correct_answer?.trim() || undefined;
}
