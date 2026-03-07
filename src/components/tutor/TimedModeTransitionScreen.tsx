import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ArrowRight } from "lucide-react";

interface TimedModeTransitionScreenProps {
  onTransitionComplete: () => void;
}

export function TimedModeTransitionScreen({ onTransitionComplete }: TimedModeTransitionScreenProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      onTransitionComplete();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onTransitionComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-lg w-full border-warning/30 shadow-2xl">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              ⏳ Time's Up for Practice
            </h2>
            <p className="text-muted-foreground">
              You are now moving to the <span className="font-semibold text-foreground">graded Exit Ticket</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Stay calm and apply what you practiced.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl font-bold text-warning">{countdown}</span>
            <ArrowRight className="w-6 h-6 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Exit Ticket</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
