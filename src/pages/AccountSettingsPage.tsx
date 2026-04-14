import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiUpdateAccount } from "@/lib/api/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, Lock, CheckCircle2, AlertCircle } from "lucide-react";

// ── Inline feedback pill ───────────────────────────────────────────────────

function Feedback({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div
      className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 mt-3 ${
        type === "success"
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 shrink-0" />
      )}
      {message}
    </div>
  );
}

// ── Email section ──────────────────────────────────────────────────────────

function EmailSection({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const { refreshProfile } = useAuth();

  const mutation = useMutation({
    mutationFn: () => apiUpdateAccount({ email }),
    onSuccess: async () => {
      await refreshProfile();
      setFeedback({ type: "success", msg: "Email updated successfully." });
    },
    onError: (e: Error) =>
      setFeedback({ type: "error", msg: e.message || "Failed to update email." }),
  });

  const isDirty = email.trim() !== currentEmail;
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email address
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFeedback(null); }}
          className="max-w-sm"
          autoComplete="email"
        />
        <p className="text-[11px] text-muted-foreground">
          You will use this email to sign in.
        </p>
      </div>
      {feedback && <Feedback type={feedback.type} message={feedback.msg} />}
      <Button
        size="sm"
        onClick={() => mutation.mutate()}
        disabled={!isDirty || !isValid || mutation.isPending}
        className="min-w-[100px]"
      >
        {mutation.isPending ? "Saving…" : "Update email"}
      </Button>
    </div>
  );
}

// ── Password section ───────────────────────────────────────────────────────

function PasswordSection() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiUpdateAccount({ current_password: currentPw, new_password: newPw }),
    onSuccess: () => {
      setFeedback({ type: "success", msg: "Password changed successfully." });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    },
    onError: (e: Error) =>
      setFeedback({ type: "error", msg: e.message || "Failed to change password." }),
  });

  const mismatch = confirmPw.length > 0 && newPw !== confirmPw;
  const tooShort = newPw.length > 0 && newPw.length < 6;
  const canSubmit = currentPw.length > 0 && newPw.length >= 6 && newPw === confirmPw;

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-w-sm">
        <div className="space-y-1.5">
          <Label htmlFor="current-pw" className="text-sm font-medium text-slate-700">
            Current password
          </Label>
          <PasswordInput
            id="current-pw"
            value={currentPw}
            onChange={(e) => { setCurrentPw(e.target.value); setFeedback(null); }}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-pw" className="text-sm font-medium text-slate-700">
            New password
          </Label>
          <PasswordInput
            id="new-pw"
            value={newPw}
            onChange={(e) => { setNewPw(e.target.value); setFeedback(null); }}
            autoComplete="new-password"
            className={tooShort ? "border-red-300 focus-visible:ring-red-400" : ""}
          />
          {tooShort && (
            <p className="text-[11px] text-red-500">Minimum 6 characters.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-pw" className="text-sm font-medium text-slate-700">
            Confirm new password
          </Label>
          <PasswordInput
            id="confirm-pw"
            value={confirmPw}
            onChange={(e) => { setConfirmPw(e.target.value); setFeedback(null); }}
            autoComplete="new-password"
            className={mismatch ? "border-red-300 focus-visible:ring-red-400" : ""}
          />
          {mismatch && (
            <p className="text-[11px] text-red-500">Passwords do not match.</p>
          )}
        </div>
      </div>
      {feedback && <Feedback type={feedback.type} message={feedback.msg} />}
      <Button
        size="sm"
        onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        className="min-w-[120px]"
      >
        {mutation.isPending ? "Updating…" : "Change password"}
      </Button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  return (
    <DashboardShell>
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your login credentials.
          </p>
        </div>

        <div className="space-y-5">
          {/* Account Info */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Account Info</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Update the email address on your account.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5">
              <EmailSection currentEmail={user?.email ?? ""} />
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Security</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Choose a strong password you don't use anywhere else.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5">
              <PasswordSection />
            </CardContent>
          </Card>
        </div>
      </main>
    </DashboardShell>
  );
}
