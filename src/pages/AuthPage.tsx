import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BeakerMascot } from "@/components/tutor/widgets";
import { PROFILE_INTEREST_OPTIONS } from "@/lib/profileOptions";
import { joinClassroomByCode } from "@/services/api/student";
import { PasswordInput } from "@/components/ui/password-input";

function capitalizeFirstInput(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function AuthPage() {
  const { signIn, signUp, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup — students only
  const [signupStep, setSignupStep] = useState(1);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [classCode, setClassCode] = useState("");

  // Signup Step 2 - Interests
  const [signupInterests, setSignupInterests] = useState<string[]>([]);
  const [otherInterest, setOtherInterest] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (error) {
        const msg = error.message.toLowerCase().includes("failed to fetch")
          ? "Unable to connect. Please try again."
          : error.message;
        setError(msg);
      } else toast.success("Welcome back!");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!signupName.trim()) {
      setError("Please enter your name");
      return;
    }
    setSignupStep(2);
  };

  const handleFinalSignup = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const finalInterests = [...signupInterests];
      if (otherInterest.trim() && !finalInterests.includes("other")) {
        finalInterests.push("other");
      }

      const result = await signUp(
        signupEmail,
        signupPassword,
        "student",
        signupName,
        finalInterests
      );
      if (result.error) {
        const msg = result.error.message.toLowerCase().includes("failed to fetch")
          ? "Unable to connect. Please try again."
          : result.error.message;
        setError(msg);
        return;
      }

      const userId = (result.data as { user_id?: string } | null)?.user_id;
      if (classCode.trim() && userId) {
        try {
          await joinClassroomByCode(classCode.trim(), userId);
          await refreshProfile();
          toast.success("Account created and joined class!");
        } catch {
          toast.warning("Account created, but class code was invalid. You can try again from your dashboard.");
        }
      } else {
        toast.success("Account created! You're all set.");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleInterest = (value: string) => {
    setSignupInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  };

  // Step 2 — Interests (Netflix-style)
  if (signupStep === 2) {
    return (
      <div className="min-h-screen bg-background flex flex-col overflow-y-auto p-4">
        <div className="w-full max-w-lg mx-auto space-y-3 animate-in fade-in slide-in-from-right-4 duration-300 my-auto py-2">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <BeakerMascot mood="happy" size={72} className="mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">What interests you?</h1>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              We'll use these to personalize your chemistry problems with real-world examples you care about.
            </p>
          </div>

          {/* Interest Cards Grid */}
          <div className="grid grid-cols-3 gap-2">
            {PROFILE_INTEREST_OPTIONS.filter((i) => i.value !== "other").map((interest) => (
              <button
                key={interest.value}
                type="button"
                onClick={() => toggleInterest(interest.value)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-200 hover:scale-[1.03]",
                  signupInterests.includes(interest.value)
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/30 hover:bg-secondary/30"
                )}
              >
                {signupInterests.includes(interest.value) && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
                <span className="text-xl">{interest.icon}</span>
                <span className={cn(
                  "text-xs font-medium",
                  signupInterests.includes(interest.value) ? "text-primary" : "text-muted-foreground"
                )}>
                  {interest.label}
                </span>
              </button>
            ))}
          </div>

          {/* Other - text input */}
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Something else?</Label>
            <Input
              placeholder="Type your interest..."
              value={otherInterest}
              onChange={(e) => setOtherInterest(e.target.value)}
              className="text-sm"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setSignupStep(1)}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              onClick={handleFinalSignup}
              disabled={isLoading}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
            <Button
              onClick={handleFinalSignup}
              disabled={isLoading}
              className="gap-1.5 px-6"
            >
              {isLoading ? "Creating..." : "Get Started"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center gap-2">
            <div className="w-8 h-1.5 rounded-full bg-primary/30" />
            <div className="w-8 h-1.5 rounded-full bg-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-y-auto p-4">
      <div className="w-full max-w-md mx-auto flex flex-col gap-4 my-auto py-4">
        {/* Logo */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <BeakerMascot mood="happy" size={64} />
            <h1 className="text-2xl font-bold text-foreground">Catalyst</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-powered chemistry tutoring with adaptive scaffolding
          </p>
        </div>

        <Card>
          <Tabs defaultValue="login">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" placeholder="you@school.edu" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <PasswordInput id="login-password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Log In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleStep1Next} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">Name</Label>
                    <Input
                      id="signup-name"
                      placeholder="Your name"
                      value={signupName}
                      onChange={(e) => setSignupName(capitalizeFirstInput(e.target.value))}
                      autoCapitalize="words"
                      required
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="you@school.edu" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required maxLength={255} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Password</Label>
                    <PasswordInput id="signup-password" placeholder="At least 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-class-code">
                      Classroom Code <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                    </Label>
                    <Input
                      id="signup-class-code"
                      placeholder="e.g. A2W98Y. You can also join a class later."
                      value={classCode}
                      onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                      maxLength={10}
                    />
                  </div>

                  <Button type="submit" className="w-full gap-1.5" disabled={isLoading}>
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <div className="flex justify-center gap-2 pt-1">
                    <div className="w-8 h-1.5 rounded-full bg-primary" />
                    <div className="w-8 h-1.5 rounded-full bg-border" />
                  </div>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Your data is protected with row-level security.
        </p>
      </div>
    </div>
  );
}
