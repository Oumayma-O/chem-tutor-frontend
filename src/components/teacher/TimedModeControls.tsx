import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Timer, Square, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface TimedModeControlsProps {
  classId: string;
  isTimedActive: boolean;
  practiceDuration?: number;
  startedAt?: string | null;
  activeChapterId?: string | null;
  onUpdate: () => void;
}

export function TimedModeControls({ classId, isTimedActive, practiceDuration, startedAt, activeChapterId, onUpdate }: TimedModeControlsProps) {
  const handleStop = useCallback(async () => {
    try {
      const { error } = await supabase
        .from("classes")
        .update({
          timed_mode_active: false,
          timed_started_at: null,
        })
        .eq("id", classId);

      if (error) throw error;
      toast.info("Timed mode stopped");
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error("Failed to stop timed mode");
    }
  }, [classId, onUpdate]);

  const getTimeRemaining = () => {
    if (!startedAt || !practiceDuration) return null;
    const elapsed = (Date.now() - new Date(startedAt).getTime()) / 60000;
    const remaining = Math.max(0, practiceDuration - elapsed);
    return Math.round(remaining);
  };

  const remaining = getTimeRemaining();

  if (!isTimedActive) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-primary" />
          Timed Practice Active
        </CardTitle>
        <CardDescription>
          A timed practice session is currently running.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="font-semibold text-foreground">Timed Mode Active</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Students are in timed practice mode.
            {remaining !== null && remaining > 0 && (
              <span className="font-medium text-foreground"> ~{remaining} min remaining.</span>
            )}
            {remaining === 0 && (
              <span className="font-medium text-destructive"> Time's up! Exit ticket should be active.</span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {practiceDuration && <Badge variant="outline">{practiceDuration} min session</Badge>}
            {activeChapterId && <Badge variant="secondary">{activeChapterId}</Badge>}
          </div>
        </div>
        <Button variant="destructive" onClick={handleStop} className="w-full gap-2">
          <Square className="w-4 h-4" />
          Stop Timed Mode
        </Button>
      </CardContent>
    </Card>
  );
}
