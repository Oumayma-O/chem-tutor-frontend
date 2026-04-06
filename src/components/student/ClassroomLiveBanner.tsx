import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getMyClassroomLiveSession } from "@/services/api/classroomSession";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Timer } from "lucide-react";

/**
 * Shown on unit overview / home when the teacher has published an exit ticket or timed practice.
 */
export function ClassroomLiveBanner() {
  const { profile, isStudent } = useAuth();
  const { data: session } = useQuery({
    queryKey: ["student", "live-session", profile?.classroom_id],
    queryFn: getMyClassroomLiveSession,
    enabled: Boolean(isStudent && profile?.classroom_id),
    refetchInterval: 15_000,
  });

  if (!isStudent || !session?.active_exit_ticket_id) return null;
  if (session.session_phase === "idle") return null;

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
