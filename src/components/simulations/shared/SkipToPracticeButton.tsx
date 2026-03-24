import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onClick: () => void;
  className?: string;
}

export function SkipToPracticeButton({ onClick, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tutorial="practice-button"
      className={cn(
        "ml-auto shrink-0 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors",
        className,
      )}
    >
      Skip to Practice
      <ChevronRight className="w-3.5 h-3.5" />
    </button>
  );
}
