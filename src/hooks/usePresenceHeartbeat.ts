import { useEffect, useRef } from "react";
import { postPresenceHeartbeat } from "@/services/api/presence";

const INTERVAL_MS = 30_000;

/**
 * Sends POST /presence/heartbeat on an interval while the student is in a lesson.
 * Powers the teacher Live panel (polled every 10s server-side).
 */
export function usePresenceHeartbeat(
  classroomId: string | null | undefined,
  stepId: string | null | undefined,
  enabled: boolean,
): void {
  const stepRef = useRef(stepId);
  stepRef.current = stepId;

  useEffect(() => {
    if (!enabled || !classroomId) return;

    const send = () => {
      postPresenceHeartbeat({
        classroom_id: classroomId,
        step_id: stepRef.current ?? null,
      }).catch(() => {
        /* offline / 403 — ignore */
      });
    };

    send();
    const id = window.setInterval(send, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled, classroomId]);
}
