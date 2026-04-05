import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  getAdminChapters,
  getSystemLogs,
  getAdminStats,
  getAdminTeachers,
  getCuratedProblems,
  updateChapter,
  deleteChapter,
  createChapterUnit,
  type AdminTeacherAccount,
  type GenerationLogEntry,
  type UnitCreatePayload,
} from "@/services/api/admin";
import type { CurriculumResponse } from "@/lib/api/units";
import { COURSE_LEVELS } from "@/data/units";
import { STEP_TEMPLATES } from "@/data/stepTemplates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield, Users, Settings, Plus, Pencil, Trash2, BarChart3,
  GraduationCap, BookOpen, Star, Eye, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AdminCuratedGoldTab } from "@/components/admin/AdminCuratedGoldTab";

interface DbChapter {
  id: string;
  title: string;
  description: string;
  icon: string;
  course_level: string;
  phase: string | null;
  order: number;
  topics: string[];
  standards: string[];
  step_template: string;
  available: boolean;
  tools: string[];
}

function flattenCurriculumToChapters(data: CurriculumResponse): DbChapter[] {
  const out: DbChapter[] = [];
  for (const ph of data.phases) {
    for (const u of ph.units) {
      const name = u.course_name?.toLowerCase() ?? "";
      const course_level = name.includes("ap") ? "ap" : "standard";
      out.push({
        id: u.id,
        title: u.title,
        description: u.description,
        icon: u.icon || "📘",
        course_level,
        phase: ph.phase_name,
        order: u.effective_order,
        topics: u.lesson_titles,
        standards: [],
        step_template: "problem-solving",
        available: u.is_active,
        tools: [],
      });
    }
  }
  return out;
}

/** Display row for generation logs until the API exposes review workflow fields. */
type AdminLogDisplay = GenerationLogEntry & { review_status: "pending" | "promoted" | "rejected" };

