import React from "react";
import { SolutionStep } from "@/types/chemistry";
import { StepBadge } from "./StepBadge";
import { formatMathContent } from "@/lib/mathDisplay";

interface GivenStepProps {
  step: SolutionStep;
}

/** Format labeled values as "variable = value unit" lines for read-only display. */
function formatLabeledValues(
  items: { variable: string; value: string; unit: string }[]
): React.ReactNode {
  return (
    <>
      {items.map((item, i) => (
        <React.Fragment key={item.variable}>
          {i > 0 && <br />}
          <span className="equation text-foreground">
            {formatMathContent(item.variable)} = {formatMathContent(item.value)}{" "}
            {formatMathContent(item.unit)}
          </span>
        </React.Fragment>
      ))}
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
    step.type === "comparison" &&
    step.comparisonParts &&
    step.comparisonParts.length >= 2 &&
    step.correctAnswer != null &&
    step.correctAnswer !== "";
  const hasLabeledValues = step.labeledValues && step.labeledValues.length > 0;

  const content = hasComparison ? (
    formatComparison(step.comparisonParts!, step.correctAnswer!)
  ) : hasLabeledValues ? (
    formatLabeledValues(step.labeledValues!)
  ) : (
    <p className="equation text-foreground">
      {(step.correctAnswer || "")
        .split(", ")
        .map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {formatMathContent(line)}
          </React.Fragment>
        ))}
    </p>
  );

  return (
    <div className="step-card bg-step-given border-l-4 border-step-given-border rounded-lg p-5 shadow-step">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <StepBadge stepNumber={step.stepNumber} type="given" />
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
          {step.label}
        </span>
        <span className="text-foreground font-medium">{formatMathContent(step.instruction)}</span>
      </div>
      <div className="ml-16 bg-card rounded-md p-4 border border-border">
        {content}
      </div>
    </div>
  );
}
