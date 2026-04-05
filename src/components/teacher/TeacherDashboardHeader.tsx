import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeacherClassRow } from "@/hooks/useTeacherDashboardData";

interface TeacherDashboardHeaderProps {
  selectedStudent: string | null;
  onClearSelectedStudent: () => void;
  classes: TeacherClassRow[];
  selectedClassId: string;
  onSelectedClassIdChange: (id: string) => void;
}

export function TeacherDashboardHeader({
  selectedStudent,
  onClearSelectedStudent,
  classes,
  selectedClassId,
  onSelectedClassIdChange,
}: TeacherDashboardHeaderProps) {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {selectedStudent ? (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={onClearSelectedStudent}
                aria-label="Back to class overview"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            ) : (
              <div className="w-10 shrink-0" aria-hidden />
            )}
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="w-6 h-6 text-primary shrink-0" />
              <h1 className="text-xl font-bold text-foreground truncate">Teacher Analytics</h1>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-center sm:justify-end gap-3 min-w-0">
            <Select value={selectedClassId} onValueChange={onSelectedClassIdChange}>
              <SelectTrigger className="w-full sm:w-[min(100%,280px)]">
                <SelectValue
                  placeholder={
                    classes.length === 0
                      ? "No classes yet — use Manage classes"
                      : "Select class"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/30 gap-2 pr-2.5 py-1"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Live Data
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
