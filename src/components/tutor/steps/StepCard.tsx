import { cn } from "@/lib/utils";

interface StepCardProps {
  isComplete: boolean;
  isIncorrect: boolean;
  isLocked?: boolean;
  children: React.ReactNode;
}

export function StepCard({ isComplete, isIncorrect, isLocked, children }: StepCardProps) {
  return (
    <div
      className={cn(
        "step-card rounded-lg p-5 shadow-step border-l-4 transition-all duration-300",
        isComplete && "bg-step-complete border-step-complete-border",
        isIncorrect && "bg-step-interactive border-destructive",
        !isComplete && !isIncorrect && "bg-step-interactive border-step-interactive-border",
        isLocked && "opacity-50 pointer-events-none select-none grayscale-[0.2]",
      )}
    >
      {children}
    </div>
  );
}

