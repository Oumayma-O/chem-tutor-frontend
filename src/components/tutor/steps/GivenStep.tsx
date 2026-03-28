import React from "react";
import { InputField, SolutionStep } from "@/types/chemistry";
import { StepBadge } from "./StepBadge";
import { formatMathContent, MathText } from "@/lib/mathDisplay";
import { ExplanationToggle } from "./ExplanationToggle";

interface GivenStepProps {
  step: SolutionStep;
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  const leadingWs = text.match(/^\s*/)?.[0] ?? "";
  const rest = text.slice(leadingWs.length);
  if (!rest) return text;
  const first = rest[0];
  if (/[a-z]/.test(first)) return `${leadingWs}${first.toUpperCase()}${rest.slice(1)}`;
  return text;
}

function formatInputFields(fields: InputField[]): React.ReactNode {
  return (
    <div className="flex flex-col gap-2 text-foreground">
      {fields.map((field, idx) => {
        const valueAndUnit = [field.value?.trim() || "", field.unit?.trim() || ""].filter(Boolean).join(" ");
        return (
          <div key={`${field.label}-${idx}`} className="leading-relaxed">
            <span className="font-medium text-muted-foreground">
              {capitalizeFirst((field.label ?? "").trim())}:
            </span>{" "}
            <span className="equation">
              {formatMathContent(valueAndUnit || "—", { mode: "equation" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}


function formatComparison(
  comparisonParts: string[],
  correctAnswer: string,
): React.ReactNode {
  const first = comparisonParts[0];
  const second = comparisonParts[1];
  if (first == null || second == null) return null;
  const operator = correctAnswer.trim();
  const structured = `${first} ${operator} ${second}`;
  return (
    <p className="equation text-foreground" title={structured}>
      {formatMathContent(first)} {formatMathContent(operator)}{" "}
      {formatMathContent(second)}
    </p>
  );
}

export function GivenStep({ step }: GivenStepProps) {
  const parts = step.comparison_parts;
  const hasComparison =
    parts != null &&
    parts.length >= 2 &&
    Boolean(parts[0]?.trim()) &&
    Boolean(parts[1]?.trim()) &&
    step.correct_answer != null &&
    String(step.correct_answer).trim() !== "";
  const hasInputFields = step.input_fields != null && step.input_fields.length > 0;
  const hasEquationParts = step.equation_parts && step.equation_parts.length > 0;
  const answerText = capitalizeFirst((step.correct_answer ?? "").trim());
  // equation_parts takes priority over correct_answer when present — it has proper
  // LaTeX while correct_answer is plain ASCII (e.g. "m_avg = sum(m_i * f_i)").
  const content = hasComparison ? (
    formatComparison(step.comparison_parts!, step.correct_answer!)
  ) : hasInputFields ? (
    formatInputFields(step.input_fields!)
  ) : hasEquationParts ? (
    <p className="equation text-foreground font-medium leading-relaxed">
      {step.equation_parts!.map((part, i) => {
        const cleaned = part.replace(/\$/g, "");
        // Wrap in $...$ only if the part contains LaTeX notation (commands, ^ or _)
        const mathPart = /\\[a-zA-Z]|[_^]/.test(cleaned) ? `$${cleaned}$` : cleaned;
        return (
          <React.Fragment key={i}>
            {i > 0 && " "}
            <MathText>{mathPart}</MathText>
          </React.Fragment>
        );
      })}
    </p>
  ) : answerText ? (
    <p className="equation text-foreground font-medium">
      {answerText.split(", ").map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {formatMathContent(capitalizeFirst(line), { mode: "equation" })}
        </React.Fragment>
      ))}
    </p>
  ) : (
    <p className="text-muted-foreground text-sm">-</p>
  );

  return (
    <div className="step-card bg-step-given border-l-4 border-step-given-border rounded-lg p-5 shadow-step">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <StepBadge step_number={step.step_number} isGiven />
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
          {step.label}
        </span>
        <span className="text-foreground font-medium">
          {formatMathContent(
            step.instruction,
            step.instruction.length > 120 ? { preferDisplay: true } : undefined,
          )}
        </span>
      </div>
      <div className="ml-16 space-y-2">
        <div className="bg-card rounded-md p-4 border border-border">
          {content}
        </div>
        {step.explanation && <ExplanationToggle explanation={step.explanation} />}
      </div>
    </div>
  );
}

