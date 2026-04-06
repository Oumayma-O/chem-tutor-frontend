import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";
import { useTeacherPracticeAnalyticsSSE } from "@/hooks/useTeacherDashboardSSE";
import { getTimedPracticeAnalytics } from "@/services/api/teacher";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { teacherQueryNoRetry } from "@/lib/teacherQueryOptions";

interface TimedPracticeAnalyticsPanelProps {
  classId: string;
  sessionId: string;
  isActive: boolean;
}

const LEVELS = [1, 2, 3] as const;

export function TimedPracticeAnalyticsPanel({
  classId,
  sessionId,
  isActive,
}: TimedPracticeAnalyticsPanelProps) {
  useTeacherPracticeAnalyticsSSE({
    classId,
    sessionId,
    enabled: Boolean(classId && sessionId && isActive),
  });

  const { data, isLoading } = useQuery({
    queryKey: teacherQueryKeys.practiceAnalytics(classId, sessionId),
    queryFn: () => getTimedPracticeAnalytics(classId, sessionId),
    enabled: Boolean(classId && sessionId),
    ...teacherQueryNoRetry,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Loading practice analytics…
        </CardContent>
      </Card>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No practice attempts recorded for this session yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4.5 w-4.5 text-primary" />
          Timed Practice Analytics
          {isActive && (
            <Badge variant="default" className="ml-1 text-[10px] animate-pulse">
              LIVE
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Per-student breakdown by level · {data.rows.length} student{data.rows.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                {LEVELS.map((lvl) => (
                  <TableHead key={lvl} className="text-center">
                    L{lvl} Problems
                  </TableHead>
                ))}
                <TableHead className="text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.student_id}>
                  <TableCell className="font-medium text-sm">
                    {row.student_name ?? row.student_id.slice(0, 8)}
                  </TableCell>
                  {LEVELS.map((lvl) => {
                    const stats = row.levels[lvl];
                    if (!stats || stats.count === 0) {
                      return (
                        <TableCell key={lvl} className="text-center text-xs text-muted-foreground">
                          —
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell key={lvl} className="text-center">
                        <span className="text-sm font-medium">{stats.count}</span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({Math.round(stats.avg_score)}%)
                        </span>
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">
                      {row.total_count}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
