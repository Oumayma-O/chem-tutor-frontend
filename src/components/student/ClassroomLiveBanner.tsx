import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { studentQueryKeys } from "@/lib/studentQueryKeys";
import { getMyClassroomLiveSession, liveSessionAnchorKey } from "@/services/api/classroomSession";
import {
  clearDismissedLiveBannerAnchor,
  getDismissedLiveBannerAnchor,
} from "@/lib/studentLiveBannerDismiss";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Timer } from "lucide-react";

/**
 * Shown on unit overview / home when the teacher has published an exit ticket or timed practice.
 */
export function ClassroomLiveBanner() {
  const { profile, isStudent } = useAuth();
  const [, setDismissTick] = useState(0);

  useEffect(() => {
    const onDismiss = () => setDismissTick((n) => n + 1);
    window.addEventListener("chemtutor-live-banner-dismiss", onDismiss);
    return () => window.removeEventListener("chemtutor-live-banner-dismiss", onDismiss);
  }, []);

  // SSE (opened in useStudentLiveSessionTimedSync) already updates this cache
  // key in real time. The interval here is a safety-net fallback only.
  const { data: session } = useQuery({
    queryKey:
      profile?.classroom_id != null
        ? studentQueryKeys.liveSession(profile.classroom_id)
        : ["student", "live-session", "none"],
    queryFn: getMyClassroomLiveSession,
    enabled: Boolean(isStudent && profile?.classroom_id),
    retry: false,
    refetchInterval: (query) => (query.state.status === "error" ? false : 30_000),
  });

  useEffect(() => {
    if (session?.session_phase === "idle") {
      clearDismissedLiveBannerAnchor();
    }
  }, [session?.session_phase]);

  if (!isStudent || !session?.active_exit_ticket_id) return null;
  if (session.session_phase !== "exit_ticket" && session.session_phase !== "timed_practice") return null;

  const anchor = liveSessionAnchorKey(session);
  if (getDismissedLiveBannerAnchor() === anchor) return null;

  const label =
    session.session_phase === "timed_practice"
      ? "Timed practice is active for your class."
      : "Your teacher posted an exit ticket.";

  const to =
    session.unit_id != null && session.lesson_index != null
      ? `/tutor/${session.unit_id}/${session.lesson_index}`
      : "/";

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2">
        {session.session_phase === "timed_practice" ? (
          <Timer className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        ) : (
          <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">
            Open practice for the assigned lesson to join the session.
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link to={to}>Go to practice</Link>
      </Button>
    </div>
  );
}
