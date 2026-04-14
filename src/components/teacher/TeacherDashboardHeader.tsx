import { Copy, Check, Settings, Trash2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface TeacherDashboardHeaderProps {
  classes: TeacherClassRow[];
  selectedClassId: string;
  onSelectedClassIdChange: (id: string) => void;
  selectedClass: TeacherClassRow | undefined;
  onDeleteClass: (classId: string) => void;
  onOpenManageClasses: () => void;
  /** Admin/superadmin view — hides create/delete, shows impersonated class info */
  isAdmin?: boolean;
  adminSelectedClass?: { id: string; name: string; code: string } | null;
  onBackToDirectory?: () => void;
}

export function TeacherDashboardHeader({
  classes,
  selectedClassId,
  onSelectedClassIdChange,
  selectedClass,
  onDeleteClass,
  onOpenManageClasses,
  isAdmin = false,
  adminSelectedClass,
  onBackToDirectory,
}: TeacherDashboardHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (code: string) => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Admin mode ────────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {adminSelectedClass ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1.5 text-muted-foreground"
                  onClick={onBackToDirectory}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Directory
                </Button>
                <div className="h-4 w-px bg-border shrink-0" />
                <span className="font-medium text-sm truncate">{adminSelectedClass.name}</span>
                <div className="h-4 w-px bg-border shrink-0" />
                <button
                  type="button"
                  onClick={() => handleCopy(adminSelectedClass.code)}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy class code"
                >
                  <span className="font-mono text-sm font-semibold tracking-widest text-primary">
                    {adminSelectedClass.code}
                  </span>
                  {copied
                    ? <Check className="w-3.5 h-3.5 text-success" />
                    : <Copy className="w-3.5 h-3.5" />
                  }
                </button>
                <Badge variant="secondary" className="text-xs">Read-only</Badge>
              </>
            ) : (
              <span className="text-sm text-muted-foreground italic">
                Select a class from Directory to view its data
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/30 gap-2 pr-2.5 h-7 text-xs"
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
    );
  }

  // ── Teacher mode ──────────────────────────────────────────────────────────
  return (
    <div className="border-b border-border bg-card">
      <div className="container mx-auto px-4 h-12 flex items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <>
            <Select value={selectedClassId} onValueChange={onSelectedClassIdChange}>
              <SelectTrigger className="w-[200px] min-w-[200px] h-8 text-sm shrink-0">
                <SelectValue
                  placeholder={classes.length === 0 ? "No classes yet" : "Select class"}
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

            {selectedClass && (
              <>
                <div className="h-4 w-px bg-border shrink-0" />
                <button
                  type="button"
                  onClick={() => handleCopy(selectedClass.class_code)}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy class code"
                >
                  <span className="font-mono text-sm font-semibold tracking-widest text-primary">
                    {selectedClass.class_code}
                  </span>
                  {copied
                    ? <Check className="w-3.5 h-3.5 text-success" />
                    : <Copy className="w-3.5 h-3.5" />
                  }
                </button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
                        onClick={() => onDeleteClass(selectedClass.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Class
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/30 gap-2 pr-2.5 h-7 text-xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Live Data
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={onOpenManageClasses}
          >
            <Settings className="w-3.5 h-3.5" />
            Manage classes
          </Button>
        </div>
      </div>
    </div>
  );
}
