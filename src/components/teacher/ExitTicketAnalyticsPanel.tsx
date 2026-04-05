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
import { Eye, Users } from "lucide-react";
import { getExitTicketResults } from "@/services/api/teacher";
import { MathText } from "@/lib/mathDisplay";

interface ExitTicketAnalyticsPanelProps {
  classId: string;
}

export function ExitTicketAnalyticsPanel({ classId }: ExitTicketAnalyticsPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["teacher", "exit-tickets", classId],
    queryFn: () => getExitTicketResults(classId),
    enabled: Boolean(classId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading exit tickets…</CardContent>
      </Card>
    );
  }

  if (!data?.items?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No exit tickets have been created for this class yet.
        </CardContent>
      </Card>
    );
  }

  const { analytics, items } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Exit Ticket Analytics
        </CardTitle>
        <CardDescription>
          {analytics.total_sessions} session(s) · {analytics.total_submissions} submission(s)
          {analytics.average_score != null && (
            <> · class avg score {Math.round(analytics.average_score * 100)}%</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {items.map((bundle) => (
          <div key={bundle.ticket.id} className="space-y-3 border rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {new Date(bundle.ticket.created_at).toLocaleString()}
              </span>
              <Badge variant="outline">{bundle.ticket.difficulty}</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Question</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundle.ticket.questions.map((q, i) => (
                  <TableRow key={q.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="text-sm">
                      <MathText>{q.prompt}</MathText>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {bundle.responses.length} student submission(s)
              {bundle.responses.map((r) => (
                <span key={r.id} className="ml-2">
                  {r.student_name ?? r.student_id.slice(0, 8)}:{" "}
                  {r.score != null ? `${Math.round(r.score * 100)}%` : "—"}
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
