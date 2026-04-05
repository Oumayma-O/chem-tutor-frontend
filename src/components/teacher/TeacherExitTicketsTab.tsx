import { useState, useEffect, useCallback } from "react";
import { Clock } from "lucide-react";
import { ExitTicketConfigPanel } from "@/components/teacher/ExitTicketConfigPanel";
import { ExitTicketAnalyticsPanel } from "@/components/teacher/ExitTicketAnalyticsPanel";
import { TimedModeControls } from "@/components/teacher/TimedModeControls";
import { TeacherTimedSessionMonitoring } from "@/components/teacher/TeacherTimedSessionMonitoring";
import { Card, CardContent } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { CourseLevel } from "@/data/units";
import type { TeacherClassRow } from "@/hooks/useTeacherDashboardData";

/** Local timed session until GET /teacher/classes returns timed_mode_active from the API. */
type OptimisticTimedSession = {
  classId: string;
  minutes: number;
  startedAt: string;
  activeChapterId: string | null;
};

interface TeacherExitTicketsTabProps {
  selectedClassId: string;
  selectedClass: TeacherClassRow | undefined;
  detectedChapterId: string | null;
  onRefetchClasses: () => void;
}

export function TeacherExitTicketsTab({
  selectedClassId,
  selectedClass,
  detectedChapterId,
  onRefetchClasses,
}: TeacherExitTicketsTabProps) {
  const [optimisticTimed, setOptimisticTimed] = useState<OptimisticTimedSession | null>(null);

  useEffect(() => {
    setOptimisticTimed(null);
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedClass?.timed_mode_active) {
      setOptimisticTimed(null);
    }
  }, [selectedClass?.timed_mode_active]);

  const handleTimedStopped = useCallback(() => {
    setOptimisticTimed(null);
    onRefetchClasses();
  }, [onRefetchClasses]);

  const timedFromApi = selectedClass?.timed_mode_active === true;
  const timedFromOptimistic =
    optimisticTimed != null && optimisticTimed.classId === selectedClassId;
  const showTimedMonitoring = timedFromApi || timedFromOptimistic;

  const mergedPracticeMinutes = timedFromOptimistic
    ? optimisticTimed.minutes
    : (selectedClass?.timed_practice_minutes ?? undefined);
  const mergedStartedAt = timedFromOptimistic
    ? optimisticTimed.startedAt
    : (selectedClass?.timed_started_at ?? undefined);
  const mergedChapterId = timedFromOptimistic
    ? optimisticTimed.activeChapterId
    : (selectedClass?.active_chapter_id ?? undefined);

  return (
    <TabsContent value="exit-tickets" className="space-y-6">
      {selectedClassId === "all" && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a class to configure exit tickets and timed mode.</p>
          </CardContent>
        </Card>
      )}

      {selectedClassId !== "all" && showTimedMonitoring && (
        <>
          <TimedModeControls
            classId={selectedClassId}
            isTimedActive
            practiceDuration={mergedPracticeMinutes}
            startedAt={mergedStartedAt}
            activeChapterId={mergedChapterId}
            onUpdate={handleTimedStopped}
          />
          <TeacherTimedSessionMonitoring classId={selectedClassId} enabled />
        </>
      )}

      {selectedClassId !== "all" && !showTimedMonitoring && (
        <ExitTicketConfigPanel
          classId={selectedClassId}
          courseLevel={selectedClass?.grade_level as CourseLevel | undefined}
          defaultChapterId={detectedChapterId || undefined}
          onPublishSuccess={(payload) => {
            if (payload.timedPractice) {
              setOptimisticTimed({
                classId: selectedClassId,
                minutes: payload.minutes,
                startedAt: new Date().toISOString(),
                activeChapterId: payload.chapterId,
              });
            }
            onRefetchClasses();
          }}
        />
      )}

      {selectedClassId !== "all" && (
        <ExitTicketAnalyticsPanel classId={selectedClassId} />
      )}
    </TabsContent>
  );
}
