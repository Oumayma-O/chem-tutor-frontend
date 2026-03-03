import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
  BookOpen,
  Trophy,
  Target,
  GraduationCap,
  Users,
  Check,
  Save,
  Pencil,
  X,
  Camera,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const GRADE_RANGE_OPTIONS = [
  { value: "middle-school", label: "Middle School" },
  { value: "high-school-9-10", label: "High School (9–10)" },
  { value: "high-school-11-12", label: "High School (11–12)" },
  { value: "ap-advanced", label: "AP / Advanced" },
];

const COURSE_TYPE_OPTIONS = [
  { value: "regular", label: "Regular Chemistry" },
  { value: "honors", label: "Honors" },
  { value: "ap", label: "AP Chemistry" },
];

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
];

export default function StudentProfilePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState<{ name: string; code: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Editable fields
  const [grade, setGrade] = useState("");
  const [course, setCourse] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  // Parse initial values from profile
  useEffect(() => {
    if (!profile) return;
    const parts = profile.grade_level?.split(" · ") || [];
    setGrade(parts[0] || "");
    setCourse(parts[1] || "");
    setInterests(profile.interests || []);
    setAvatarUrl(profile.avatar_url || null);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: enrollments } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", user.id)
        .limit(1);

      if (enrollments?.[0]) {
        const { data: cls } = await supabase
          .from("classes")
          .select("name, class_code")
          .eq("id", enrollments[0].class_id)
          .single();
        if (cls) setClassInfo({ name: cls.name, code: cls.class_code });
      }
    })();
  }, [user]);

  if (!user || !profile) return null;

  const isInClassroom = !!classInfo;

  const initials = profile.display_name ? profile.display_name.charAt(0).toUpperCase() : "?";

  const handleAvatarUpload = async (_e: React.ChangeEvent<HTMLInputElement>) => {
    toast.info("Avatar upload coming soon.");
  };

  const toggleInterest = (value: string) => {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]
    );
  };

  const handleSave = async () => {
    toast.info("Profile editing coming soon — changes cannot be saved yet.");
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    // Reset to profile values
    const parts = profile.grade_level?.split(" · ") || [];
    setGrade(parts[0] || "");
    setCourse(parts[1] || "");
    setInterests(profile.interests || []);
    setIsEditing(false);
  };

  const gradeLabel = GRADE_RANGE_OPTIONS.find((o) => o.value === grade)?.label || grade || "Not set";
  const courseLabel = COURSE_TYPE_OPTIONS.find((o) => o.value === course)?.label || course || "Not set";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-sm font-bold text-foreground">My Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Identity Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-16 w-16">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={profile.display_name} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-5 h-5 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                </div>
                <div>
                  <CardTitle className="text-xl">{profile.display_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {isEditing ? (
              <>
                {isInClassroom && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>Grade and course are set by your classroom ({classInfo.name}).</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                      Grade
                    </Label>
                    <Select value={grade} onValueChange={setGrade} disabled={isInClassroom}>
                      <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                      <SelectContent>
                        {GRADE_RANGE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                      Course
                    </Label>
                    <Select value={course} onValueChange={setCourse} disabled={isInClassroom}>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>
                        {COURSE_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <GraduationCap className="w-3.5 h-3.5" /> Grade
                  </p>
                  <p className="text-sm font-medium text-foreground">{gradeLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                    <BookOpen className="w-3.5 h-3.5" /> Course
                  </p>
                  <p className="text-sm font-medium text-foreground">{courseLabel}</p>
                </div>
              </div>
            )}

            {classInfo && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Classroom</p>
                  <p className="text-sm font-medium text-foreground">
                    {classInfo.name}{" "}
                    <Badge variant="outline" className="ml-1 text-[10px]">{classInfo.code}</Badge>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Interests</CardTitle>
                <p className="text-xs text-muted-foreground">We use these to personalize your chemistry problems.</p>
              </div>
              {!isEditing && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-1.5 text-xs">
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {INTEREST_OPTIONS.map((interest) => (
                  <button
                    key={interest.value}
                    type="button"
                    onClick={() => toggleInterest(interest.value)}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center",
                      interests.includes(interest.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    {interests.includes(interest.value) && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                    <span className="text-lg">{interest.icon}</span>
                    <span className={cn(
                      "text-[10px] font-medium leading-tight",
                      interests.includes(interest.value) ? "text-primary" : "text-muted-foreground"
                    )}>{interest.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {interests.length > 0 ? interests.map((val) => {
                  const opt = INTEREST_OPTIONS.find((o) => o.value === val);
                  return opt ? (
                    <Badge key={val} variant="secondary" className="gap-1">
                      {opt.icon} {opt.label}
                    </Badge>
                  ) : null;
                }) : (
                  <p className="text-sm text-muted-foreground">No interests selected yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Progress Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Overall Mastery</span>
                <span className="font-semibold text-foreground">60%</span>
              </div>
              <Progress value={60} className="h-2.5" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-2xl font-bold text-foreground">1</p>
                <p className="text-xs text-muted-foreground">Chapters Started</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/50">
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">Exit Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Complete chapters and exit tickets to unlock achievements.
            </p>
          </CardContent>
        </Card>

        {/* Edit mode actions */}
        {isEditing ? (
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
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
            <Button variant="outline" onClick={signOut}>Sign Out</Button>
          </div>
        )}
      </main>
    </div>
  );
}
