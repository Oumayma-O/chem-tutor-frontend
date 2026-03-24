import type { ReactNode } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { SkipToPracticeButton } from "./SkipToPracticeButton";

interface Props {
  onBack: () => void;
  onReset: () => void;
  onStartPractice: () => void;
  children?: ReactNode;
  practiceButtonClassName?: string;
}

export function SimControlBar({
  onBack,
  onReset,
  onStartPractice,
  children,
  practiceButtonClassName,
}: Props) {
  return (
    <div className="flex items-center gap-4 px-4 lg:px-6 py-2.5 border-b border-border bg-white dark:bg-card w-full sticky top-0 z-10 shrink-0 overflow-x-auto overflow-y-visible">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <ArrowLeft className="w-3 h-3" />
        Overview
      </button>

      {children && (
        <>
          <div className="h-4 w-px bg-border shrink-0" />
          {children}
        </>
      )}

      <div className="h-4 w-px bg-border shrink-0" />

      <button
        onClick={onReset}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <RotateCcw className="w-3 h-3" />
        Reset
      </button>

      {/* ml-auto pushes Skip to Practice to the far right */}
      <SkipToPracticeButton onClick={onStartPractice} className={practiceButtonClassName} />
    </div>
  );
}
