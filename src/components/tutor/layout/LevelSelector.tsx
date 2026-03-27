import { Level, LEVEL_CONFIGS } from "@/types/chemistry";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LevelSelectorProps {
  currentLevel: Level;
  onLevelChange: (level: Level) => void;
  isLevel3Locked?: boolean;
  masteryScore?: number;
}

export function LevelSelector({
  currentLevel,
  onLevelChange,
  isLevel3Locked = false,
}: LevelSelectorProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {LEVEL_CONFIGS.map((config) => {
          const isLocked = config.level === 3 && isLevel3Locked;

          return (
            <Tooltip key={config.level}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => !isLocked && onLevelChange(config.level)}
                  disabled={isLocked}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1.5",
                    currentLevel === config.level
                      ? "bg-primary text-primary-foreground shadow-md"
                      : isLocked
                        ? "bg-secondary/50 text-muted-foreground cursor-not-allowed opacity-60"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                  )}
                >
                  {isLocked && <Lock className="w-3 h-3" />}
                  Level {config.level}
                </button>
              </TooltipTrigger>
              {isLocked && (
                <TooltipContent>
                  <p className="text-sm">
                    Complete Level 2 correctly to unlock
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

