import { StepBadge } from "./StepBadge";
import { formatMathContent } from "@/lib/mathDisplay";

interface StepHeaderProps {
  step_number: number;
  label: string;
  instruction: string;
  isComplete: boolean;
}

export function StepHeader({ step_number, label, instruction, isComplete }: StepHeaderProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-3">
      <StepBadge step_number={step_number} type="interactive" isComplete={isComplete} />
      <span className="text-xs font-semibold text-accent-foreground bg-accent px-2 py-0.5 rounded">
        {label}
      </span>
      <span className="text-foreground font-medium">{formatMathContent(instruction)}</span>
    </div>
  );
}
