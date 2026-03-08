import { useState } from "react";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, User, AlertCircle, ArrowRight, ArrowLeft, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import happyMascot from "@/assets/mascot/happy.png";

const GRADE_RANGE_OPTIONS = [
  { value: "middle-school", label: "Middle School" },
  { value: "9th", label: "9th Grade" },
  { value: "10th", label: "10th Grade" },
  { value: "11th", label: "11th Grade" },
  { value: "12th", label: "12th Grade" },
];

const COURSE_TYPE_OPTIONS = [
  { value: "standard", label: "Standard Chemistry" },
  { value: "ap", label: "AP Chemistry" },
];

/** Map signup form values to backend Grade/Course names (used for profile). */
function signupGradeToProfileName(value: string): string {
  const map: Record<string, string> = {
    "middle-school": "Middle School",
    "9th": "9th Grade",
    "10th": "10th Grade",
    "11th": "11th Grade",
    "12th": "12th Grade",
  };
  return map[value] ?? value;
}
function signupCourseToProfileName(value: string): string {
  const map: Record<string, string> = {
    standard: "Standard Chemistry",
    ap: "AP Chemistry",
  };
  return map[value] ?? value;
}

const INTEREST_OPTIONS = [
  { value: "sports", label: "Sports", icon: "🏀" },
  { value: "music", label: "Music", icon: "🎵" },
  { value: "food", label: "Food & Cooking", icon: "🍕" },
  { value: "technology", label: "Technology", icon: "💻" },
  { value: "nature", label: "Nature", icon: "🌿" },
  { value: "gaming", label: "Gaming", icon: "🎮" },
  { value: "art", label: "Art & Design", icon: "🎨" },
  { value: "health", label: "Health & Medicine", icon: "🏥" },
  { value: "dance", label: "Dance", icon: "💃" },
  { value: "movies", label: "Movies & TV", icon: "🎬" },
  { value: "other", label: "Other", icon: "✨" },
];

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup Step 1
  const [signupStep, setSignupStep] = useState(1);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupRole, setSignupRole] = useState<AppRole>("student");
  const [signupGradeRange, setSignupGradeRange] = useState("");
  const [signupCourseType, setSignupCourseType] = useState("");
  const [signupClassName, setSignupClassName] = useState("");

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
    if (signupRole === "teacher" && !signupClassName.trim()) {
      setError("Please enter a class name");
      return;
    }
    // Students go to step 2 (interests), teachers skip
    if (signupRole === "student") {
      setSignupStep(2);
    } else {
      handleFinalSignup();
    }
  };

  const handleFinalSignup = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const gradeLevel = [signupGradeRange, signupCourseType]
        .filter(Boolean)
        .join(" · ") || null;

      const finalInterests = [...signupInterests];
      if (otherInterest.trim() && !finalInterests.includes("other")) {
        finalInterests.push("other");
      }

      const gradeName = signupGradeRange ? signupGradeToProfileName(signupGradeRange) : undefined;
      const courseName = signupCourseType ? signupCourseToProfileName(signupCourseType) : undefined;
      const { error } = await signUp(
        signupEmail,
        signupPassword,
        signupRole,
        signupName,
        gradeLevel || "",
        gradeName,
        courseName,
        signupClassName,
        finalInterests
      );
      if (error) {
        const msg = error.message.toLowerCase().includes("failed to fetch")
          ? "Unable to connect. Please try again."
          : error.message;
        setError(msg);
      } else toast.success("Account created! You're all set.");
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
        <div className="w-full max-w-lg mx-auto space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 my-auto py-4">
          {/* Header */}
          <div className="text-center space-y-3">
            <img src={happyMascot} alt="Catalyst mascot" className="w-24 h-24 object-contain mx-auto" />
            <h1 className="text-2xl font-bold text-foreground">What interests you?</h1>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              We'll use these to personalize your chemistry problems with real-world examples you care about.
            </p>
          </div>

          {/* Interest Cards Grid */}
          <div className="grid grid-cols-3 gap-3">
            {INTEREST_OPTIONS.filter((i) => i.value !== "other").map((interest) => (
              <button
                key={interest.value}
                type="button"
                onClick={() => toggleInterest(interest.value)}
                className={cn(
                  "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.03]",
                  signupInterests.includes(interest.value)
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/30 hover:bg-secondary/30"
                )}
              >
                {signupInterests.includes(interest.value) && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                <span className="text-2xl">{interest.icon}</span>
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
          <div className="space-y-2">
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
            <img src={happyMascot} alt="Catalyst mascot" className="w-16 h-16 object-contain" />
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
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Log In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleStep1Next} className="space-y-3">
                  {/* Role */}
                  <div className="space-y-1.5">
                    <Label>I am a</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSignupRole("student")}
                        className={cn(
                          "flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-all",
                          signupRole === "student"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <User className={cn("w-4 h-4", signupRole === "student" ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("text-sm font-medium", signupRole === "student" ? "text-primary" : "text-muted-foreground")}>Student</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignupRole("teacher")}
                        className={cn(
                          "flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 transition-all",
                          signupRole === "teacher"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30"
                        )}
                      >
                        <GraduationCap className={cn("w-4 h-4", signupRole === "teacher" ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("text-sm font-medium", signupRole === "teacher" ? "text-primary" : "text-muted-foreground")}>Teacher</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">Name</Label>
                    <Input id="signup-name" placeholder="Your name" value={signupName} onChange={(e) => setSignupName(e.target.value)} required maxLength={100} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" placeholder="you@school.edu" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required maxLength={255} />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" placeholder="At least 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} />
                  </div>

                  {/* Student optional fields */}
                  {signupRole === "student" && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="signup-grade-range">
                            Grade <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                          </Label>
                          <Select value={signupGradeRange} onValueChange={setSignupGradeRange}>
                            <SelectTrigger id="signup-grade-range">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {GRADE_RANGE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-course-type">
                            Course <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                          </Label>
                          <Select value={signupCourseType} onValueChange={setSignupCourseType}>
                            <SelectTrigger id="signup-course-type">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {COURSE_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground -mt-1">
                        Skip if unsure — we'll adapt to your level.
                      </p>
                    </>
                  )}

                  {/* Teacher: class name */}
                  {signupRole === "teacher" && (
                    <div className="space-y-2">
                      <Label htmlFor="signup-class">Class Name</Label>
                      <Input
                        id="signup-class"
                        placeholder="e.g., AP Chemistry Period 3"
                        value={signupClassName}
                        onChange={(e) => setSignupClassName(e.target.value)}
                        required
                        maxLength={100}
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full gap-1.5" disabled={isLoading}>
                    {signupRole === "student" ? "Next" : "Create Account"}
                    {signupRole === "student" && <ArrowRight className="w-4 h-4" />}
                  </Button>

                  {/* Step indicator for students */}
                  {signupRole === "student" && (
                    <div className="flex justify-center gap-2 pt-1">
                      <div className="w-8 h-1.5 rounded-full bg-primary" />
                      <div className="w-8 h-1.5 rounded-full bg-border" />
                    </div>
                  )}
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
