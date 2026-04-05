import { CheckCircle, AlertTriangle, Trophy, Clock, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ExitTicketResult } from "@/types/cognitive";

type EndReason = "submit" | "cancel" | "time" | null;

interface ExitTicketResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentEndReason: EndReason;
  isClassMode: boolean;
  classResults: Record<string, boolean>;
  classQuestionCount: number;
  timeLimitSec: number;
  timeRemainingSec: number;
  /** When not in class mode. */
  getProblemResult: () => ExitTicketResult;
  onContinue: () => void;
}

export function ExitTicketResultsDialog({
  open,
  onOpenChange,
  assessmentEndReason,
  isClassMode,
  classResults,
  classQuestionCount,
  timeLimitSec,
  timeRemainingSec,
  getProblemResult,
  onContinue,
}: ExitTicketResultsDialogProps) {
  let score: number;
  let readyFlag: boolean;
  let timeUsed: number;
  if (isClassMode) {
    const correct = Object.values(classResults).filter(Boolean).length;
    score = classQuestionCount > 0 ? (correct / classQuestionCount) * 100 : 0;
    readyFlag = score >= 80;
    timeUsed = timeLimitSec - timeRemainingSec;
  } else {
    const r = getProblemResult();
    score = r.finalScore;
    readyFlag = r.readyFlag;
    timeUsed = r.timeSpentSeconds;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Exit Ticket Results
          </DialogTitle>
          <DialogDescription>
            {assessmentEndReason === "cancel"
              ? "You ended early — scored on what you answered."
              : assessmentEndReason === "time"
                ? "Time's up — here's how you did."
                : "Your assessment performance summary"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="py-4 text-center">
            <div
              className={cn(
                "text-5xl font-bold",
                score >= 80 ? "text-emerald-600" : score >= 60 ? "text-yellow-500" : "text-destructive",
              )}
            >
              {Math.round(score)}%
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Final Score</p>
          </div>
          <div
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg p-3",
              readyFlag ? "bg-emerald-500/10 text-emerald-700" : "bg-yellow-500/10 text-yellow-700",
            )}
          >
            {readyFlag ? (
              <>
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Ready to Progress</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">More Practice Recommended</span>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <Clock className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
              <div className="font-semibold text-foreground">{timeUsed}s</div>
              <div className="text-xs text-muted-foreground">Time Used</div>
            </div>
            <div className="rounded-lg bg-secondary/50 p-3 text-center">
              <Brain className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
              <div className="font-semibold text-foreground">{Math.round(score)}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
          </div>
          <Button className="w-full" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
