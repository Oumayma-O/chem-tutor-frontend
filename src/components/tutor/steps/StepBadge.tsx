import { cn } from "@/lib/utils";

interface StepBadgeProps {
  step_number: number;
  isGiven?: boolean;
  isComplete?: boolean;
}

export function StepBadge({ step_number, isGiven, isComplete }: StepBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide",
        isGiven && !isComplete && "bg-primary text-primary-foreground",
        !isGiven && !isComplete && "bg-accent text-accent-foreground",
        isComplete && "bg-success text-success-foreground",
      )}
    >
      Step {step_number}
    </span>
  );
}

