import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiGetAllProgress } from "@/lib/api";
import { JoinClassDialog } from "@/components/tutor/layout/JoinClassDialog";
import { ClassroomEnrollmentCard } from "@/components/layout/ClassroomEnrollmentCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  Users,
  Trophy,
  BookOpen,
  GraduationCap,
  UserCircle,
  Settings,
} from "lucide-react";

function initialsFromName(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

export type UserAccountMenuVariant = "student" | "teacher";

export interface UserAccountMenuProps {
  variant: UserAccountMenuVariant;
  /** Shown in the stats row for teachers (classes owned). */
  managedClassCount?: number;
}

export function UserAccountMenu({ variant, managedClassCount = 0 }: UserAccountMenuProps) {
  const navigate = useNavigate();
  const { profile, user, role, signOut, refreshProfile } = useAuth();
  const [showJoinClass, setShowJoinClass] = useState(false);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ completed: 0, started: 0 });

  const initials = profile?.display_name ? initialsFromName(profile.display_name) : "?";
  const roleLabel =
    role === "superadmin" ? "Super Admin" :
    role === "admin" ? "School Admin" :
    role === "teacher" ? "Teacher" : "Student";
  const isStaffAdmin = role === "admin" || role === "superadmin";

  useEffect(() => {
    if (!user || variant !== "student") return;
    apiGetAllProgress(user.id)
      .then((records) => {
        const completed = records.filter((r) => r.status === "completed").length;
        const started = records.filter((r) => r.status === "in-progress").length;
        setStats({ completed, started });
      })
      .catch(() => {});
  }, [user, variant]);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Account menu"
          >
            <Avatar className="h-9 w-9 border border-border shadow-sm">
              <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 bg-popover z-[100] p-0">
          {profile && (
            <>
              <div className="px-4 py-3.5 bg-muted/30 border-b border-border/80">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border ring-2 ring-primary/15">
                    <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {profile.display_name}
                    </p>
                    {user?.email && (
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    )}
                    {(profile.course || profile.grade_level) && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {profile.course || profile.grade_level}
                      </p>
                    )}
                    <Badge variant="secondary" className="mt-1.5 text-[10px] h-5 px-1.5 font-medium">
                      {roleLabel}
                    </Badge>
                  </div>
                </div>
              </div>

              {!isStaffAdmin && (
                <div className="px-4 py-2.5 flex items-center gap-4 border-b border-border">
                  {variant === "student" ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-medium text-foreground">{stats.completed}</span>
                        <span className="text-[10px] text-muted-foreground">completed</span>
                      </div>
                      <div className="h-3.5 w-px bg-border" />
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-foreground">{stats.started}</span>
                        <span className="text-[10px] text-muted-foreground">in progress</span>
                      </div>
                    </>
                  ) : variant === "teacher" ? (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 w-full text-left rounded-md px-1 -mx-1 py-0.5 hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        navigate({ pathname: "/", search: "" });
                        setOpen(false);
                      }}
                      title="Open Class overview"
                      aria-label="Open Class tab on Teacher Dashboard"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs font-medium text-foreground">Classes managed</span>
                      <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                        {managedClassCount}
                      </span>
                    </button>
                  ) : null}
                </div>
              )}

              {variant === "student" && profile.classroom_name && (
                <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                  <ClassroomEnrollmentCard />
                </div>
              )}
            </>
          )}

          <div className="py-1">
            {variant === "student" && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    navigate("/profile");
                    setOpen(false);
                  }}
                  className="gap-2.5 cursor-pointer px-4 py-2"
                >
                  <UserCircle className="w-4 h-4 text-muted-foreground" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void refreshProfile();
                    setShowJoinClass(true);
                    setOpen(false);
                  }}
                  className="gap-2.5 cursor-pointer px-4 py-2"
                >
                  <Users className="w-4 h-4 text-muted-foreground" />
                  {profile?.classroom_name ? "Change classroom" : "Join classroom"}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem
              onClick={() => {
                navigate("/settings");
                setOpen(false);
              }}
              className="gap-2.5 cursor-pointer px-4 py-2"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              Account Settings
            </DropdownMenuItem>
          </div>
          <DropdownMenuSeparator className="my-0" />

          <div className="p-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 h-auto py-2 px-4 font-normal text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                signOut();
                navigate("/");
                setOpen(false);
              }}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {variant === "student" && (
        <JoinClassDialog
          open={showJoinClass}
          onOpenChange={setShowJoinClass}
          onJoined={() => {
            setShowJoinClass(false);
            void refreshProfile();
          }}
        />
      )}
    </>
  );
}
