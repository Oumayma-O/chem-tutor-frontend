import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExitTicketConfigPanel } from "@/components/teacher/ExitTicketConfigPanel";
import { ExitTicketAnalyticsPanel } from "@/components/teacher/ExitTicketAnalyticsPanel";
import { ExitTicketMisconceptionPanel } from "@/components/teacher/ExitTicketMisconceptionPanel";
import { SessionHistory } from "@/components/teacher/SessionHistory";
import { TimedModeControls } from "@/components/teacher/TimedModeControls";
import { ExitTicketSessionControls } from "@/components/teacher/ExitTicketSessionControls";
import { TeacherTimedSessionMonitoring } from "@/components/teacher/TeacherTimedSessionMonitoring";
import { TimedPracticeAnalyticsPanel } from "@/components/teacher/TimedPracticeAnalyticsPanel";
import { Card, CardContent } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { CourseLevel } from "@/data/units";
import type { TeacherClassRow } from "@/hooks/useTeacherDashboardData";
import type { ClassroomSessionOut } from "@/services/api/teacher";

/** Local timed session until GET /teacher/classes returns timed_mode_active from the API. */
type OptimisticTimedSession = {
  classId: string;
  minutes: number;
  startedAt: string;
  activeChapterId: string | null;
};

/** Local exit-only session until GET /teacher/classes returns session_phase + window fields. */
type OptimisticExitTicketSession = {
  classId: string;
  ticketId: string;
  timeLimitMin: number;
  startedAt: string;
  activeChapterId: string | null;
};

interface TeacherExitTicketsTabProps {
  selectedClassId: string;
  selectedClass: TeacherClassRow | undefined;
  detectedChapterId: string | null;
  onRefetchClasses: () => void;
  /** When true (admin view): hides publish wizard, timed controls, stop buttons. */
  readOnly?: boolean;
}

