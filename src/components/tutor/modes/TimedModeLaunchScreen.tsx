import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Zap } from "lucide-react";

interface TimedModeLaunchScreenProps {
  practiceMinutes: number;
  onDismiss: () => void;
}

export function TimedModeLaunchScreen({ practiceMinutes, onDismiss }: TimedModeLaunchScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg border-primary/30 shadow-2xl">
        <CardContent className="space-y-6 pb-8 pt-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Timer className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">Timed Practice Mode</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                ⚠️ This classroom is now in{" "}
                <span className="font-semibold text-foreground">Timed Practice Mode</span>.
              </p>
              <p>
                The Exit Ticket at the end will be{" "}
                <span className="font-semibold text-foreground">graded</span>.
              </p>
              <p>Make sure to practice through the levels before the timer ends.</p>
            </div>
            <p className="mt-4 text-base font-medium text-foreground">Stay focused. You&apos;ve got this 💙</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-lg font-bold text-primary">
            <Timer className="h-5 w-5" />
            {practiceMinutes}:00
          </div>
          <Button onClick={onDismiss} size="lg" className="gap-2 px-8">
            <Zap className="h-5 w-5" />
            I&apos;m Ready
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
