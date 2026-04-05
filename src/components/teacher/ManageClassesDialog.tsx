import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface ManageClassesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newClassName: string;
  onNewClassNameChange: (v: string) => void;
  newClassCourseType: string;
  onNewClassCourseTypeChange: (v: string) => void;
  creatingClass: boolean;
  onCreateClass: () => Promise<boolean>;
}

export function ManageClassesDialog({
  open,
  onOpenChange,
  newClassName,
  onNewClassNameChange,
  newClassCourseType,
  onNewClassCourseTypeChange,
  creatingClass,
  onCreateClass,
}: ManageClassesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage classes</DialogTitle>
          <DialogDescription>
            Create a new class. You can add multiple sections (e.g. AP Period 1, AP Period 2) after
            signing in — each gets its own code for students.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Class name</label>
            <Input
              value={newClassName}
              onChange={(e) => onNewClassNameChange(e.target.value)}
              placeholder="e.g., AP Chemistry Period 3"
              onKeyDown={(e) => e.key === "Enter" && void onCreateClass()}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Course type</label>
            <Select value={newClassCourseType} onValueChange={onNewClassCourseTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Course type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Chemistry</SelectItem>
                <SelectItem value="ap">AP Chemistry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            onClick={async () => {
              const ok = await onCreateClass();
              if (ok) onOpenChange(false);
            }}
            disabled={creatingClass || !newClassName.trim()}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {creatingClass ? "Creating…" : "Create class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
