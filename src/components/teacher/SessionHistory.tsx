import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Clock } from "lucide-react";
import { format, subDays } from "date-fns";
import { getClassroomSessions, type ClassroomSessionOut } from "@/services/api/teacher";
import { teacherQueryKeys } from "@/lib/teacherQueryKeys";
import { teacherQueryNoRetry } from "@/lib/teacherQueryOptions";
import { HistoryFilterBar } from "@/components/teacher/HistoryFilterBar";
import { HistoryPagination } from "@/components/teacher/HistoryPagination";
import { useUnits } from "@/hooks/useUnits";

const PAGE_SIZE = 5;

const SESSION_TYPE_LABELS: Record<string, string> = {
  timed_practice: "Timed Practice",
  exit_ticket: "Exit Ticket",
  timed_practice_with_exit: "Practice + Exit",
};

const SESSION_TYPE_BADGE_COLORS: Record<string, string> = {
  timed_practice: "bg-blue-100 text-blue-700 border-blue-200 border",
  exit_ticket: "bg-violet-100 text-violet-700 border-violet-200 border",
  timed_practice_with_exit: "bg-indigo-100 text-indigo-700 border-indigo-200 border",
};

interface SessionHistoryProps {
  classId: string;
  onSelectSession?: (session: ClassroomSessionOut | null) => void;
  selectedSessionIdFromParent?: string | null;
}

export function SessionHistory({
  classId,
  onSelectSession,
  selectedSessionIdFromParent,
}: SessionHistoryProps) {
  const [dateRange, setDateRange] = useState("30");
  const [lessonFilter, setLessonFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { units } = useUnits();

  useEffect(() => {
    if (selectedSessionIdFromParent === undefined) return;
    setSelectedId(selectedSessionIdFromParent);
  }, [selectedSessionIdFromParent]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [dateRange, lessonFilter]);

  const { data: sessions, isLoading, isError } = useQuery({
    queryKey: teacherQueryKeys.sessions(classId, 100),
    queryFn: () => getClassroomSessions(classId, 100),
    enabled: Boolean(classId),
    staleTime: 30_000,
    ...teacherQueryNoRetry,
  });

  const lessonOptions = useMemo(() => {
    if (!sessions) return [];
    const seen = new Map<string, string>();
    for (const s of sessions) {
      const key = `${s.unit_id}__${s.lesson_index}`;
      if (!seen.has(key)) {
        const unit = units.find((u) => u.id === s.unit_id);
        const lessonTitle = unit?.lesson_titles?.[s.lesson_index];
        const label = lessonTitle
          ? `L${s.lesson_index + 1}: ${lessonTitle}`
          : `${s.unit_id} · L${s.lesson_index + 1}`;
        seen.set(key, label);
      }
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [sessions, units]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    let result = sessions;
    if (dateRange !== "all") {
      const cutoff = subDays(new Date(), Number(dateRange));
      result = result.filter((s) => new Date(s.started_at) >= cutoff);
    }
    if (lessonFilter) {
      const [filterUnit, filterIdx] = lessonFilter.split("__");
      result = result.filter(
        (s) => s.unit_id === filterUnit && String(s.lesson_index) === filterIdx,
      );
    }
    return result;
  }, [sessions, dateRange, lessonFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleRowClick = (session: ClassroomSessionOut) => {
    const next = selectedId === session.id ? null : session.id;
    setSelectedId(next);
    onSelectSession?.(next ? session : null);
  };

  const hasActiveFilter = dateRange !== "30" || Boolean(lessonFilter);

  return (
    <div className="flex flex-col w-full border bg-white dark:bg-card rounded-xl shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2 mb-1">
          <History className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">Session History</h3>
        </div>
        <p className="text-sm text-slate-500 mt-1 mb-3">Past timed practice and exit ticket sessions.</p>
        <HistoryFilterBar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          lessonOptions={lessonOptions}
          lessonFilter={lessonFilter}
          onLessonFilterChange={setLessonFilter}
          hasActiveFilter={hasActiveFilter}
          onClear={() => { setDateRange("30"); setLessonFilter(""); }}
        />
      </div>

      {/* ── Content ── */}
      <div className="p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : isError ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Could not load session history.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No sessions match the current filter.</p>
          </div>
        ) : (
          <>
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
                  {paginated.map((s) => {
                    const isActive = s.ended_at == null;
                    const durationMin = s.timed_practice_minutes ?? null;
                    const isSelected = selectedId === s.id;
                    const unit = units.find((u) => u.id === s.unit_id);
                    const lessonTitle = unit?.lesson_titles?.[s.lesson_index];
                    const lessonLabel = lessonTitle
                      ? `L${s.lesson_index + 1}: ${lessonTitle}`
                      : `${s.unit_id} · L${s.lesson_index + 1}`;
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
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${SESSION_TYPE_BADGE_COLORS[s.session_type] ?? "bg-gray-100 text-gray-700 border border-gray-200"}`}
                          >
                            {SESSION_TYPE_LABELS[s.session_type] ?? s.session_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {durationMin ? `${durationMin} min` : "–"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lessonLabel}
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

            {/* ── Pagination ── */}
            <HistoryPagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
