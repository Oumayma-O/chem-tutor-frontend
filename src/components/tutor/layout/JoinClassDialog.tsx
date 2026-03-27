import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { AlertCircle, CheckCircle } from "lucide-react";

interface JoinClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: () => void;
}

interface EnrollmentRow {
  id: string;
  class_id: string;
  classes: {
    name: string;
    class_code: string;
  } | null;
}

export function JoinClassDialog({ open, onOpenChange, onJoined }: JoinClassDialogProps) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);

  const loadEnrollments = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("class_students")
      .select("id, class_id, classes(name, class_code)")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });
    setEnrollments((data || []) as EnrollmentRow[]);
  };

  const handleRemoveEnrollment = async (enrollmentId: string) => {
    setRemovingId(enrollmentId);
    setError(null);
    try {
      const { error: deleteErr } = await supabase
        .from("class_students")
        .delete()
        .eq("id", enrollmentId);
      if (deleteErr) {
        setError("Failed to leave classroom. Please try again.");
        return;
      }
      await loadEnrollments();
      onJoined();
    } finally {
      setRemovingId(null);
    }
  };

  const handleJoin = async () => {
    if (!user || !code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { data: cls, error: lookupErr } = await supabase
        .from("classes")
        .select("id, name")
        .eq("class_code", code.trim().toUpperCase())
        .single();

      if (lookupErr || !cls) {
        setError("No classroom found with that code. Please check and try again.");
        setLoading(false);
        return;
      }

      const { data: existing } = await supabase
        .from("class_students")
        .select("id")
        .eq("class_id", cls.id)
        .eq("student_id", user.id)
        .limit(1);

      if (existing && existing.length > 0) {
        setError("You're already enrolled in this class.");
        setLoading(false);
        return;
      }

      const { data: currentRows } = await supabase
        .from("class_students")
        .select("id")
        .eq("student_id", user.id);
      if (currentRows && currentRows.length > 0) {
        const { error: deleteExistingErr } = await supabase
          .from("class_students")
          .delete()
          .eq("student_id", user.id);
        if (deleteExistingErr) {
          setError("Could not switch class. Please try again.");
          setLoading(false);
          return;
        }
      }

      const { error: enrollErr } = await supabase
        .from("class_students")
        .insert({ class_id: cls.id, student_id: user.id });

      if (enrollErr) {
        setError("Failed to join. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onJoined();
        setCode("");
        setSuccess(false);
        loadEnrollments();
      }, 1200);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user) {
      setError(null);
      setSuccess(false);
      loadEnrollments();
    }
  }, [open, user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a Classroom</DialogTitle>
          <DialogDescription>
            Enter the class code your teacher gave you to join their classroom.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {enrollments.length > 0 && (
            <div className="space-y-2">
              <Label>Current Classroom</Label>
              <div className="space-y-2">
                {enrollments.map((row) => (
                  <div key={row.id} className="flex items-center justify-between rounded-md border border-border p-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {row.classes?.name || "Classroom"}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {row.classes?.class_code || row.class_id}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removingId === row.id || loading}
                      onClick={() => handleRemoveEnrollment(row.id)}
                    >
                      {removingId === row.id ? "Leaving..." : "Unenroll"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="class-code">
              {enrollments.length > 0 ? "Switch Classroom Code" : "Class Code"}
            </Label>
            <Input
              id="class-code"
              placeholder="e.g., A1B2C3"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={10}
              className="text-center text-lg tracking-widest font-mono uppercase"
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
            onClick={handleJoin}
            disabled={loading || !code.trim() || success}
            className="w-full"
          >
            {loading ? "Updating..." : enrollments.length > 0 ? "Switch Classroom" : "Join Classroom"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