export function TeacherExitTicketsTab({
  selectedClassId,
  selectedClass,
  detectedChapterId,
  onRefetchClasses,
  readOnly = false,
}: TeacherExitTicketsTabProps) {
  const [optimisticTimed, setOptimisticTimed] = useState<OptimisticTimedSession | null>(null);
  const [optimisticExit, setOptimisticExit] = useState<OptimisticExitTicketSession | null>(null);
  const [selectedSession, setSelectedSession] = useState<ClassroomSessionOut | null>(null);

  useEffect(() => {
    setOptimisticTimed(null);
    setOptimisticExit(null);
    setSelectedSession(null);
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedClass?.timed_mode_active) {
      setOptimisticTimed(null);
    }
  }, [selectedClass?.timed_mode_active]);

  useEffect(() => {
    if (selectedClass?.session_phase === "exit_ticket" && selectedClass?.active_exit_ticket_id) {
      setOptimisticExit(null);
    }
  }, [selectedClass?.session_phase, selectedClass?.active_exit_ticket_id]);

  const handleTimedStopped = useCallback(() => {
    setOptimisticTimed(null);
    onRefetchClasses();
  }, [onRefetchClasses]);

  const handleExitStopped = useCallback(() => {
    setOptimisticExit(null);
    onRefetchClasses();
  }, [onRefetchClasses]);

  const timedFromApi = selectedClass?.timed_mode_active === true;
  const timedFromOptimistic =
    optimisticTimed != null && optimisticTimed.classId === selectedClassId;
  const showTimedMonitoring = timedFromApi || timedFromOptimistic;

  const exitFromApi =
    selectedClass?.session_phase === "exit_ticket" && Boolean(selectedClass?.active_exit_ticket_id);
  const exitFromOptimistic =
    optimisticExit != null && optimisticExit.classId === selectedClassId && !showTimedMonitoring;
  const showExitOnlyMonitoring = exitFromApi || exitFromOptimistic;

  const mergedPracticeMinutes = timedFromOptimistic
    ? optimisticTimed.minutes
    : (selectedClass?.timed_practice_minutes ?? undefined);
  const mergedStartedAt = timedFromOptimistic
    ? optimisticTimed.startedAt
    : (selectedClass?.timed_started_at ?? undefined);
  const mergedChapterId = timedFromOptimistic
    ? optimisticTimed.activeChapterId
    : (selectedClass?.active_chapter_id ?? undefined);

  const mergedExitTimeLimit = exitFromOptimistic
    ? optimisticExit.timeLimitMin
    : (selectedClass?.exit_ticket_time_limit_minutes ?? undefined);
  const mergedExitWindowStart = exitFromOptimistic
    ? optimisticExit.startedAt
    : (selectedClass?.exit_ticket_window_started_at ?? undefined);
  const mergedExitChapterId = exitFromOptimistic
    ? optimisticExit.activeChapterId
    : (selectedClass?.active_chapter_id ?? undefined);

  const mergedActiveExitTicketId =
    selectedClass?.active_exit_ticket_id ?? optimisticExit?.ticketId ?? null;

  /** Only hide the generate/publish wizard when the live-session UI is actually shown (not merely stale phase flags). */
  const exitMonitoringRenderable =
    showExitOnlyMonitoring && Boolean(mergedExitTimeLimit && mergedExitWindowStart);
  const hideExitTicketWizard = showTimedMonitoring || exitMonitoringRenderable;

  const sessionPhase = selectedClass?.session_phase;
  const showLiveTopMisconceptions =
    sessionPhase === "exit_ticket" ||
    sessionPhase === "timed_practice_with_exit" ||
    // Exit-only live window before GET /teacher/classes reflects session_phase
    exitFromOptimistic;

  return (
    <TabsContent value="exit-tickets" className="space-y-6 bg-slate-50 rounded-xl p-4 -mx-4">
      {selectedClassId === "all" && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a class to configure exit tickets and timed mode.</p>
          </CardContent>
        </Card>
      )}

      {selectedClassId !== "all" && showTimedMonitoring && !readOnly && (
        <>
          <TimedModeControls
            classId={selectedClassId}
            isTimedActive
            practiceDuration={mergedPracticeMinutes}
            startedAt={mergedStartedAt}
            activeChapterId={mergedChapterId}
            onUpdate={handleTimedStopped}
          />
          <TeacherTimedSessionMonitoring
            classId={selectedClassId}
            enabled
            activeExitTicketId={mergedActiveExitTicketId}
          />
        </>
      )}

      {selectedClassId !== "all" && exitMonitoringRenderable && mergedExitTimeLimit && mergedExitWindowStart && !readOnly && (
        <>
          <ExitTicketSessionControls
            classId={selectedClassId}
            timeLimitMinutes={mergedExitTimeLimit}
            windowStartedAt={mergedExitWindowStart}
            activeChapterId={mergedExitChapterId}
            onUpdate={handleExitStopped}
          />
          <TeacherTimedSessionMonitoring
            classId={selectedClassId}
            enabled
            activeExitTicketId={mergedActiveExitTicketId}
          />
        </>
      )}

      {selectedClassId !== "all" && !hideExitTicketWizard && !readOnly && (
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
            } else {
              setOptimisticExit({
                classId: selectedClassId,
                ticketId: payload.exitTicketId,
                timeLimitMin: payload.exitTicketTimeLimitMinutes,
                startedAt: new Date().toISOString(),
                activeChapterId: payload.chapterId,
              });
            }
            onRefetchClasses();
          }}
        />
      )}

      {selectedClassId !== "all" && showLiveTopMisconceptions && mergedActiveExitTicketId && (
        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
          <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse" />
            Live Misconceptions — current exit ticket
          </p>
          <ExitTicketMisconceptionPanel
            classId={selectedClassId}
            ticketId={mergedActiveExitTicketId}
          />
        </div>
      )}

      {selectedClassId !== "all" && (
        <SessionHistory
          classId={selectedClassId}
          onSelectSession={setSelectedSession}
          selectedSessionIdFromParent={selectedSession?.id ?? null}
        />
      )}

      {selectedSession && selectedSession.session_type !== "exit_ticket" && (
        <div className="space-y-3">
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2 -ml-2 h-9 text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedSession(null)}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              Back to session history
            </Button>
          </div>
          <TimedPracticeAnalyticsPanel
            classId={selectedClassId}
            sessionId={selectedSession.id}
            isActive={selectedSession.ended_at == null}
          />
        </div>
      )}

      {selectedClassId !== "all" && (
        <ExitTicketAnalyticsPanel
          classId={selectedClassId}
          isActive
        />
      )}
    </TabsContent>
  );
}