export default function AdminPage() {
  const { signOut, user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Chapters (synced from API)
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<DbChapter | null>(null);
  const [chapterForm, setChapterForm] = useState({
    id: "", title: "", description: "", icon: "📘",
    course_level: "standard" as string, phase: "", order: 0,
    topics: "", standards: "", step_template: "problem-solving" as string, available: true,
    tools: "" as string,
  });
  const [deleteChapterId, setDeleteChapterId] = useState<string | null>(null);

  const [logUnitFilter, setLogUnitFilter] = useState<"all" | string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data: curriculum } = useQuery({
    queryKey: ["admin", "chapters"],
    queryFn: () => getAdminChapters(),
    enabled: isAdmin && !!user,
  });

  const apiChapters = useMemo(
    () => (curriculum ? flattenCurriculumToChapters(curriculum) : []),
    [curriculum],
  );

  const chapters = apiChapters;

  const { data: logRows = [] } = useQuery({
    queryKey: ["admin", "logs", logUnitFilter],
    queryFn: () =>
      getSystemLogs({
        limit: 100,
        unit_id: logUnitFilter === "all" ? null : logUnitFilter,
      }),
    enabled: isAdmin && !!user,
  });

  const logs: AdminLogDisplay[] = useMemo(
    () => logRows.map((r) => ({ ...r, review_status: "pending" as const })),
    [logRows],
  );

  const { data: adminStats } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: getAdminStats,
    enabled: isAdmin && !!user,
  });

  const { data: teacherRows = [], isPending: teachersPending } = useQuery({
    queryKey: ["admin", "teachers"],
    queryFn: getAdminTeachers,
    enabled: isAdmin && !!user,
  });

  const teachers: AdminTeacherAccount[] = teacherRows;

  const systemStats = useMemo(
    () => ({
      totalStudents: adminStats?.students ?? 0,
      totalTeachers: adminStats?.teachers ?? 0,
      totalClasses: adminStats?.total_classrooms ?? 0,
    }),
    [adminStats],
  );

  const { data: curatedProblems = [] } = useQuery({
    queryKey: ["admin", "curated"],
    queryFn: () => getCuratedProblems(200, 0),
    enabled: isAdmin && !!user,
  });

  // Chapter CRUD
  const openChapterDialog = (ch?: DbChapter) => {
    if (ch) {
      setEditingChapter(ch);
      setChapterForm({
        id: ch.id, title: ch.title, description: ch.description, icon: ch.icon,
        course_level: ch.course_level, phase: ch.phase || "", order: ch.order,
        topics: ch.topics.join(", "), standards: ch.standards.join(", "),
        step_template: ch.step_template, available: ch.available,
        tools: (ch.tools || []).join(", "),
      });
    } else {
      setEditingChapter(null);
      setChapterForm({ id: "", title: "", description: "", icon: "📘", course_level: "standard", phase: "", order: 0, topics: "", standards: "", step_template: "problem-solving", available: true, tools: "" });
    }
    setChapterDialogOpen(true);
  };

  const saveChapter = async () => {
    const slug =
      chapterForm.id.trim() || chapterForm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    try {
      if (editingChapter) {
        await updateChapter(editingChapter.id, {
          title: chapterForm.title,
          description: chapterForm.description,
          is_active: chapterForm.available,
        });
        toast.success("Unit updated.");
      } else {
        const payload: UnitCreatePayload = {
          id: slug,
          title: chapterForm.title,
          description: chapterForm.description,
          icon: chapterForm.icon,
          sort_order: chapterForm.order,
          lessons: [
            {
              title: chapterForm.topics.split(",")[0]?.trim() || "Introduction",
              description: "",
              lesson_index: 0,
              objectives: chapterForm.topics.split(",").map((s) => s.trim()).filter(Boolean),
              is_active: true,
            },
          ],
        };
        await createChapterUnit(payload);
        toast.success("Unit created.");
      }
      setChapterDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["admin", "chapters"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const deleteChapterFn = async () => {
    if (!deleteChapterId) return;
    try {
      await deleteChapter(deleteChapterId);
      toast.success("Unit deactivated.");
      setDeleteChapterId(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "chapters"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      reviewed: { variant: "secondary", label: "Reviewed" },
      promoted: { variant: "default", label: "⭐ Gold" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const s = map[status] || { variant: "outline" as const, label: status };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <DashboardShell>
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
          <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><Users className="w-4 h-4" />Total Students</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold">{systemStats.totalStudents}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><GraduationCap className="w-4 h-4" />Total Teachers</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold">{systemStats.totalTeachers}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-2"><BarChart3 className="w-4 h-4" />Total Classes</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold">{systemStats.totalClasses}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="units" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="units" className="gap-1.5 text-xs"><BookOpen className="w-3.5 h-3.5" />Units</TabsTrigger>
            <TabsTrigger value="gen-logs" className="gap-1.5 text-xs"><FileText className="w-3.5 h-3.5" />Gen Logs</TabsTrigger>
            <TabsTrigger value="curated" className="gap-1.5 text-xs"><Star className="w-3.5 h-3.5" />Gold</TabsTrigger>
            <TabsTrigger value="teachers" className="gap-1.5 text-xs"><GraduationCap className="w-3.5 h-3.5" />Teachers</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs"><Settings className="w-3.5 h-3.5" />Settings</TabsTrigger>
          </TabsList>

          {/* ── UNITS TAB ── */}
          <TabsContent value="units" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Curriculum Units</h2>
              <Button onClick={() => openChapterDialog()} className="gap-1.5"><Plus className="w-4 h-4" />Add Unit</Button>
            </div>
            <div className="space-y-3">
              {chapters.map(ch => (
                <Card key={ch.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{ch.icon}</span>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{ch.title}</h3>
                            <Badge variant={ch.course_level === "ap" ? "default" : "secondary"} className="text-xs">
                              {ch.course_level === "ap" ? "AP" : "Standard"}
                            </Badge>
                            <Badge variant={ch.available ? "default" : "outline"} className="text-xs">
                              {ch.available ? "Live" : "Coming Soon"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{ch.description}</p>
                          {ch.phase && <p className="text-xs text-muted-foreground mt-1">{ch.phase} · Order {ch.order}</p>}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {ch.topics.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openChapterDialog(ch)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteChapterId(ch.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {chapters.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No chapters found</p>}
            </div>
          </TabsContent>

          {/* ── GENERATION LOGS TAB ── */}
          <TabsContent value="gen-logs" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Generation Logs</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Review and promotion actions require API support; logs are filtered by unit below.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={logUnitFilter} onValueChange={(v) => setLogUnitFilter(v)}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Unit" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All units</SelectItem>
                    {chapters.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void queryClient.invalidateQueries({ queryKey: ["admin", "logs"] })}
                >
                  Refresh
                </Button>
              </div>
            </div>

            {logs.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No generation logs yet. Logs will appear here as problems are generated.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <Card key={log.id} className={log.review_status === "promoted" ? "border-amber-500/50" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {statusBadge(log.review_status)}
                          <span className="font-medium text-sm text-foreground">{log.problem_id}</span>
                          <span className="text-xs text-muted-foreground">{log.unit_id} · L{log.lesson_index}</span>
                          <Badge variant="outline" className="text-xs">{log.difficulty}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {(log.execution_time_s * 1000).toFixed(0)}ms · {log.model_name}
                          </span>
                          <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString()}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      {expandedLogId === log.id && (
                        <pre className="mt-3 p-3 bg-muted rounded-md text-xs overflow-auto max-h-80">
                          {JSON.stringify(log, null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── CURATED EXAMPLES TAB ── */}
          <TabsContent value="curated" className="space-y-4">
            <AdminCuratedGoldTab curatedProblems={curatedProblems} curriculum={curriculum} />
          </TabsContent>

          {/* ── TEACHERS TAB ── */}
          <TabsContent value="teachers" className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Teacher Accounts</h2>
            <p className="text-sm text-muted-foreground">
              Teachers registered in the system and the classes they own (from the database).
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Grade / course</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Classes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((t) => (
                  <TableRow key={t.user_id}>
                    <TableCell className="font-medium">{t.display_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{t.email}</TableCell>
                    <TableCell>{t.grade_level || "—"}</TableCell>
                    <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {t.classes.map((c) => (
                          <Badge key={c.id} variant="outline" className="text-xs">
                            {c.name} ({c.class_code})
                          </Badge>
                        ))}
                        {t.classes.length === 0 && (
                          <span className="text-muted-foreground text-xs">No classes</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {teachersPending && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!teachersPending && teachers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No teachers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* ── SETTINGS TAB ── */}
          <TabsContent value="settings" className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">System Settings</h2>
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Per-class settings (e.g. calculator toggle) are managed by teachers in their own dashboard.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Chapter Dialog */}
      <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingChapter ? "Edit Unit" : "Add Unit"}</DialogTitle>
            <DialogDescription>Manage curriculum units stored in the database.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-[60px_1fr] gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Icon</Label>
                <Input value={chapterForm.icon} onChange={e => setChapterForm(p => ({ ...p, icon: e.target.value }))} className="text-center text-lg" maxLength={4} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input value={chapterForm.title} onChange={e => setChapterForm(p => ({ ...p, title: e.target.value }))} />
              </div>
            </div>
            {!editingChapter && (
              <div className="space-y-1">
                <Label className="text-xs">ID (slug)</Label>
                <Input value={chapterForm.id} onChange={e => setChapterForm(p => ({ ...p, id: e.target.value }))} placeholder="auto-generated from title" />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={chapterForm.description} onChange={e => setChapterForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Course Level</Label>
                <Select value={chapterForm.course_level} onValueChange={v => setChapterForm(p => ({ ...p, course_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COURSE_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Step Template</Label>
                <Select value={chapterForm.step_template} onValueChange={v => setChapterForm(p => ({ ...p, step_template: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(STEP_TEMPLATES).map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Phase</Label>
                <Input value={chapterForm.phase} onChange={e => setChapterForm(p => ({ ...p, phase: e.target.value }))} placeholder="e.g. Phase 1: The Basics" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Order</Label>
                <Input type="number" value={chapterForm.order} onChange={e => setChapterForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Topics (comma-separated)</Label>
              <Input value={chapterForm.topics} onChange={e => setChapterForm(p => ({ ...p, topics: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Standards (comma-separated)</Label>
              <Input value={chapterForm.standards} onChange={e => setChapterForm(p => ({ ...p, standards: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tools (comma-separated: calculator, periodic_table, equation_sheet)</Label>
              <Input value={chapterForm.tools} onChange={e => setChapterForm(p => ({ ...p, tools: e.target.value }))} placeholder="calculator, periodic_table" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={chapterForm.available} onCheckedChange={v => setChapterForm(p => ({ ...p, available: v }))} />
              <Label className="text-xs">Available to students</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChapterDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveChapter} disabled={!chapterForm.title.trim()}>{editingChapter ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Chapter Confirm */}
      <AlertDialog open={!!deleteChapterId} onOpenChange={() => setDeleteChapterId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete unit?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this unit from the curriculum.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteChapterFn} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
    </DashboardShell>
  );
}
