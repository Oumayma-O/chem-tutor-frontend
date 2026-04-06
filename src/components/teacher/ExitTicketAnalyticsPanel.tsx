import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Eye, Users } from "lucide-react";
import { getExitTicketResults } from "@/services/api/teacher";
import { MathText } from "@/lib/mathDisplay";

const PAGE_SIZE = 10;

interface ExitTicketAnalyticsPanelProps {
  classId: string;
}

export function ExitTicketAnalyticsPanel({ classId }: ExitTicketAnalyticsPanelProps) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["teacher", "exit-tickets", classId, page],
    queryFn: () => getExitTicketResults(classId, page, PAGE_SIZE),
    enabled: Boolean(classId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading exit tickets…</CardContent>
      </Card>
    );
  }

  if (!data?.items?.length && page === 1) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No published exit tickets for this class yet.
        </CardContent>
      </Card>
    );
  }

  const { analytics, items, total_pages } = data!;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          Exit Ticket History
        </CardTitle>
        <CardDescription>
          {analytics.total_sessions} session(s) · {analytics.total_submissions} submission(s)
          {analytics.average_score != null && (
            <> · class avg {Math.round(analytics.average_score)}%</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {items.map((bundle) => (
          <div key={bundle.ticket.id} className="space-y-3 border rounded-lg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {new Date(bundle.ticket.published_at ?? bundle.ticket.created_at).toLocaleString()}
                </span>
                <Badge variant="outline">{bundle.ticket.difficulty}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Lesson {bundle.ticket.lesson_index + 1} · {bundle.ticket.time_limit_minutes} min
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
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
            {bundle.responses.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {bundle.responses.length} submission(s)
                </span>
                {bundle.responses.map((r) => (
                  <span key={r.id}>
                    {r.student_name ?? r.student_id.slice(0, 8)}:{" "}
                    <span className="font-medium text-foreground">
                      {r.score != null ? `${Math.round(r.score)}%` : "—"}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {total_pages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= total_pages}
              onClick={() => setPage((p) => Math.min(total_pages, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
