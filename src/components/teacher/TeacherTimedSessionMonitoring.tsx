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
import { Users, Activity } from "lucide-react";
import { getLiveClassStatus, type LiveStudentEntry } from "@/services/api/presence";

interface TeacherTimedSessionMonitoringProps {
  classId: string;
  enabled: boolean;
}

function formatStep(stepId: string | null | undefined) {
  if (!stepId) return "—";
  const parts = stepId.split(":");
  if (parts.length >= 3) return `${parts[0]} · step`;
  return stepId.length > 48 ? `${stepId.slice(0, 45)}…` : stepId;
}

export function TeacherTimedSessionMonitoring({ classId, enabled }: TeacherTimedSessionMonitoringProps) {
  const { data: live = [], isLoading } = useQuery({
    queryKey: ["teacher", "live", classId],
    queryFn: () => getLiveClassStatus(classId),
    enabled: enabled && Boolean(classId),
    refetchInterval: 5000,
  });

  if (!enabled) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-primary" />
          Live monitoring
        </CardTitle>
        <CardDescription>
          Students on this class heartbeat from practice (same source as presence).{" "}
          {isLoading ? "Loading…" : `${live.length} active`}
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
