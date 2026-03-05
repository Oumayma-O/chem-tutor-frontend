import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { apiGetAllProgress } from "@/lib/api";
import { JoinClassDialog } from "./JoinClassDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Users, UserCircle, Trophy, BookOpen, FlaskConical } from "lucide-react";

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
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 bg-popover z-50 p-0">
          {profile && (
            <>
              {/* Header section */}
              <div className="px-4 py-3.5 bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {profile.display_name}
                    </p>
                    {user?.email && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Course + Grade pills */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {profile.course && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] gap-1 bg-primary/10 text-primary border-0"
                    >
                      <FlaskConical className="w-2.5 h-2.5" />
                      {profile.course}
                    </Badge>
                  )}
                  {profile.grade_level && !profile.course && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-secondary/80"
                    >
                      {profile.grade_level}
                    </Badge>
                  )}
                  {profile.classroom_name && (
                    <Badge
                      variant="outline"
                      className="text-[10px] gap-1 border-primary/30 text-primary"
                    >
                      <Users className="w-2.5 h-2.5" />
                      {profile.classroom_name}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Stats strip */}
              <div className="px-4 py-2.5 flex items-center gap-4 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-foreground">
                    {stats.completed}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    completed
                  </span>
                </div>
                <div className="h-3.5 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">
                    {stats.started}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    in progress
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="py-1">
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
                setShowJoinClass(true);
                setOpen(false);
              }}
              className="gap-2.5 cursor-pointer px-4 py-2"
            >
              <Users className="w-4 h-4 text-muted-foreground" />
              Join Classroom
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="my-0" />

          <div className="py-1">
            <DropdownMenuItem
              onClick={() => {
                signOut();
                navigate("/");
                setOpen(false);
              }}
              className="gap-2.5 cursor-pointer px-4 py-2 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </DropdownMenuItem>
          </div>
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
