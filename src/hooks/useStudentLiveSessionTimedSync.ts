import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getMyClassroomLiveSession,
  liveSessionAnchorKey,
  postDismissLiveSessionOverlay,
} from "@/services/api/classroomSession";
import type { TutorTimedModeApi } from "@/hooks/useTutorTimedMode";

/**
 * Polls live session for students and drives timed-practice / exit-ticket overlays.
 * Keeps "opt-out" state so dismissing the exit ticket does not let the next poll re-enable timed UI
 * for the same teacher-published anchor.
 */
export function useStudentLiveSessionTimedSync(options: {
  isStudent: boolean;
  classroomId: string | undefined;
  timed: TutorTimedModeApi;
}) {
  const { isStudent, classroomId, timed } = options;
  const timedRef = useRef(timed);
  timedRef.current = timed;

  const { data: liveSession, isLoading: liveSessionLoading } = useQuery({
    queryKey: ["student", "live-session", classroomId],
    queryFn: getMyClassroomLiveSession,
    enabled: Boolean(isStudent && classroomId),
    refetchInterval: 4000,
  });

  const launchShownKeyRef = useRef<string | null>(null);
  const exitTicketAutoOpenedRef = useRef<string | null>(null);
  const timedSessionOptOutKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isStudent || !liveSession) return;
    const t = timedRef.current;
    const anchor = liveSessionAnchorKey(liveSession);

    if (timedSessionOptOutKeyRef.current && timedSessionOptOutKeyRef.current !== anchor) {
      timedSessionOptOutKeyRef.current = null;
    }
    if (timedSessionOptOutKeyRef.current === anchor) {
      const id = liveSession.active_exit_ticket_id;
      if (id) t.setTimedExitTicketConfigId(id);
      return;
    }

    const id = liveSession.active_exit_ticket_id;
    if (id) t.setTimedExitTicketConfigId(id);

    if (liveSession.session_phase === "timed_practice" && liveSession.timed_mode_active) {
      t.setTimedPracticeMinutes(liveSession.timed_practice_minutes ?? 10);
      t.setTimedStartedAt(liveSession.timed_started_at ?? new Date().toISOString());
      t.setTimedModeActive(true);
      if (launchShownKeyRef.current !== anchor) {
        launchShownKeyRef.current = anchor;
        t.setShowLaunchScreen(true);
      }
    }

    if (liveSession.session_phase === "exit_ticket" && id) {
      if (exitTicketAutoOpenedRef.current !== id) {
        exitTicketAutoOpenedRef.current = id;
        t.setTimedModeActive(false);
        t.setShowLaunchScreen(false);
        t.setShowTransitionScreen(false);
        t.setShowExitTicket(true);
      }
    }

    if (liveSession.session_phase === "idle") {
      t.setTimedModeActive(false);
    }
  }, [liveSession, isStudent]);

  const dismissExitTicketOverlays = useCallback(() => {
    const t = timedRef.current;
    if (liveSession) {
      const anchor = liveSessionAnchorKey(liveSession);
      timedSessionOptOutKeyRef.current = anchor;
      void postDismissLiveSessionOverlay(anchor).catch(() => {
        /* offline or old API — client opt-out still applies */
      });
    }
    t.setShowExitTicket(false);
    t.setTimedModeActive(false);
    t.setShowTransitionScreen(false);
    t.setShowLaunchScreen(false);
  }, [liveSession]);

  const showExitTicketAction =
    !isStudent ||
    !classroomId ||
    (!liveSessionLoading && Boolean(liveSession?.active_exit_ticket_id));

  const prefetchedExitTicket = useMemo(() => {
    const cid = timed.timedExitTicketConfigId;
    if (!cid || liveSession?.exit_ticket?.id !== cid) return undefined;
    return liveSession.exit_ticket;
  }, [timed.timedExitTicketConfigId, liveSession?.exit_ticket]);

  return {
    liveSession,
    liveSessionLoading,
    showExitTicketAction,
    dismissExitTicketOverlays,
    prefetchedExitTicket,
  };
}
