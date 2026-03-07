import { useState } from "react";
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

export function JoinClassDialog({ open, onOpenChange, onJoined }: JoinClassDialogProps) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleJoin = async () => {
    if (!user || !code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Look up class by code
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

      // Check if already enrolled
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

      // Enroll
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
      }, 1200);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

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
          <div className="space-y-2">
            <Label htmlFor="class-code">Class Code</Label>
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
            {loading ? "Joining..." : "Join Classroom"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
