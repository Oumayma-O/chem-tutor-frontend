import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeacherLivePresence } from "@/hooks/useTeacherLivePresence";

interface LiveSessionPanelProps {
  classId: string;
  totalStudents: number;
  onStudentClick?: (studentId: string) => void;
}

/** Live presence: SSE + polling live in `TeacherDashboardPage` via `useTeacherLivePresence` (shared cache key). */
export function LiveSessionPanel({ classId, totalStudents, onStudentClick }: LiveSessionPanelProps) {
  const { data: liveRows = [], isFetching } = useTeacherLivePresence({ classId });

  const now = Date.now();
  const onlineThreshold = 90 * 1000;

  const onlineStudents = liveRows.filter(
    (s) => now - new Date(s.last_seen_at).getTime() < onlineThreshold,
  );
  const offlineStudents = liveRows.filter(
    (s) => now - new Date(s.last_seen_at).getTime() >= onlineThreshold,
  );

  const onlineCount = onlineStudents.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wifi className={cn("w-5 h-5 text-primary", isFetching && "opacity-70")} />
          Live Session
        </CardTitle>
        <CardDescription>
          <span className="font-semibold text-foreground">{onlineCount}</span>/{totalStudents} students
          active (last 60s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {liveRows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No student activity yet. Students send a heartbeat while in a lesson (about every 30s).
          </p>
        ) : (
          <div className="max-h-[200px] overflow-y-auto pr-2 space-y-1.5">
            {[...onlineStudents, ...offlineStudents].map((student) => {
              const isOnline = now - new Date(student.last_seen_at).getTime() < onlineThreshold;
              return (
                <button
                  key={student.student_id}
                  type="button"
                  onClick={() => onStudentClick?.(student.student_id)}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        isOnline ? "bg-success" : "bg-muted-foreground/40",
                      )}
                    />
                    <span className="text-sm font-medium text-foreground truncate">
                      {student.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {student.step_id && (
                      <Badge variant="outline" className="text-[10px] max-w-[120px] truncate">
                        {student.step_id.split(":").pop()}
                      </Badge>
                    )}
                    {!isOnline && <WifiOff className="w-3 h-3 text-muted-foreground" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
