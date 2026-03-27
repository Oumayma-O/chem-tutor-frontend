import { useState } from "react";
import { ReferenceStep } from "@/types/chemistry";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMathContent } from "@/lib/mathDisplay";

const SKELETON_STEP_COUNT = 5;

interface ReferencePanelProps {
  steps: ReferenceStep[];
  hideContent?: boolean;
  hint?: string;
  isLoading?: boolean;
}

export function ReferencePanel({ steps, hideContent, hint, isLoading }: ReferencePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-reference-bg border border-reference-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-success/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="h-5 w-5 rounded bg-muted animate-pulse" aria-hidden />
          ) : (
            <BookOpen className="w-5 h-5 text-success" />
          )}
          {isLoading ? (
            <span className="inline-block font-semibold w-36 h-5 rounded bg-muted animate-pulse" aria-hidden />
          ) : (
            <span className="font-semibold text-foreground">Reference Example</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
        )}
      </button>

      <div
        className={cn(
          "transition-all duration-300 overflow-hidden",
          isExpanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="p-4 pt-0 space-y-4">
          {isLoading ? (
            <>
              {Array.from({ length: SKELETON_STEP_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-md p-3 border border-success/30"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="h-4 w-24 rounded bg-muted/80 animate-pulse mb-2" />
                  <div className="h-3 w-full rounded bg-muted/60 animate-pulse" />
                  {i % 2 === 0 && (
                    <div className="h-3 w-4/5 max-w-full rounded bg-muted/50 animate-pulse mt-1.5" />
                  )}
                </div>
              ))}
              <div className="h-3 w-3/4 rounded bg-muted/50 animate-pulse px-1" />
            </>
          ) : (
            <>
              {steps.map((step) => (
                <div
                  key={step.step_number}
                  className="bg-card rounded-md p-3 border border-success/30"
                >
                  <p className="text-sm font-semibold text-success mb-1">{step.title}</p>
                  {!hideContent && (
                    <p className="text-sm text-foreground/80 whitespace-pre-line equation">
                      {formatMathContent(step.content, { mode: "equation" })}
                    </p>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground italic px-1">
                {hint ?? "Hint: This shows the general approach from Level 1. Apply it to the current problem!"}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

