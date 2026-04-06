import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import { getClassroomSessions, type ClassroomSessionOut } from "@/services/api/teacher";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { teacherQueryNoRetry } from "@/lib/teacherQueryOptions";

const SESSION_TYPE_LABELS: Record<string, string> = {
  timed_practice: "Timed Practice",
  exit_ticket: "Exit Ticket",
  timed_practice_with_exit: "Practice + Exit Ticket",
};

const SESSION_TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  timed_practice: "secondary",
  exit_ticket: "outline",
  timed_practice_with_exit: "default",
};

interface SessionHistoryProps {
  classId: string;
  onSelectSession?: (session: ClassroomSessionOut | null) => void;
}

export function SessionHistory({ classId, onSelectSession }: SessionHistoryProps) {
  const [limit, setLimit] = useState("10");
  const [dateRange, setDateRange] = useState("30");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: sessions, isLoading, isError } = useQuery({
    queryKey: teacherQueryKeys.sessions(classId, Number(limit)),
    queryFn: () => getClassroomSessions(classId, Number(limit)),
    enabled: Boolean(classId),
    staleTime: 30_000,
    ...teacherQueryNoRetry,
  });

  const filtered = useMemo(() => {
    if (!sessions) return [];
    if (dateRange === "all") return sessions;
    const cutoff = subDays(new Date(), Number(dateRange));
    return sessions.filter((s) => new Date(s.started_at) >= cutoff);
  }, [sessions, dateRange]);

  const handleRowClick = (session: ClassroomSessionOut) => {
    const next = selectedId === session.id ? null : session.id;
    setSelectedId(next);
    onSelectSession?.(next ? session : null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Session History
            </CardTitle>
            <CardDescription>Past timed practice and exit ticket sessions.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Last 5</SelectItem>
                <SelectItem value="10">Last 10</SelectItem>
                <SelectItem value="20">Last 20</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : isError ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Could not load session history. The backend may need a restart.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No session history yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Chapter / Lesson</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const isActive = s.ended_at == null;
                  const durationMin = s.timed_practice_minutes ?? null;
                  const isSelected = selectedId === s.id;
                  return (
                    <TableRow
                      key={s.id}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-accent" : "hover:bg-muted/50"}`}
                      onClick={() => handleRowClick(s)}
                    >
                      <TableCell className="text-sm">
                        {format(new Date(s.started_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={SESSION_TYPE_VARIANTS[s.session_type] ?? "outline"}
                          className="text-[10px]"
                        >
                          {SESSION_TYPE_LABELS[s.session_type] ?? s.session_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {durationMin ? `${durationMin} min` : "–"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.unit_id} · L{s.lesson_index + 1}
                      </TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge variant="default" className="text-[10px] animate-pulse">
                            Active
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Ended {format(new Date(s.ended_at!), "h:mm a")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
