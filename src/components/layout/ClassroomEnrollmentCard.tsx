import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBackendApi } from "@/lib/api/core";
import { leaveCurrentClassroom } from "@/services/api/student";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClassroomEnrollmentCardProps {
  /** Extra classes for the outer clickable surface */
  className?: string;
  /** Called after leave succeeds and profile refreshes */
  onLeft?: () => void;
}

/**
 * Shows enrolled classroom name + code with an "Enrolled" badge.
 * Click opens a confirmation before leaving (never leaves on card render).
 */
export function ClassroomEnrollmentCard({ className, onLeft }: ClassroomEnrollmentCardProps) {
  const { user, profile, refreshProfile } = useAuth();
  const hasApi = useBackendApi();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const enrolled = Boolean(profile?.classroom_id && profile?.classroom_name);
  if (!enrolled || !user || !profile) return null;

  const handleLeave = async () => {
    if (!profile.classroom_id || !hasApi) return;
    setLeaving(true);
    try {
      await leaveCurrentClassroom(profile.classroom_id, user.id);
      await refreshProfile();
      setConfirmOpen(false);
      toast.success("You left the classroom.");
      onLeft?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not leave classroom.");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={leaving}
        className={cn(
          "w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-left transition-colors",
          "hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30",
          leaving && "opacity-60 pointer-events-none",
          className,
        )}
      >
        <div className="flex items-start gap-2.5">
          <Users className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{profile.classroom_name}</p>
            <p className="text-[11px] text-muted-foreground font-mono tracking-wide">
              {profile.classroom_code ?? "—"}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] font-normal border-border bg-background">
            Enrolled
          </Badge>
        </div>
      </button>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!leaving) setConfirmOpen(next);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this classroom?</AlertDialogTitle>
            <AlertDialogDescription>
              You will leave <span className="font-medium text-foreground">{profile.classroom_name}</span>.
              You can join another class afterward from your profile or the account menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaving}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={leaving || !hasApi}
              onClick={() => void handleLeave()}
            >
              {leaving ? "Leaving…" : "Leave classroom"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
