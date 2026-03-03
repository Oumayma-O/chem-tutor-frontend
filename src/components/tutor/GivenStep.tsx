import { SolutionStep } from "@/types/chemistry";
import { StepBadge } from "./StepBadge";

interface GivenStepProps {
  step: SolutionStep;
}

export function GivenStep({ step }: GivenStepProps) {
  return (
    <div className="step-card bg-step-given border-l-4 border-step-given-border rounded-lg p-5 shadow-step">
      <div className="flex items-start gap-3 mb-3">
        <StepBadge stepNumber={step.stepNumber} type="given" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
            {step.label}
          </span>
          <span className="text-foreground font-medium">{step.instruction}</span>
        </div>
      </div>
      <div className="ml-16 bg-card rounded-md p-4 border border-border">
        <p className="equation text-foreground whitespace-pre-line">
          {step.content?.replace(/, /g, "\n")}
        </p>
      </div>
    </div>
  );
}
