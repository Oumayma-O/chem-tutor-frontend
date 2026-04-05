import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBackendApi } from "@/lib/api/core";
import { joinClassroomByCode, leaveCurrentClassroom } from "@/services/api/student";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, CheckCircle } from "lucide-react";

interface JoinClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: () => void;
}

export function JoinClassDialog({ open, onOpenChange, onJoined }: JoinClassDialogProps) {
  const { user, profile, refreshProfile } = useAuth();
  const hasApi = useBackendApi();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasClassroom = Boolean(profile?.classroom_id && profile?.classroom_name);
  /** While joining or showing success, do not show "current class" + leave — avoids prompting to leave mid-enrollment. */
  const showCurrentClassSection = hasClassroom && profile && !loading && !success;

  const handleLeave = async () => {
    if (!hasApi || !profile?.classroom_id || !user?.id) return;
    setLeaving(true);
    setError(null);
    try {
      await leaveCurrentClassroom(profile.classroom_id, user.id);
      await refreshProfile();
      setLeaveConfirmOpen(false);
      onJoined();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to leave classroom.");
    } finally {
      setLeaving(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !code.trim()) return;
    if (!hasApi) {
      setError("Configure VITE_API_URL so your app can reach the Chem Tutor API to join a class.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await joinClassroomByCode(code.trim(), user.id);
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => {
        onJoined();
        setCode("");
        setSuccess(false);
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join with that code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join a Classroom</DialogTitle>
            <DialogDescription>
              Enter the class code your teacher gave you to join their classroom.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {!hasApi && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm text-foreground">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Set VITE_API_URL to your Chem Tutor API base URL to enable joining.</span>
              </div>
            )}

            {showCurrentClassSection && profile && (
              <div className="space-y-2">
                <Label>Current classroom</Label>
                <div className="flex items-center justify-between rounded-md border border-border p-2.5 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {profile.classroom_name || "Classroom"}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {profile.classroom_code ?? profile.classroom_id ?? ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasApi || leaving}
                    onClick={() => setLeaveConfirmOpen(true)}
                  >
                    Leave…
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="class-code">
                {hasClassroom ? "Switch classroom code" : "Class code"}
              </Label>
              <Input
                id="class-code"
                placeholder="e.g., A1B2C3"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={10}
                className="text-center text-lg tracking-widest font-mono uppercase"
                disabled={!hasApi || loading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Successfully joined! Updating your content...</span>
              </div>
            )}

            <Button
              type="button"
              onClick={() => void handleJoin()}
              disabled={loading || !code.trim() || success || !hasApi}
              className="w-full"
            >
              {loading ? "Joining…" : hasClassroom ? "Switch classroom" : "Join classroom"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={leaveConfirmOpen}
        onOpenChange={(next) => {
          if (!leaving) setLeaveConfirmOpen(next);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this classroom?</AlertDialogTitle>
            <AlertDialogDescription>
              {profile?.classroom_name && (
                <>
                  Leave <span className="font-medium text-foreground">{profile.classroom_name}</span> before
                  joining another code, or switch by entering a new code below after leaving.
                </>
              )}
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
