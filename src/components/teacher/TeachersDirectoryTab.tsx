import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminTeachers,
  deleteTeacher,
  patchTeacher,
  createTeacher,
  getSchoolAdmins,
  deleteSchoolAdmin,
  patchSchoolAdmin,
  createSchoolAdmin,
  getEngagementAnalytics,
  type AdminTeacherAccount,
  type SchoolAdminAccount,
  type DailyMetric,
} from "@/services/api/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { US_DISTRICTS } from "@/lib/locationConfig";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ArrowRight,
  Plus,
  Users,
  GraduationCap,
  Clock,
  Zap,
  BookOpen,
  MoreHorizontal,
  School,
  Building2,
  Shield,
  CalendarDays,
} from "lucide-react";

// Re-export so StaffDirectoryPage can import from one place
export { US_DISTRICTS };
// Keep legacy export name so StaffDirectoryPage import compiles without change
export const DISTRICTS = US_DISTRICTS;
export const SCHOOLS_BY_DISTRICT: Record<string, string[]> = {}; // schools are free-text, no enum

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminWithTeachers extends SchoolAdminAccount {
  teachers: AdminTeacherAccount[];
  total_teachers: number;
  total_classes: number;
  total_students: number;
}

export interface TeachersDirectoryTabProps {
  onSelectClass: (cls: { id: string; name: string; code: string }) => void;
  isSuperAdmin: boolean;
  filterDistrict?: string | null;
  filterSchool?: string | null;
}

function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "?";
}

function formatJoined(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(dateStr));
  } catch {
    return null;
  }
}

// ── Location select helper ────────────────────────────────────────────────────

/**
 * District = US state enum (validated by backend).
 * School = free-text string (no backend enum).
 */
function DistrictSchoolSelect({
  district,
  school,
  onDistrictChange,
  onSchoolChange,
}: {
  district: string;
  school: string;
  onDistrictChange: (v: string) => void;
  onSchoolChange: (v: string) => void;
}) {
  return (
    <>
      <div>
        <Label>State / District</Label>
        <Select value={district} onValueChange={onDistrictChange}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select state…" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {US_DISTRICTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>School name</Label>
        <Input
          className="mt-1"
          value={school}
          onChange={(e) => onSchoolChange(e.target.value)}
          placeholder="e.g. Jefferson High School"
        />
      </div>
    </>
  );
}

// ── CRUD Dialogs ──────────────────────────────────────────────────────────────

