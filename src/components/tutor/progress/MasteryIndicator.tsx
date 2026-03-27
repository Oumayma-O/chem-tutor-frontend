import { cn } from "@/lib/utils";

interface MasteryIndicatorProps {
  score: number;
}

export function MasteryIndicator({ score }: MasteryIndicatorProps) {
  const getMasteryLevel = () => {
    if (score >= 80) return { label: "Mastered", color: "bg-mastery-high" };
    if (score >= 50) return { label: "Developing", color: "bg-mastery-medium" };
    return { label: "Learning", color: "bg-mastery-low" };
  };

  const { label, color } = getMasteryLevel();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">Mastery:</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", color)}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-foreground">{score}%</span>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            score >= 80 && "bg-success/20 text-success",
            score >= 50 && score < 80 && "bg-warning/20 text-warning",
            score < 50 && "bg-destructive/20 text-destructive",
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

