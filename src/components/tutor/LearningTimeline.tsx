import { ProblemAttempt } from "@/types/cognitive";
import { cn } from "@/lib/utils";
import { Lightbulb, Layers, AlertTriangle, Clock, CheckCircle, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface LearningTimelineProps {
  attempts: ProblemAttempt[];
}

export function LearningTimeline({ attempts }: LearningTimelineProps) {
  if (attempts.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Last 5 Problems</h4>
        <p className="text-xs text-muted-foreground italic">No problem attempts yet...</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h4 className="text-sm font-semibold text-foreground mb-4">Last 5 Problems</h4>
      
      <div className="space-y-3">
        {attempts.slice(0, 5).map((attempt, index) => {
          const mostFailedStep = Object.entries(attempt.stepFailures)
            .sort(([, a], [, b]) => b - a)[0];
          
          return (
            <div 
              key={attempt.problemId + attempt.timestamp}
              className="relative pl-6 pb-3 border-l-2 border-border last:border-l-transparent"
            >
              {/* Timeline dot */}
              <div className={cn(
                "absolute left-[-5px] top-0 w-2 h-2 rounded-full",
                attempt.firstAttemptCorrect ? "bg-success" : "bg-yellow-500"
              )} />
              
              <div className="bg-secondary/30 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">
                    Problem {attempts.length - index}
                  </span>
                  <div className="flex items-center gap-2">
                    {attempt.firstAttemptCorrect ? (
                      <CheckCircle className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-yellow-500" />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(attempt.finalScore)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  {/* Hints Used */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "flex items-center gap-1 p-1.5 rounded",
                        attempt.hintsUsed > 0 ? "bg-yellow-500/10 text-yellow-600" : "bg-secondary text-muted-foreground"
                      )}>
                        <Lightbulb className="w-3 h-3" />
                        <span>{attempt.hintsUsed}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Hints used</TooltipContent>
                  </Tooltip>

                  {/* Scaffolding Level */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 p-1.5 rounded bg-secondary text-muted-foreground">
                        <Layers className="w-3 h-3" />
                        <span>L{attempt.scaffoldingLevel}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Scaffolding level</TooltipContent>
                  </Tooltip>

                  {/* Time */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 p-1.5 rounded bg-secondary text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{attempt.totalTimeSeconds}s</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Total time</TooltipContent>
                  </Tooltip>
                </div>

                {/* Most failed step */}
                {mostFailedStep && mostFailedStep[1] > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-destructive">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Most errors: Step {mostFailedStep[0].split("-").pop()}</span>
                  </div>
                )}

                {/* Error categories */}
                {attempt.errors.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[...new Set(attempt.errors.map(e => e.category))].map(cat => (
                      <span 
                        key={cat}
                        className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded-full",
                          cat === "conceptual" && "bg-purple-500/20 text-purple-600",
                          cat === "procedural" && "bg-blue-500/20 text-blue-600",
                          cat === "computational" && "bg-orange-500/20 text-orange-600",
                          cat === "representation" && "bg-pink-500/20 text-pink-600"
                        )}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