function CreateTeacherDialog({
  open,
  onClose,
  onCreated,
  isSuperAdmin = false,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  isSuperAdmin?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [district, setDistrict] = useState("");
  const [school, setSchool] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () =>
      createTeacher({
        email,
        password,
        full_name: fullName,
        // Only pass district/school when superadmin creates manually;
        // school admins rely on backend inheritance from their own account.
        ...(isSuperAdmin ? { district: district || undefined, school: school || undefined } : {}),
      }),
    onSuccess: () => {
      toast({ title: "Teacher created" });
      onCreated();
      onClose();
      setEmail(""); setPassword(""); setFullName(""); setDistrict(""); setSchool("");
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Teacher</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input className="mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <PasswordInput className="mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {/* SuperAdmin assigns district/school manually; school admins inherit from their account */}
          {isSuperAdmin && (
            <DistrictSchoolSelect
              district={district}
              school={school}
              onDistrictChange={setDistrict}
              onSchoolChange={setSchool}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !email || !password || !fullName}
          >
            {mutation.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateSchoolAdminDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [district, setDistrict] = useState("");
  const [school, setSchool] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () =>
      createSchoolAdmin({ email, password, full_name: fullName, district, school }),
    onSuccess: () => {
      toast({ title: "School admin created" });
      onCreated();
      onClose();
      setEmail(""); setPassword(""); setFullName(""); setDistrict(""); setSchool("");
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add School Admin</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Full name</Label>
            <Input className="mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <PasswordInput className="mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <DistrictSchoolSelect
            district={district}
            school={school}
            onDistrictChange={setDistrict}
            onSchoolChange={setSchool}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !email || !password || !fullName || !district || !school}
          >
            {mutation.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTeacherDialog({
  teacher,
  onClose,
  onSaved,
}: {
  teacher: AdminTeacherAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(teacher.display_name);
  const [isActive, setIsActive] = useState(teacher.is_active);
  const [district, setDistrict] = useState(teacher.district ?? "");
  const [school, setSchool] = useState(teacher.school ?? "");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () =>
      patchTeacher(teacher.user_id, {
        name,
        is_active: isActive,
        district: district || undefined,
        school: school || undefined,
      }),
    onSuccess: () => { toast({ title: "Saved" }); onSaved(); onClose(); },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DistrictSchoolSelect
            district={district}
            school={school}
            onDistrictChange={setDistrict}
            onSchoolChange={setSchool}
          />
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="teacher-active" />
            <Label htmlFor="teacher-active">Account active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditAdminDialog({
  admin,
  onClose,
  onSaved,
}: {
  admin: SchoolAdminAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(admin.name);
  const [district, setDistrict] = useState(admin.district ?? "");
  const [school, setSchool] = useState(admin.school ?? "");
  const [isActive, setIsActive] = useState(admin.is_active);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () =>
      patchSchoolAdmin(admin.user_id, {
        name,
        district: district || undefined,
        school: school || undefined,
        is_active: isActive,
      }),
    onSuccess: () => { toast({ title: "Saved" }); onSaved(); onClose(); },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit School Admin</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DistrictSchoolSelect
            district={district}
            school={school}
            onDistrictChange={setDistrict}
            onSchoolChange={setSchool}
          />
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} id="admin-active" />
            <Label htmlFor="admin-active">Account active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Activity heatmap (GitHub-style 5×7 grid) ──────────────────────────────────

function ActivityHeatmap({ daily }: { daily: DailyMetric[] }) {
  const activityMap = new Map(
    daily.map((d) => [d.date.split("T")[0], d.logins])
  );

  // Build the last 35 days (5 complete weeks), oldest first
  const today = new Date();
  const cells: { date: string; count: number }[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    cells.push({ date: dateStr, count: activityMap.get(dateStr) ?? 0 });
  }

  const getColor = (count: number) => {
    if (count === 0) return "bg-slate-100";
    if (count <= 1) return "bg-blue-200";
    if (count <= 3) return "bg-blue-400";
    return "bg-blue-600";
  };

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-7 gap-1">
        {dayLabels.map((d, i) => (
          <div key={i} className="text-[9px] text-center text-muted-foreground font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ date, count }) => (
          <div
            key={date}
            title={`${date}: ${count} login${count !== 1 ? "s" : ""}`}
            className={`aspect-square rounded-sm transition-colors cursor-default ${getColor(count)}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1 justify-end pt-0.5">
        <span className="text-[9px] text-muted-foreground">Less</span>
        {["bg-slate-100", "bg-blue-200", "bg-blue-400", "bg-blue-600"].map((c, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
        ))}
        <span className="text-[9px] text-muted-foreground">More</span>
      </div>
    </div>
  );
}

// ── Engagement panel (left 3/5 of teacher drawer) ─────────────────────────────

function EngagementPanel({
  teacher,
  isSuperAdmin,
}: {
  teacher: AdminTeacherAccount;
  isSuperAdmin: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["teacher-engagement", teacher.user_id],
    queryFn: () =>
      getEngagementAnalytics({
        scope: "teacher",
        target: teacher.user_id,
        timeframe: "last_30_days",
        isSuperAdmin,
      }),
    staleTime: 5 * 60_000,
  });

  const teacherRow = useMemo(
    () => data?.teachers.find((t) => t.teacher_id === teacher.user_id),
    [data?.teachers, teacher.user_id],
  );
  const totalLogins = teacherRow?.total_logins ?? 0;
  const totalMinutes = teacherRow?.total_minutes ?? 0;
  const questionsAssigned = data?.total_questions_assigned ?? 0;
  const daily = teacherRow?.daily ?? [];
  const totalHours = (totalMinutes / 60).toFixed(1);
  const loginsPerWeek = daily.length > 0
    ? ((totalLogins / 30) * 7).toFixed(1)
    : "0";

  const stats = [
    {
      label: "Logins / week",
      value: isLoading ? "…" : loginsPerWeek,
      icon: Zap,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Hours active",
      value: isLoading ? "…" : `${totalHours}h`,
      icon: Clock,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      label: "Questions assigned",
      value: isLoading ? "…" : String(questionsAssigned),
      icon: BookOpen,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
        Engagement · Last 30 Days
      </p>

      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 hover:shadow-sm transition-shadow"
          >
            <div
              className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}
            >
              <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
            </div>
            <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">
              {value}
            </p>
            <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-3">
        <p className="text-[10px] font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Activity · Last 5 weeks
        </p>
        {isLoading ? (
          <Skeleton className="h-20 w-full rounded-lg" />
        ) : (
          <ActivityHeatmap daily={daily} />
        )}
      </div>
    </div>
  );
}

// ── Classes panel (right 2/5 of teacher drawer) ───────────────────────────────

function ClassesPanel({
  teacher,
  onSelectClass,
}: {
  teacher: AdminTeacherAccount;
  onSelectClass: (cls: { id: string; name: string; code: string }) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
        Classes Taught
      </p>

      {teacher.classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-slate-200 bg-white">
          <GraduationCap className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-sm text-muted-foreground">No classes yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teacher.classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all duration-150"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{cls.name}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {cls.class_code}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 shrink-0 ml-2"
                onClick={() =>
                  onSelectClass({ id: cls.id, name: cls.name, code: cls.class_code })
                }
              >
                View <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Teacher row (collapsible with 70/30 engagement drawer) ────────────────────

function TeacherRow({
  teacher,
  onSelectClass,
  onEdit,
  onDelete,
  isSuperAdmin,
  isNested = false,
}: {
  teacher: AdminTeacherAccount;
  onSelectClass: (cls: { id: string; name: string; code: string }) => void;
  onEdit: (t: AdminTeacherAccount) => void;
  onDelete: (t: AdminTeacherAccount) => void;
  isSuperAdmin: boolean;
  isNested?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const initials = initialsFromName(teacher.display_name);

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        expanded
          ? "border-blue-200 shadow-md"
          : isNested
          ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
          : "border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300"
      }`}
    >
      {/* Row header — click to expand */}
      <div
        role="button"
        tabIndex={0}
        className="flex items-center gap-3 p-4 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-inset rounded-xl"
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <Avatar className={isNested ? "h-8 w-8 shrink-0" : "h-9 w-9 shrink-0"}>
          <AvatarFallback
            className={`text-xs font-semibold ${
              teacher.is_online
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {teacher.display_name}
            </p>
            {!teacher.is_active && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                Disabled
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{teacher.email}</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Online status */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                teacher.is_online ? "bg-green-500 animate-pulse" : "bg-slate-300"
              }`}
            />
            <span className="text-[11px] text-muted-foreground">
              {teacher.is_online ? "Online" : "Offline"}
            </span>
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-default">
                  <GraduationCap className="w-3 h-3" />
                  {teacher.total_classes}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Classes taught</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-1 cursor-default">
                  <Users className="w-3 h-3" />
                  {teacher.total_students}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Students</TooltipContent>
            </Tooltip>
            {formatJoined(teacher.created_at) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="hidden md:flex items-center gap-1 cursor-default">
                    <CalendarDays className="w-3 h-3" />
                    {formatJoined(teacher.created_at)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Joined</TooltipContent>
              </Tooltip>
            )}
          </div>

          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
              expanded ? "rotate-180" : ""
            }`}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onEdit(teacher); }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(teacher); }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expandable drawer — CSS grid trick for smooth animation */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 bg-slate-50/60 p-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Engagement: 3/5 width */}
              <div className="lg:col-span-3">
                <EngagementPanel teacher={teacher} isSuperAdmin={isSuperAdmin} />
              </div>
              {/* Classes: 2/5 width */}
              <div className="lg:col-span-2">
                <ClassesPanel teacher={teacher} onSelectClass={onSelectClass} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Teachers section (list of teacher rows with optional header) ───────────────

function TeachersSection({
  teachers,
  onSelectClass,
  onRefresh,
  isSuperAdmin,
  showAddButton = true,
  isNested = false,
}: {
  teachers: AdminTeacherAccount[];
  onSelectClass: (cls: { id: string; name: string; code: string }) => void;
  onRefresh: () => void;
  isSuperAdmin: boolean;
  showAddButton?: boolean;
  isNested?: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editTeacher, setEditTeacher] = useState<AdminTeacherAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminTeacherAccount | null>(null);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTeacher(id),
    onSuccess: () => {
      toast({ title: "Teacher deleted" });
      onRefresh();
      setDeleteTarget(null);
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      {showAddButton && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-slate-800">Teachers</h3>
            <Badge variant="secondary" className="text-xs">
              {teachers.length}
            </Badge>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Add Teacher
          </Button>
        </div>
      )}

      {teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-slate-200">
          <Users className="w-9 h-9 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-500">No teachers yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Add a teacher to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teachers.map((t) => (
            <TeacherRow
              key={t.user_id}
              teacher={t}
              onSelectClass={onSelectClass}
              onEdit={setEditTeacher}
              onDelete={setDeleteTarget}
              isSuperAdmin={isSuperAdmin}
              isNested={isNested}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTeacherDialog
          open
          onClose={() => setShowCreate(false)}
          onCreated={onRefresh}
          isSuperAdmin={isSuperAdmin}
        />
      )}
      {editTeacher && (
        <EditTeacherDialog
          teacher={editTeacher}
          onClose={() => setEditTeacher(null)}
          onSaved={onRefresh}
        />
      )}
      {deleteTarget && (
        <AlertDialog open onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete teacher?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete{" "}
                <strong>{deleteTarget.display_name}</strong> and all their
                classes. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteMutation.mutate(deleteTarget.user_id)}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

// ── Admin accordion card (SuperAdmin Level 1) ─────────────────────────────────

function AdminCard({
  admin,
  onSelectClass,
  onRefresh,
  onEdit,
  onDelete,
  isSuperAdmin,
}: {
  admin: AdminWithTeachers;
  onSelectClass: (cls: { id: string; name: string; code: string }) => void;
  onRefresh: () => void;
  onEdit: (a: SchoolAdminAccount) => void;
  onDelete: (a: SchoolAdminAccount) => void;
  isSuperAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const initials = initialsFromName(admin.name);

  return (
    <div
      className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
        expanded
          ? "border-purple-200 shadow-lg bg-white"
          : "border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300"
      }`}
    >
      {/* Admin header */}
      <div
        role="button"
        tabIndex={0}
        className="flex items-start gap-4 p-5 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-inset"
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {/* Avatar + name block */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="h-12 w-12">
              <AvatarFallback
                className={`text-sm font-bold ${
                  admin.is_active
                    ? "bg-purple-100 text-purple-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            {admin.is_active && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-slate-900 text-base">{admin.name}</p>
              {!admin.is_active && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  Disabled
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {admin.district && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium border border-indigo-100">
                  <Building2 className="w-2.5 h-2.5" />
                  {admin.district}
                </span>
              )}
              {admin.school && (
                <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium border border-blue-100">
                  <School className="w-2.5 h-2.5" />
                  {admin.school}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats + controls */}
        <div className="flex items-center gap-5 shrink-0">
          <div className="hidden sm:flex items-center gap-5">
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">
                {admin.total_teachers}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Teachers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">
                {admin.total_classes}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Classes</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-slate-900 tabular-nums leading-none">
                {admin.total_students}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Students</p>
            </div>
          </div>

          <ChevronDown
            className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${
              expanded ? "rotate-180" : ""
            }`}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onEdit(admin); }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(admin); }}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expandable teachers list */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-purple-100 bg-slate-50/70 p-4 pt-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Teachers under {admin.name.split(" ")[0]}
            </p>
            <TeachersSection
              teachers={admin.teachers}
              onSelectClass={onSelectClass}
              onRefresh={onRefresh}
              isSuperAdmin={isSuperAdmin}
              showAddButton={false}
              isNested
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TeachersDirectoryTab({
  onSelectClass,
  isSuperAdmin,
  filterDistrict,
  filterSchool,
}: TeachersDirectoryTabProps) {
  const queryClient = useQueryClient();
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [editAdmin, setEditAdmin] = useState<SchoolAdminAccount | null>(null);
  const [deleteAdminTarget, setDeleteAdminTarget] = useState<SchoolAdminAccount | null>(null);
  const { toast } = useToast();

  const teachersQuery = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: getAdminTeachers,
  });

  const adminsQuery = useQuery({
    queryKey: ["school-admins"],
    queryFn: getSchoolAdmins,
    enabled: isSuperAdmin,
  });

  const refreshTeachers = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-teachers"] });
  const refreshAdmins = () =>
    queryClient.invalidateQueries({ queryKey: ["school-admins"] });
  const refreshAll = () => { refreshTeachers(); refreshAdmins(); };

  const deleteAdminMutation = useMutation({
    mutationFn: (id: string) => deleteSchoolAdmin(id),
    onSuccess: () => {
      toast({ title: "Admin deleted" });
      refreshAll();
      setDeleteAdminTarget(null);
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Build admin→teachers hierarchy
  const adminsWithTeachers = useMemo<AdminWithTeachers[]>(() => {
    if (!isSuperAdmin || !adminsQuery.data || !teachersQuery.data) return [];
    return adminsQuery.data.map((admin) => {
      const schoolTeachers = teachersQuery.data.filter(
        (t) => t.school && admin.school && t.school === admin.school
      );
      return {
        ...admin,
        teachers: schoolTeachers,
        total_teachers: schoolTeachers.length,
        total_classes: schoolTeachers.reduce((s, t) => s + t.total_classes, 0),
        total_students: schoolTeachers.reduce((s, t) => s + t.total_students, 0),
      };
    });
  }, [isSuperAdmin, adminsQuery.data, teachersQuery.data]);

  // Teachers not matched to any admin's school
  const unassignedTeachers = useMemo<AdminTeacherAccount[]>(() => {
    if (!isSuperAdmin || !teachersQuery.data) return [];
    const assignedIds = new Set(
      adminsWithTeachers.flatMap((a) => a.teachers.map((t) => t.user_id))
    );
    return teachersQuery.data.filter((t) => !assignedIds.has(t.user_id));
  }, [isSuperAdmin, adminsWithTeachers, teachersQuery.data]);

  // Apply district/school filter to admin list
  const filteredAdmins = useMemo(() => {
    return adminsWithTeachers.filter((a) => {
      if (filterDistrict && a.district !== filterDistrict) return false;
      if (filterSchool && a.school !== filterSchool) return false;
      return true;
    });
  }, [adminsWithTeachers, filterDistrict, filterSchool]);

  const isLoading =
    teachersQuery.isLoading || (isSuperAdmin && adminsQuery.isLoading);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  // ── SuperAdmin view ──────────────────────────────────────────────────────────
  if (isSuperAdmin) {
    return (
      <div className="space-y-8">
        {/* Admin accordion */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <h3 className="font-semibold text-slate-800">School Admins</h3>
              <Badge variant="secondary" className="text-xs">
                {filteredAdmins.length}
              </Badge>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateAdmin(true)}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Admin
            </Button>
          </div>

          {adminsQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-red-200 bg-red-50">
              <Shield className="w-10 h-10 text-red-300 mb-3" />
              <p className="text-sm font-medium text-red-600">Failed to load admins</p>
              <p className="text-xs text-red-400 mt-1">
                {(adminsQuery.error as Error)?.message ?? "Unknown error"}
              </p>
              <button
                className="mt-3 text-xs text-red-500 underline"
                onClick={() => adminsQuery.refetch()}
              >
                Retry
              </button>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-slate-200">
              <Shield className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">No admins found</p>
              {(filterDistrict || filterSchool) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Try clearing the filters above
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAdmins.map((admin) => (
                <AdminCard
                  key={admin.user_id}
                  admin={admin}
                  onSelectClass={onSelectClass}
                  onRefresh={refreshAll}
                  onEdit={setEditAdmin}
                  onDelete={setDeleteAdminTarget}
                  isSuperAdmin
                />
              ))}
            </div>
          )}
        </div>

        {/* Unassigned teachers (only visible when no filter active) */}
        {unassignedTeachers.length > 0 && !filterDistrict && !filterSchool && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-slate-400" />
              <h3 className="font-semibold text-slate-500">Unassigned Teachers</h3>
              <Badge variant="secondary" className="text-xs">
                {unassignedTeachers.length}
              </Badge>
            </div>
            <TeachersSection
              teachers={unassignedTeachers}
              onSelectClass={onSelectClass}
              onRefresh={refreshTeachers}
              isSuperAdmin
              showAddButton={false}
            />
          </div>
        )}

        {/* Add teacher button for unassigned */}
        {!filterDistrict && !filterSchool && (
          <div className="flex justify-center pt-2">
            {/* TeachersSection handles its own create dialog */}
          </div>
        )}

        {/* Admin CRUD dialogs */}
        {showCreateAdmin && (
          <CreateSchoolAdminDialog
            open
            onClose={() => setShowCreateAdmin(false)}
            onCreated={refreshAdmins}
          />
        )}
        {editAdmin && (
          <EditAdminDialog
            admin={editAdmin}
            onClose={() => setEditAdmin(null)}
            onSaved={refreshAdmins}
          />
        )}
        {deleteAdminTarget && (
          <AlertDialog open onOpenChange={(o) => !o && setDeleteAdminTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete school admin?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete{" "}
                  <strong>{deleteAdminTarget.name}</strong>. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() =>
                    deleteAdminMutation.mutate(deleteAdminTarget.user_id)
                  }
                >
                  {deleteAdminMutation.isPending ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  }

  // ── School Admin view — flat teachers list ───────────────────────────────────
  return (
    <TeachersSection
      teachers={teachersQuery.data ?? []}
      onSelectClass={onSelectClass}
      onRefresh={refreshTeachers}
      isSuperAdmin={false}
      showAddButton
    />
  );
}
