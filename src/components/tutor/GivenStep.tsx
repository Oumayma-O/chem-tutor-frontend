import React from "react";
import { SolutionStep } from "@/types/chemistry";
import { StepBadge } from "./StepBadge";
import { formatMathContent } from "@/lib/mathDisplay";
import { ExplanationToggle } from "./ExplanationToggle";

interface GivenStepProps {
  step: SolutionStep;
}

/** Format labeled values: label outside math, only value+unit through KaTeX (avoids “Gas constant = …” as one math block). */
function formatLabeledValues(
  items: { variable: string; value: string; unit: string }[]
): React.ReactNode {
  return (
    <>
      {items.map((item, i) => {
        const rhs = `${item.value} ${item.unit || ""}`.trim();
        return (
          <React.Fragment key={item.variable}>
            {i > 0 && <br />}
            <span className="equation text-foreground">
              <span className="font-mono font-medium text-foreground">
                {formatMathContent(item.variable)}
              </span>
              {" = "}
              {formatMathContent(rhs)}
            </span>
          </React.Fragment>
        );
      })}
    </>
  );
}

/**
 * Format comparison step as a single structured string: "firstPart operator secondPart"
 * e.g. "KE in Container A < KE in Container B" or "39.95 amu > 39.10 amu"
 */
function formatComparison(
  comparisonParts: string[],
  correctAnswer: string
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

  const hasComparison =
    step.comparison_parts != null &&
    step.comparison_parts.length >= 2 &&
    step.correct_answer != null &&
    step.correct_answer !== "";
  const hasLabeledValues = step.labeled_values && step.labeled_values.length > 0;

  const answerText = (step.correct_answer ?? "").trim();
  const content = hasComparison ? (
    formatComparison(step.comparison_parts!, step.correct_answer!)
  ) : hasLabeledValues ? (
    formatLabeledValues(step.labeled_values!)
  ) : answerText ? (
    <p className="equation text-foreground font-medium">
      {answerText.split(", ").map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {formatMathContent(line)}
        </React.Fragment>
      ))}
    </p>
  ) : step.equation_parts && step.equation_parts.length > 0 ? (
    <p className="equation text-foreground font-medium">
      {formatMathContent(`$${step.equation_parts.join(" ").replace(/\$/g, "")}$`)}
    </p>
  ) : (
    <p className="text-muted-foreground text-sm">—</p>
  );

  return (
    <div className="step-card bg-step-given border-l-4 border-step-given-border rounded-lg p-5 shadow-step">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <StepBadge step_number={step.step_number} type="given" />
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
          {step.label}
        </span>
        <span className="text-foreground font-medium">{formatMathContent(step.instruction)}</span>
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
