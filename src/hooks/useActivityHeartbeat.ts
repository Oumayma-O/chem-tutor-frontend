import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { post } from "@/lib/api/core";

/**
 * Sends a heartbeat ping to POST /auth/heartbeat every 60 seconds while the
 * tab is visible.  The first ping of a calendar day counts as a login;
 * subsequent pings only increment total_minutes_active on the server.
 *
 * Mount this once at the top of any authenticated shell.
 */
export function useActivityHeartbeat(): void {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const ping = () => {
      if (document.visibilityState === "visible") {
        post<void>("/auth/heartbeat", {}).catch(() => {
          // Heartbeat failures are non-critical — swallow silently.
        });
      }
    };

    // Immediate ping on mount to record the login for the day.
    ping();

    const id = setInterval(ping, 60_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);
}
