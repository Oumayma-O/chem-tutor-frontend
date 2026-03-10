import React, { useState } from "react";
import { SolutionStep } from "@/types/chemistry";
import { StepBadge } from "./StepBadge";
import { formatMathContent } from "@/lib/mathDisplay";
import { BookOpen } from "lucide-react";

interface GivenStepProps {
  step: SolutionStep;
}

/** Format labeled values as "variable = value unit"; one string per line so only $...$ is rendered as math. */
function formatLabeledValues(
  items: { variable: string; value: string; unit: string }[]
): React.ReactNode {
  return (
    <>
      {items.map((item, i) => {
        const mathString = `${item.variable} = ${item.value} ${item.unit || ""}`.trim();
        return (
          <React.Fragment key={item.variable}>
            {i > 0 && <br />}
            <span className="equation text-foreground">{formatMathContent(mathString)}</span>
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
  const [explanationOpen, setExplanationOpen] = useState(false);
  const hasComparison =
    step.type === "comparison" &&
    step.comparisonParts &&
    step.comparisonParts.length >= 2 &&
    step.correctAnswer != null &&
    step.correctAnswer !== "";
  const hasLabeledValues = step.labeledValues && step.labeledValues.length > 0;

  const answerText = (step.correctAnswer ?? "").trim();
  const content = hasComparison ? (
    formatComparison(step.comparisonParts!, step.correctAnswer!)
  ) : hasLabeledValues ? (
    formatLabeledValues(step.labeledValues!)
  ) : answerText ? (
    <p className="equation text-foreground font-medium">
      {answerText.split(", ").map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {formatMathContent(line)}
        </React.Fragment>
      ))}
    </p>
  ) : (
    <p className="text-muted-foreground text-sm">—</p>
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
      <div className="ml-16 space-y-2">
        <div className="bg-card rounded-md p-4 border border-border">
          {content}
        </div>
        {step.explanation && (
          <div>
            <button
              onClick={() => setExplanationOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors py-1"
              aria-expanded={explanationOpen}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>{explanationOpen ? "Hide explanation" : "Show explanation"}</span>
            </button>
            {explanationOpen && (
              <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mt-1">
                <p className="text-sm text-slate-600 leading-snug">
                  {formatMathContent(step.explanation)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
