import { ProgressionResult } from "@/types/chemistry";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { BeakerMascot } from "./BeakerMascot";

interface ProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ProgressionResult | null;
  masteryScore: number;
  onContinue: () => void;
  onStayAtLevel?: () => void;
  currentLevel?: 1 | 2 | 3;
}

export function ProgressionModal({
  isOpen,
  onClose,
  result,
  masteryScore,
  onContinue,
  onStayAtLevel,
  currentLevel = 2,
}: ProgressionModalProps) {
  if (!result) return null;

  const isAdvancingToLevel3 = result.should_advance && result.next_level === 3 && currentLevel === 2;
  const isLevel3Complete = currentLevel === 3;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <BeakerMascot
              pose={isAdvancingToLevel3 || isLevel3Complete ? "celebrating" : "encouraging"}
              size={72}
            />
          </div>
          <DialogTitle className="text-center">
            {isAdvancingToLevel3
              ? "Ready for Level 3!"
              : isLevel3Complete
              ? "Problem Complete!"
              : "Great Effort!"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {result.reason}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Mastery Display */}
          <div className="bg-secondary rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Current Mastery
              </span>
              <span className="text-lg font-bold text-foreground">
                {masteryScore}%
              </span>
            </div>
            <div className="w-full h-2 bg-background rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  masteryScore >= 80 && "bg-mastery-high",
                  masteryScore >= 50 && masteryScore < 80 && "bg-mastery-medium",
                  masteryScore < 50 && "bg-mastery-low"
                )}
                style={{ width: `${masteryScore}%` }}
              />
            </div>
          </div>

          {/* Next Step Info */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3">
              {isAdvancingToLevel3 ? (
                <Sparkles className="w-5 h-5 text-success" />
              ) : (
                <ArrowRight className="w-5 h-5 text-primary" />
              )}
              <div>
                <p className="font-medium text-foreground">
                  {isAdvancingToLevel3
                    ? `Level 3: ${result.suggested_difficulty} difficulty`
                    : isLevel3Complete
                    ? "Try another independent problem"
                    : "Level 2: New faded example"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isAdvancingToLevel3
                    ? "Independent practice with no scaffolding"
                    : isLevel3Complete
                    ? "Difficulty adapts to your mastery level"
                    : "First 2 steps given, complete the rest"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          {/* Primary action */}
          <Button onClick={onContinue} className="w-full gap-2">
            <ArrowRight className="w-4 h-4" />
            {isAdvancingToLevel3
              ? "Advance to Level 3"
              : isLevel3Complete
              ? "Solve Another Problem"
              : "Try New Problem"}
          </Button>

          {/* Secondary: stay at current level for more practice */}
          {isAdvancingToLevel3 && onStayAtLevel && (
            <Button
              variant="outline"
              onClick={onStayAtLevel}
              className="w-full gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Practice Another Level 2 First
            </Button>
          )}

          {isLevel3Complete && onStayAtLevel && (
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full text-muted-foreground"
            >
              I'm done for now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
