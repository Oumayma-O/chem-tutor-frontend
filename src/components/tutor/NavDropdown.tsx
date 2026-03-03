import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiGetAllProgress } from "@/lib/api";
import { JoinClassDialog } from "./JoinClassDialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Users, UserCircle, Trophy, BookOpen } from "lucide-react";

export function NavDropdown() {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuth();
  const [showJoinClass, setShowJoinClass] = useState(false);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ completed: 0, started: 0 });

  const initials = profile?.display_name
    ? profile.display_name.charAt(0).toUpperCase()
    : "?";

  useEffect(() => {
    if (!user) return;
    apiGetAllProgress(user.id)
      .then((records) => {
        const completed = records.filter((r) => r.status === "completed").length;
        const started = records.filter((r) => r.status === "in-progress").length;
        setStats({ completed, started });
      })
      .catch(() => {});
  }, [user]);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
            <Avatar className="h-8 w-8">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 bg-popover z-50">
          {profile && (
            <>
              <div className="px-3 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{profile.display_name}</p>
                    {user?.email && (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    )}
                  </div>
                  <Avatar className="h-9 w-9">
                    {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name} />}
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                </div>
                {profile.grade_level && (
                  <p className="text-xs text-muted-foreground mt-1">{profile.grade_level}</p>
                )}
              </div>

              {/* Course-level progress */}
              <div className="px-3 pb-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Course progress</span>
                  <span className="font-medium text-foreground">{stats.completed} completed</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-medium text-foreground">{stats.completed}</span>
                    <span className="text-xs text-muted-foreground">completed</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">{stats.started}</span>
                    <span className="text-xs text-muted-foreground">in progress</span>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={() => { navigate("/profile"); setOpen(false); }} className="gap-2 cursor-pointer">
            <UserCircle className="w-4 h-4" />
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setShowJoinClass(true); setOpen(false); }} className="gap-2 cursor-pointer">
            <Users className="w-4 h-4" />
            Join Classroom
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => { signOut(); navigate("/"); setOpen(false); }}
            className="gap-2 text-destructive cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <JoinClassDialog
        open={showJoinClass}
        onOpenChange={setShowJoinClass}
        onJoined={() => setShowJoinClass(false)}
      />
    </>
  );
}
