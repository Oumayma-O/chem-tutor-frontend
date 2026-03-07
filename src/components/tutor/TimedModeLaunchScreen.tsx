import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Zap } from "lucide-react";

interface TimedModeLaunchScreenProps {
  practiceMinutes: number;
  onDismiss: () => void;
}

export function TimedModeLaunchScreen({ practiceMinutes, onDismiss }: TimedModeLaunchScreenProps) {
  const [countdown, setCountdown] = useState(3);
  const [phase, setPhase] = useState<"message" | "countdown">("message");

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      onDismiss();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, onDismiss]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-primary/30 shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          {phase === "message" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Timer className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">
                  Timed Practice Mode
                </h2>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>⚠️ This classroom is now in <span className="font-semibold text-foreground">Timed Practice Mode</span>.</p>
                  <p>The Exit Ticket at the end will be <span className="font-semibold text-foreground">graded</span>.</p>
                  <p>Make sure to practice through the levels before the timer ends.</p>
                </div>
                <p className="text-base font-medium text-foreground mt-4">
                  Stay focused. You've got this 💙
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-lg font-bold text-primary">
                <Timer className="w-5 h-5" />
                {practiceMinutes}:00
              </div>
              <Button onClick={() => setPhase("countdown")} size="lg" className="gap-2 px-8">
                <Zap className="w-5 h-5" />
                I'm Ready
              </Button>
            </>
          ) : (
            <div className="py-8">
              <div className="text-8xl font-bold text-primary animate-pulse">
                {countdown}
              </div>
              <p className="text-muted-foreground mt-4">Get ready...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
