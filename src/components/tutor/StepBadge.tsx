import { cn } from "@/lib/utils";
import { StepType } from "@/types/chemistry";

interface StepBadgeProps {
  stepNumber: number;
  type: StepType;
  isComplete?: boolean;
}

export function StepBadge({ stepNumber, type, isComplete }: StepBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide",
        type === "given" && !isComplete && "bg-primary text-primary-foreground",
        type === "interactive" && !isComplete && "bg-accent text-accent-foreground",
        isComplete && "bg-success text-success-foreground"
      )}
    >
      Step {stepNumber}
    </span>
  );
}
