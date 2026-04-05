import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Timer, Square, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { stopClassroomLiveSession } from "@/services/api/teacher";

interface TimedModeControlsProps {
  classId: string;
  isTimedActive: boolean;
  practiceDuration?: number;
  startedAt?: string | null;
  activeChapterId?: string | null;
  onUpdate: () => void;
}

export function TimedModeControls({ classId, isTimedActive, practiceDuration, startedAt, activeChapterId, onUpdate }: TimedModeControlsProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!isTimedActive || !startedAt || !practiceDuration) {
      setSecondsRemaining(null);
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      const remaining = Math.max(0, practiceDuration * 60 - elapsed);
      setSecondsRemaining(Math.ceil(remaining));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isTimedActive, startedAt, practiceDuration]);

  const handleStop = useCallback(async () => {
    try {
      await stopClassroomLiveSession(classId);
      toast.success("Timed mode stopped.");
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Stop failed. Deploy POST /teacher/classrooms/{id}/live-session/stop on the API.",
      );
    }
  }, [classId, onUpdate]);

  if (!isTimedActive) return null;

  const totalSeconds = (practiceDuration || 0) * 60;
  const progressPercent = totalSeconds > 0 && secondsRemaining !== null
    ? (secondsRemaining / totalSeconds) * 100
    : 100;
  const isWarning = secondsRemaining !== null && secondsRemaining <= 120 && secondsRemaining > 0;
  const isExpired = secondsRemaining === 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <Card className={cn(isWarning && "border-warning/50", isExpired && "border-destructive/50")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className={cn(
            "w-5 h-5",
            isExpired ? "text-destructive" : isWarning ? "text-warning animate-pulse" : "text-primary"
          )} />
          Timed Practice Active
        </CardTitle>
        <CardDescription>
          A timed practice session is currently running.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live countdown */}
        <div className={cn(
          "p-4 rounded-lg border",
          isExpired ? "bg-destructive/10 border-destructive/30" :
          isWarning ? "bg-warning/10 border-warning/30" :
          "bg-primary/5 border-primary/20"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isExpired ? (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5 text-warning animate-pulse" />
              ) : (
                <Timer className="w-5 h-5 text-primary" />
              )}
              <span className="font-semibold text-foreground">
                {isExpired ? "Time's Up!" : isWarning ? "Almost Done!" : "Time Remaining"}
              </span>
            </div>
            <span className={cn(
              "font-mono text-3xl font-bold tabular-nums",
              isExpired ? "text-destructive" : isWarning ? "text-warning" : "text-primary"
            )}>
              {secondsRemaining !== null ? formatTime(secondsRemaining) : "--:--"}
            </span>
          </div>
          <Progress
            value={progressPercent}
            className={cn(
              "h-2",
              isExpired && "[&>div]:bg-destructive",
              isWarning && "[&>div]:bg-warning",
            )}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {isExpired
              ? "Exit ticket should now be active for students."
              : `${practiceDuration} minute session`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {practiceDuration && <Badge variant="outline">{practiceDuration} min session</Badge>}
          {activeChapterId && <Badge variant="secondary">{activeChapterId}</Badge>}
        </div>

        <Button variant="destructive" onClick={handleStop} className="w-full gap-2">
          <Square className="w-4 h-4" />
          Stop Timed Mode
        </Button>
      </CardContent>
    </Card>
  );
}
