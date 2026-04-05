import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface TimedModeTransitionScreenProps {
  onTransitionComplete: () => void;
}

/**
 * Brief handoff to the exit ticket — no numeric countdown (goes straight to the assessment).
 */
export function TimedModeTransitionScreen({ onTransitionComplete }: TimedModeTransitionScreenProps) {
  useEffect(() => {
    const t = window.setTimeout(() => {
      onTransitionComplete();
    }, 1200);
    return () => window.clearTimeout(t);
  }, [onTransitionComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg border-warning/30 shadow-2xl">
        <CardContent className="space-y-6 pb-8 pt-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">⏳ Time&apos;s Up for Practice</h2>
            <p className="text-muted-foreground">
              Opening your{" "}
              <span className="font-semibold text-foreground">graded Exit Ticket</span>…
            </p>
            <p className="text-sm text-muted-foreground">Stay calm and apply what you practiced.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
