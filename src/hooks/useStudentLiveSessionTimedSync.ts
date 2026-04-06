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
    // Poll aggressively only while a session is active; drop to 15 s when idle
    // to avoid saturating the network with no-op requests.
    refetchInterval: (query) => {
      const phase = (query.state.data as { session_phase?: string } | undefined)?.session_phase;
      return phase && phase !== "idle" ? 4_000 : 15_000;
    },
  });

  const launchShownKeyRef = useRef<string | null>(null);
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
      const startedAt = liveSession.timed_started_at;
      const minutes = liveSession.timed_practice_minutes ?? 10;
      // The backend never auto-advances session_phase when the client-side timer expires.
      // On refresh, liveSession may still say "timed_practice" even though the timer ran out
      // long ago. Check this server-side timestamp to avoid re-trapping the student.
      const timerAlreadyExpired =
        startedAt != null &&
        (Date.now() - new Date(startedAt).getTime()) / 1000 >= minutes * 60;

      if (timerAlreadyExpired) {
        // Timer already ran out before this page load — clear all practice UI.
        // Do NOT auto-open the exit ticket here; that only happens when the backend
        // explicitly sets session_phase="exit_ticket" (teacher publishes it).
        t.setTimedModeActive(false);
        t.setShowLaunchScreen(false);
        t.setShowTransitionScreen(false);
        launchShownKeyRef.current = anchor; // mark as seen so it won't re-show
      } else {
        t.setTimedPracticeMinutes(minutes);
        t.setTimedStartedAt(startedAt ?? new Date().toISOString());
        t.setTimedModeActive(true);
        if (launchShownKeyRef.current !== anchor) {
          launchShownKeyRef.current = anchor;
          t.setShowLaunchScreen(true);
        }
      }
    }

    if (liveSession.session_phase === "exit_ticket" && id) {
      t.setTimedModeActive(false);
      t.setShowLaunchScreen(false);
      t.setShowTransitionScreen(false);
      // Do not auto-open the exit ticket overlay — student uses the Exit Ticket control when ready.
    }

    if (liveSession.session_phase === "idle") {
      t.setTimedModeActive(false);
      t.setShowLaunchScreen(false);
      t.setShowTransitionScreen(false);
      t.setTimedPracticeMinutes(null);
      t.setTimedStartedAt(null);
      launchShownKeyRef.current = null;
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
    (!liveSessionLoading &&
      Boolean(liveSession?.active_exit_ticket_id) &&
      liveSession?.session_phase !== "timed_practice");

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
