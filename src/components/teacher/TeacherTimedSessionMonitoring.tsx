import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Activity, Send } from "lucide-react";
import { useTeacherExitTicketsSSE } from "@/hooks/useTeacherDashboardSSE";
import { useTeacherLivePresence } from "@/hooks/useTeacherLivePresence";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import type { LiveStudentEntry } from "@/services/api/presence";
import { getExitTicketResults } from "@/services/api/teacher";
import { refetchIntervalWhileActive, teacherQueryNoRetry } from "@/lib/teacherQueryOptions";

interface TeacherTimedSessionMonitoringProps {
  classId: string;
  enabled: boolean;
  /** When set, polls exit-ticket API for submission count for this ticket (stays in sync with students). */
  activeExitTicketId?: string | null;
}

function formatStep(stepId: string | null | undefined) {
  if (!stepId) return "—";
  const parts = stepId.split(":");
  if (parts.length >= 3) return `${parts[0]} · step`;
  return stepId.length > 48 ? `${stepId.slice(0, 45)}…` : stepId;
}

const MONITOR_EXIT_TICKET_PAGE = 1;
const MONITOR_EXIT_TICKET_LIMIT = 30;

export function TeacherTimedSessionMonitoring({
  classId,
  enabled,
  activeExitTicketId,
}: TeacherTimedSessionMonitoringProps) {
  useTeacherExitTicketsSSE({
    classId,
    page: MONITOR_EXIT_TICKET_PAGE,
    limit: MONITOR_EXIT_TICKET_LIMIT,
    unitId: "",
    lessonId: "",
    enabled: Boolean(enabled && classId && activeExitTicketId),
  });

  const { data: live = [], isLoading } = useTeacherLivePresence({
    classId,
    enabled: enabled && Boolean(classId),
  });

  const { data: ticketPage } = useQuery({
    queryKey: teacherQueryKeys.exitTickets.list(
      classId,
      MONITOR_EXIT_TICKET_PAGE,
      MONITOR_EXIT_TICKET_LIMIT,
      "",
      "",
    ),
    queryFn: () => getExitTicketResults(classId, MONITOR_EXIT_TICKET_PAGE, MONITOR_EXIT_TICKET_LIMIT),
    enabled: enabled && Boolean(classId && activeExitTicketId),
    ...teacherQueryNoRetry,
    refetchInterval: refetchIntervalWhileActive(4_000, Boolean(enabled && classId && activeExitTicketId)),
  });

  const submissionCount =
    activeExitTicketId && ticketPage?.items
      ? ticketPage.items.find((b) => b.ticket.id === activeExitTicketId)?.responses.length ?? 0
      : null;

  if (!enabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary" />
          Live monitoring
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            Students on this class heartbeat from practice (same source as presence).{" "}
            {isLoading ? "Loading…" : `${live.length} active`}
          </span>
          {activeExitTicketId && (
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <Send className="h-3.5 w-3.5 text-primary" />
              {submissionCount === null ? "Loading submissions…" : `${submissionCount} submission(s) for current ticket`}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {live.length === 0 && !isLoading ? (
          <p className="text-sm text-muted-foreground">
            No live heartbeats yet. Students appear when they open practice with a joined class.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead className="hidden md:table-cell">Step / context</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {live.map((row: LiveStudentEntry) => (
                <TableRow key={row.student_id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {row.name}
                    </div>
                    {row.email && (
                      <p className="text-xs text-muted-foreground">{row.email}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(row.last_seen_at).toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="hidden max-w-[280px] md:table-cell">
                    <Badge variant="outline" className="font-mono text-[10px] font-normal">
                      {formatStep(row.step_id)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
