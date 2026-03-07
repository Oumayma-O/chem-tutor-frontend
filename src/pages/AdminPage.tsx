import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CourseLevel, COURSE_LEVELS } from "@/data/units";
import { type UnitListItem } from "@/lib/api";
import { useUnits } from "@/hooks/useUnits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  BookOpen,
  Shield,
  Users,
  Settings,
  Plus,
  Pencil,
  Trash2,
  BarChart3,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Navigate } from "react-router-dom";

interface TeacherAccount {
  user_id: string;
  display_name: string;
  grade_level: string | null;
  created_at: string;
}

interface ClassInfo {
  id: string;
  name: string;
  class_code: string;
  calculator_enabled: boolean;
  timed_mode_active: boolean;
  grade_level: string | null;
  teacher_id: string;
}

export default function AdminPage() {
  const { signOut, user, role } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [systemStats, setSystemStats] = useState({ totalStudents: 0, totalTeachers: 0, totalClasses: 0 });

  const { units } = useUnits();

  // Chapter management
  const [editingUnit, setEditingUnit] = useState<UnitListItem | null>(null);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({ title: "", description: "", icon: "📘", courseLevel: "intro" as CourseLevel, lessons: "" });

  // Check admin role
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
    })();
  }, [user]);

  // Fetch data
  const fetchData = useCallback(async () => {
    // Teachers
    const { data: teacherProfiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, grade_level, created_at")
      .eq("role", "teacher");
    if (teacherProfiles) setTeachers(teacherProfiles);

    // Classes
    const { data: allClasses } = await supabase
      .from("classes")
      .select("id, name, class_code, calculator_enabled, timed_mode_active, grade_level, teacher_id")
      .order("created_at", { ascending: false });
    if (allClasses) setClasses(allClasses as any);

    // Stats
    const { count: studentCount } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student");
    const { count: teacherCount } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher");
    const { count: classCount } = await supabase.from("classes").select("id", { count: "exact", head: true });
    setSystemStats({
      totalStudents: studentCount || 0,
      totalTeachers: teacherCount || 0,
      totalClasses: classCount || 0,
    });
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const handleToggleCalculator = async (classId: string, enabled: boolean) => {
    await supabase.from("classes").update({ calculator_enabled: enabled } as any).eq("id", classId);
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, calculator_enabled: enabled } : c));
    toast.success(`Calculator ${enabled ? "enabled" : "disabled"}`);
  };

  const openUnitDialog = (unit?: UnitListItem) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitForm({ title: unit.title, description: unit.description, icon: unit.icon, courseLevel: "intro", lessons: unit.lesson_titles.join(", ") });
    } else {
      setEditingUnit(null);
      setUnitForm({ title: "", description: "", icon: "📘", courseLevel: "intro", lessons: "" });
    }
    setUnitDialogOpen(true);
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <Button variant="outline" onClick={signOut}>Sign Out</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><Users className="w-4 h-4" />Total Students</CardDescription></CardHeader>
            <CardContent><div className="text-3xl font-bold">{systemStats.totalStudents}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><GraduationCap className="w-4 h-4" />Total Teachers</CardDescription></CardHeader>
            <CardContent><div className="text-3xl font-bold">{systemStats.totalTeachers}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />Total Classes</CardDescription></CardHeader>
            <CardContent><div className="text-3xl font-bold">{systemStats.totalClasses}</div></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="units" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="units" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" />Units</TabsTrigger>
            <TabsTrigger value="teachers" className="gap-1.5"><GraduationCap className="w-3.5 h-3.5" />Teachers</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-3.5 h-3.5" />Settings</TabsTrigger>
          </TabsList>

          {/* UNITS TAB */}
          <TabsContent value="units" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Unit Management</h2>
              <Button onClick={() => openUnitDialog()} className="gap-1.5"><Plus className="w-4 h-4" />Add Unit</Button>
            </div>
            <div className="space-y-3">
              {units.map(unit => (
                <Card key={unit.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{unit.icon}</span>
                        <div>
                          <h3 className="font-semibold text-foreground">{unit.title}</h3>
                          <p className="text-sm text-muted-foreground">{unit.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {unit.lesson_titles.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                          </div>
                          <div className="flex gap-2 mt-2">
                            {unit.course_name && <Badge variant="outline">{unit.course_name}</Badge>}
                            <Badge variant={!unit.is_coming_soon ? "default" : "secondary"}>{!unit.is_coming_soon ? "Available" : "Coming Soon"}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUnitDialog(unit)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Unit data comes from the backend API.
            </p>
          </TabsContent>

          {/* TEACHERS TAB */}
          <TabsContent value="teachers" className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Teacher Accounts</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Grade Level</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Classes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map(t => {
                  const teacherClasses = classes.filter(c => c.teacher_id === t.user_id);
                  return (
                    <TableRow key={t.user_id}>
                      <TableCell className="font-medium">{t.display_name}</TableCell>
                      <TableCell>{t.grade_level || "—"}</TableCell>
                      <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacherClasses.map(c => (
                            <Badge key={c.id} variant="outline" className="text-xs">{c.name} ({c.class_code})</Badge>
                          ))}
                          {teacherClasses.length === 0 && <span className="text-muted-foreground text-xs">No classes</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {teachers.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No teachers found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">System Settings</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Calculator Settings per Class</CardTitle>
                <CardDescription>Toggle the built-in calculator on or off for each class</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {classes.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div>
                        <span className="font-medium text-foreground text-sm">{c.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({c.class_code})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{c.calculator_enabled ? "Enabled" : "Disabled"}</span>
                        <Switch checked={c.calculator_enabled} onCheckedChange={(v) => handleToggleCalculator(c.id, v)} />
                      </div>
                    </div>
                  ))}
                  {classes.length === 0 && <p className="text-sm text-muted-foreground">No classes found</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Unit Edit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Edit Unit" : "Add Unit"}</DialogTitle>
            <DialogDescription>Unit data is managed via the backend API.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[60px_1fr] gap-3">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Input value={unitForm.icon} onChange={e => setUnitForm(prev => ({ ...prev, icon: e.target.value }))} className="text-center text-lg" maxLength={4} />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={unitForm.title} onChange={e => setUnitForm(prev => ({ ...prev, title: e.target.value }))} maxLength={100} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={unitForm.description} onChange={e => setUnitForm(prev => ({ ...prev, description: e.target.value }))} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>Course Level</Label>
              <Select value={unitForm.courseLevel} onValueChange={v => setUnitForm(prev => ({ ...prev, courseLevel: v as CourseLevel }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COURSE_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lessons (comma-separated)</Label>
              <Input value={unitForm.lessons} onChange={e => setUnitForm(prev => ({ ...prev, lessons: e.target.value }))} placeholder="Lesson 1, Lesson 2, Lesson 3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setUnitDialogOpen(false); toast.info("Use the backend API to persist unit changes."); }}>
              {editingUnit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
