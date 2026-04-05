import { Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { TeacherClassRow } from "@/hooks/useTeacherDashboardData";

interface TeacherSelectedClassBannerProps {
  selectedClass: TeacherClassRow;
  onDeleteClass: (classId: string) => void | Promise<void>;
}

export function TeacherSelectedClassBanner({ selectedClass, onDeleteClass }: TeacherSelectedClassBannerProps) {
  return (
    <div className="mb-6 p-4 bg-secondary/40 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-primary" />
        <div>
          <span className="font-semibold text-foreground">{selectedClass.name}</span>
          {selectedClass.grade_level && (
            <span className="text-sm text-muted-foreground ml-2">
              · {selectedClass.grade_level}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Class Code</span>
          <span className="font-mono font-bold text-primary text-lg tracking-widest">{selectedClass.class_code}</span>
        </div>
        <Badge variant="secondary">{selectedClass.subject}</Badge>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &quot;{selectedClass.name}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                This will archive the class and remove student access. Session history and analytics will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void onDeleteClass(selectedClass.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Class
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
