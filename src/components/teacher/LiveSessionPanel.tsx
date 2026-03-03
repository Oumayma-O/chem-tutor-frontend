import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentPresence {
  user_id: string;
  display_name: string;
  last_seen_at: string;
  current_level: number;
  chapter_id: string | null;
}

interface LiveSessionPanelProps {
  classId: string;
  totalStudents: number;
  onStudentClick?: (studentId: string) => void;
}

export function LiveSessionPanel({ classId, totalStudents, onStudentClick }: LiveSessionPanelProps) {
  const [presenceData, setPresenceData] = useState<StudentPresence[]>([]);

  useEffect(() => {
    if (!classId) return;

    async function fetchPresence() {
      // Get presence rows for this class
      const { data: presence } = await supabase
        .from("student_presence" as any)
        .select("user_id, last_seen_at, current_level, chapter_id")
        .eq("class_id", classId);

      if (!presence || presence.length === 0) {
        setPresenceData([]);
        return;
      }

      const userIds = (presence as any[]).map((p: any) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.display_name]));

      setPresenceData(
        (presence as any[]).map((p: any) => ({
          user_id: p.user_id,
          display_name: profileMap.get(p.user_id) || "Unknown",
          last_seen_at: p.last_seen_at,
          current_level: p.current_level || 1,
          chapter_id: p.chapter_id,
        }))
      );
    }

    fetchPresence();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`presence-${classId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_presence", filter: `class_id=eq.${classId}` },
        () => { fetchPresence(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [classId]);

  const now = Date.now();
  const onlineThreshold = 2 * 60 * 1000; // 2 minutes

  const onlineStudents = presenceData.filter(
    s => now - new Date(s.last_seen_at).getTime() < onlineThreshold
  );
  const offlineStudents = presenceData.filter(
    s => now - new Date(s.last_seen_at).getTime() >= onlineThreshold
  );

  const onlineCount = onlineStudents.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wifi className="w-5 h-5 text-primary" />
          Live Session
        </CardTitle>
        <CardDescription>
          <span className="font-semibold text-foreground">{onlineCount}</span>/{totalStudents} students connected
        </CardDescription>
      </CardHeader>
      <CardContent>
        {presenceData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No student activity yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {[...onlineStudents, ...offlineStudents].map(student => {
              const isOnline = now - new Date(student.last_seen_at).getTime() < onlineThreshold;
              return (
                <button
                  key={student.user_id}
                  onClick={() => onStudentClick?.(student.user_id)}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-secondary/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isOnline ? "bg-success" : "bg-muted-foreground/40"
                    )} />
                    <span className="text-sm font-medium text-foreground">{student.display_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">L{student.current_level}</Badge>
                    {!isOnline && (
                      <WifiOff className="w-3 h-3 text-muted-foreground" />
                    )}
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
