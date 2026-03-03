import { useState } from "react";
import { ReferenceStep } from "@/types/chemistry";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMathContent } from "@/lib/mathDisplay";

interface ReferencePanelProps {
  steps: ReferenceStep[];
  hideContent?: boolean; // For Level 3: show step labels but not content
  hint?: string;
}

export function ReferencePanel({ steps, hideContent, hint }: ReferencePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-reference-bg border border-reference-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-success/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-success" />
          <span className="font-semibold text-foreground">Reference Example</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      <div
        className={cn(
          "transition-all duration-300 overflow-hidden",
          isExpanded ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 pt-0 space-y-4">
          {steps.map((step) => (
            <div
              key={step.stepNumber}
              className="bg-card rounded-md p-3 border border-success/30"
            >
              <p className="text-sm font-semibold text-success mb-1">{step.title}</p>
              {!hideContent && (
                <p className="text-sm text-foreground/80 whitespace-pre-line equation">
                  {formatMathContent(step.content)}
                </p>
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground italic px-1">
            {hint ?? "Hint: This shows the general approach from Level 1. Apply it to the current problem!"}
          </p>
        </div>
      </div>
    </div>
  );
}
