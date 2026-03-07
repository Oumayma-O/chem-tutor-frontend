import { ThinkingStep, ClassifiedError, ThinkingCategory } from "@/types/cognitive";
import { cn } from "@/lib/utils";
import { Brain, Calculator, Ruler, AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ThinkingTrackerProps {
  steps: ThinkingStep[];
  errors: ClassifiedError[];
  isAnalyzing: boolean;
}

const CATEGORY_CONFIG: Record<ThinkingCategory, { icon: typeof Brain; label: string; color: string }> = {
  conceptual: { icon: Brain, label: "Conceptual", color: "text-purple-500 bg-purple-500/10 border-purple-500/30" },
  procedural: { icon: Calculator, label: "Procedural", color: "text-blue-500 bg-blue-500/10 border-blue-500/30" },
  units: { icon: Ruler, label: "Units", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
};

const SEVERITY_STYLES = {
  blocking: "ring-2 ring-red-500 bg-red-500/10",
  slowing: "ring-2 ring-yellow-500 bg-yellow-500/10",
  minor: "ring-1 ring-green-500/50 bg-green-500/5",
};

export function ThinkingTracker({ steps, errors, isAnalyzing }: ThinkingTrackerProps) {
  const getErrorForStep = (stepId: string) => errors.find(e => e.stepId === stepId);

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Thinking Tracker
        </h4>
        {isAnalyzing && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Analyzing...
          </div>
        )}
      </div>

      {steps.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Start solving to track your thinking process...
        </p>
      ) : (
        <div className="space-y-2">
          {steps.map((step) => {
            const config = CATEGORY_CONFIG[step.category];
            const Icon = config.icon;
            const error = getErrorForStep(step.id);

            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-md border transition-all cursor-pointer hover:border-primary/50",
                      config.color,
                      error && SEVERITY_STYLES[error.severity]
                    )}
                  >
                    <div className="flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">{step.label}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {config.label}
                        </Badge>
                      </div>
                      {step.studentInput && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          "{step.studentInput}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {step.timeSpent}s
                      </span>
                      {step.isCorrect === true && (
                        <CheckCircle className="w-4 h-4 text-success" />
                      )}
                      {step.isCorrect === false && (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  {error ? (
                    <div className="space-y-1">
                      <p className="font-medium text-destructive">
                        {error.severity === "blocking" ? "🔴" : error.severity === "slowing" ? "🟡" : "🟢"} {error.category.charAt(0).toUpperCase() + error.category.slice(1)} Error
                      </p>
                      <p className="text-xs">{error.description}</p>
                      {error.conceptMissing && (
                        <p className="text-xs text-muted-foreground">Missing: {error.conceptMissing}</p>
                      )}
                    </div>
                  ) : step.isCorrect ? (
                    <p className="text-success">Correctly completed!</p>
                  ) : (
                    <p className="text-muted-foreground">Step in progress...</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}

      {/* Category Legend */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
        {Object.entries(CATEGORY_CONFIG).map(([key, { icon: Icon, label }]) => (
          <div key={key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Icon className="w-3 h-3" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
