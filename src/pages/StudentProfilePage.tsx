import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { JoinClassDialog } from "@/components/tutor/layout/JoinClassDialog";
import { ClassroomEnrollmentCard } from "@/components/layout/ClassroomEnrollmentCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Trophy,
  Target,
  GraduationCap,
  Users,
  Check,
  Save,
  Pencil,
  X,
  FlaskConical,
  Beaker,
  BookCheck,
  BarChart3,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BeakerMascot } from "@/components/tutor/widgets";
import {
  PROFILE_INTEREST_OPTIONS,
  STUDENT_PROFILE_COURSE_OPTIONS,
  STUDENT_PROFILE_GRADE_OPTIONS,
} from "@/lib/profileOptions";

const ACHIEVEMENT_BADGES = [
  { icon: "🔬", label: "First Experiment", desc: "Complete your first unit" },
  { icon: "⚗️", label: "Bunsen Burner", desc: "Score 80%+ on an exit ticket" },
  { icon: "🧪", label: "Lab Coat", desc: "Complete 3 units" },
  { icon: "🏅", label: "Reactor", desc: "Achieve 90% mastery on any unit" },
  { icon: "🎓", label: "Valedictorian", desc: "Complete all AP units" },
  { icon: "💎", label: "Diamond Flask", desc: "30-day study streak" },
];

export default function StudentProfilePage() {
  const { user, profile, signOut, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [joinClassOpen, setJoinClassOpen] = useState(false);

  const [grade, setGrade] = useState("");
  const [course, setCourse] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!profile) return;
    setGrade(profile.grade ?? "");
    setCourse(profile.course ?? "");
    setInterests(profile.interests ?? []);
  }, [profile]);

  if (!user || !profile) return null;

  const initials = profile.display_name
    ? profile.display_name.charAt(0).toUpperCase()
    : "?";

  const isInClassroom = !!profile.classroom_name;

  const toggleInterest = (value: string) => {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ grade, course, interests });
      toast.success("Profile saved!");
      setIsEditing(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setGrade(profile.grade ?? "");
    setCourse(profile.course ?? "");
    setInterests(profile.interests ?? []);
    setIsEditing(false);
  };

  const gradeLabel =
    STUDENT_PROFILE_GRADE_OPTIONS.find((o) => o.value === grade)?.label || grade || "Not set";
  const courseLabel =
    STUDENT_PROFILE_COURSE_OPTIONS.find((o) => o.value === course)?.label || course || "Not set";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-sm font-semibold text-foreground tracking-wide uppercase">
            Research Profile
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-5">
        {/* Identity Card */}
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-primary/40" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">
                    {profile.display_name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1.5 text-xs"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                {isInClassroom && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>
                      Grade and course are managed by your classroom (
                      {profile.classroom_name}).
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                      Grade
                    </Label>
                    <Select
                      value={grade}
                      onValueChange={setGrade}
                      disabled={isInClassroom}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {STUDENT_PROFILE_GRADE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
                      Course
                    </Label>
                    <Select
                      value={course}
                      onValueChange={setCourse}
                      disabled={isInClassroom}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {STUDENT_PROFILE_COURSE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                    <GraduationCap className="w-3 h-3" /> Grade
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {gradeLabel}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
                    <FlaskConical className="w-3 h-3" /> Course
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {courseLabel}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-1 border-t border-border/60">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Classroom
              </p>
              {profile.classroom_name ? (
                <ClassroomEnrollmentCard
                  className="max-w-md"
                  onLeft={() => setJoinClassOpen(true)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isEditing
                    ? "Join a class with your teacher's code to sync assignments and progress."
                    : "Not enrolled in a classroom. Choose Edit to join or change class."}
                </p>
              )}
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    void refreshProfile();
                    setJoinClassOpen(true);
                  }}
                >
                  <Users className="w-4 h-4" />
                  {profile.classroom_name ? "Change classroom" : "Join a classroom"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress & Stats */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wide">
              <BarChart3 className="w-4 h-4 text-primary" />
              Exam Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Overall Mastery</span>
                <span className="font-bold text-foreground tabular-nums">0%</span>
              </div>
              <Progress value={0} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg border border-border bg-card">
                <BookCheck className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xl font-bold text-foreground tabular-nums">0</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Modules</p>
              </div>
              <div className="text-center p-3 rounded-lg border border-border bg-card">
                <Target className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xl font-bold text-foreground tabular-nums">0</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Validated</p>
              </div>
              <div className="text-center p-3 rounded-lg border border-border bg-card">
                <Trophy className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                <p className="text-xl font-bold text-foreground tabular-nums">0</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Exit Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interests */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wide">
                  <Beaker className="w-4 h-4 text-primary" />
                  Context Preferences
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Problems are personalized around your interests.
                </p>
              </div>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1 text-xs text-muted-foreground"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PROFILE_INTEREST_OPTIONS.filter((i) => i.value !== "other").map((interest) => (
                  <button
                    key={interest.value}
                    type="button"
                    onClick={() => toggleInterest(interest.value)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                      interests.includes(interest.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30",
                    )}
                  >
                    {interests.includes(interest.value) && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                    <span className="text-lg">{interest.icon}</span>
                    <span
                      className={cn(
                        "text-[10px] font-medium leading-tight",
                        interests.includes(interest.value)
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {interest.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {interests.length > 0 ? (
                  interests.map((val) => {
                    const opt = PROFILE_INTEREST_OPTIONS.find((o) => o.value === val);
                    return opt ? (
                      <Badge key={val} variant="secondary" className="gap-1 text-xs">
                        {opt.icon} {opt.label}
                      </Badge>
                    ) : null;
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No preferences set. Edit to personalize your problems.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievements — mascot lives here as "stamps" */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wide">
              <Trophy className="w-4 h-4 text-amber-500" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {ACHIEVEMENT_BADGES.map((badge) => (
                <div
                  key={badge.label}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg border border-dashed border-border/50 opacity-35 hover:opacity-50 transition-opacity"
                  title={badge.desc}
                >
                  <span className="text-xl grayscale">{badge.icon}</span>
                  <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight">
                    {badge.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
              <BeakerMascot mood="relaxed" size={32} />
              <p className="text-xs text-muted-foreground">
                Complete units and exit tickets to unlock achievements.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        {isEditing ? (
          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={handleCancelEdit} className="gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={signOut}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Sign Out
            </Button>
          </div>
        )}
      </main>

      <JoinClassDialog
        open={joinClassOpen}
        onOpenChange={setJoinClassOpen}
        onJoined={() => {
          setJoinClassOpen(false);
          void refreshProfile();
        }}
      />
    </div>
  );
}
