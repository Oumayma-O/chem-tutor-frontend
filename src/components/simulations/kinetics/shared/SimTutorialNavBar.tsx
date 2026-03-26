/**
 * Shared tutorial footer: Back | Step i of n | Next or Start Practice.
 * Last step shows the primary “Start Practice” CTA instead of Next.
 */
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SimTutorialNavBarProps {
  /** Zero-based step index. */
  tutorialStep: number;
  totalStepCount: number;
  onBack: () => void;
  /** Used when not on the last step. */
  onNext: () => void;
  onStartPractice: () => void;
  practiceButtonClassName?: string;
  nextDisabled?: boolean;
}

export function SimTutorialNavBar({
  tutorialStep,
  totalStepCount,
  onBack,
  onNext,
  onStartPractice,
  practiceButtonClassName,
  nextDisabled = false,
}: SimTutorialNavBarProps) {
  const isLastStep = tutorialStep >= Math.max(0, totalStepCount - 1);

  return (
    <div className="grid grid-cols-3 items-center gap-2 border-t border-border pt-2 shrink-0">
      <button
        type="button"
        onClick={onBack}
        disabled={tutorialStep <= 0}
        className="flex items-center gap-1 justify-self-start text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Back
      </button>

      <span className="justify-self-center text-center text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums px-1">
        Step {tutorialStep + 1} of {totalStepCount}
      </span>

      {isLastStep ? (
        <div className="justify-self-end">
          <button
            type="button"
            onClick={onStartPractice}
            data-tutorial="start-practice-button"
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-1.5 transition-colors shadow-sm",
              practiceButtonClassName,
            )}
          >
            Start Practice
            <Zap className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className={cn(
            "flex items-center gap-1 justify-self-end text-xs transition-colors",
            nextDisabled
              ? "text-muted-foreground/40 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
