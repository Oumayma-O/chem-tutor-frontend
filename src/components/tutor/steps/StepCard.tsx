import { cn } from "@/lib/utils";

interface StepCardProps {
  isComplete: boolean;
  isIncorrect: boolean;
  children: React.ReactNode;
}

export function StepCard({ isComplete, isIncorrect, children }: StepCardProps) {
  return (
    <div
      className={cn(
        "step-card rounded-lg p-5 shadow-step border-l-4 transition-all",
        isComplete && "bg-step-complete border-step-complete-border",
        isIncorrect && "bg-step-interactive border-destructive",
        !isComplete && !isIncorrect && "bg-step-interactive border-step-interactive-border",
      )}
    >
      {children}
    </div>
  );
}

