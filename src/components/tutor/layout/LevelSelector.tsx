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
  /** Level 2 requires enough unique Level 1 worked examples (classroom / server policy). */
  isLevel2Locked?: boolean;
  /** Shown in the Level 2 lock tooltip; defaults to 2 when omitted. */
  minLevel1ExamplesForLevel2?: number;
  isLevel3Locked?: boolean;
  masteryScore?: number;
}

export function LevelSelector({
  currentLevel,
  onLevelChange,
  isLevel2Locked = false,
  minLevel1ExamplesForLevel2 = 2,
  isLevel3Locked = false,
}: LevelSelectorProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {LEVEL_CONFIGS.map((config) => {
          const isLocked =
            (config.level === 2 && isLevel2Locked) || (config.level === 3 && isLevel3Locked);
          const lockReason =
            config.level === 2 && isLevel2Locked
              ? `View at least ${minLevel1ExamplesForLevel2} worked examples in Level 1 to unlock Level 2 Practice.`
              : config.level === 3 && isLevel3Locked
                ? "Complete Level 2 correctly to unlock"
                : null;

          return (
            <Tooltip key={config.level}>
              <TooltipTrigger asChild>
                {/* Span wrapper so tooltips work when the inner button is disabled. */}
                <span className="inline-flex rounded-lg">
                  <button
                    type="button"
                    onClick={() => !isLocked && onLevelChange(config.level)}
                    disabled={isLocked}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-1.5",
                      currentLevel === config.level
                        ? "bg-primary text-primary-foreground shadow-md"
                        : isLocked
                          ? "bg-secondary/50 text-muted-foreground cursor-not-allowed opacity-50"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                    )}
                  >
                    {isLocked && <Lock className="w-3 h-3" />}
                    Level {config.level}
                  </button>
                </span>
              </TooltipTrigger>
              {lockReason && (
                <TooltipContent>
                  <p className="text-sm max-w-xs">{lockReason}</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

