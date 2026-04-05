import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, Clock, Users } from "lucide-react";
import { format } from "date-fns";

interface SessionLog {
  id: string;
  class_id: string;
  chapter_id: string | null;
  started_at: string | null;
  ended_at: string;
  duration_minutes: number | null;
  activity_type: string;
  student_count: number;
  created_at: string;
}

interface SessionHistoryProps {
  classId: string;
}

export function SessionHistory({ classId }: SessionHistoryProps) {
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState("5");
  const [dateRange, setDateRange] = useState("7");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    // TODO: Connect to FastAPI — session history for class
    setLogs([]);
    setLoading(false);
  }, [classId, limit, dateRange]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

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
        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : logs.length === 0 ? (
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
                  <TableHead>Chapter</TableHead>
                  <TableHead>Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.ended_at), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {log.activity_type === "timed_practice" ? "Timed Practice" : "Exit Ticket"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.duration_minutes ? `${log.duration_minutes} min` : "–"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.chapter_id || "–"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {log.student_count}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
