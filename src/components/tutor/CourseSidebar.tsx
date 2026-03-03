import { useNavigate, useLocation } from "react-router-dom";
import { useTopicCompletion } from "@/hooks/useTopicCompletion";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, Circle, ArrowLeft, Home, Loader2 } from "lucide-react";

const TOPIC_STATE_STORAGE_KEY = "chemtutor_topic_state";

/** True if we have any saved tutor state for this topic so we can resume in practice instead of simulation. */
function hasSavedTutorState(userId: string | undefined, chapterId: string, topicIndex: number): boolean {
  if (!userId) return false;
  try {
    const key = `${TOPIC_STATE_STORAGE_KEY}_${userId}_${chapterId}_${topicIndex}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { currentLevel?: number; levelCache?: Record<number, unknown> };
    return typeof parsed?.currentLevel === "number" && parsed?.levelCache != null;
  } catch {
    return false;
  }
}

interface CourseSidebarProps {
  currentChapterId: string;
  currentTopicIndex?: number;
  open: boolean;
  /** Chapter title provided by parent after fetch */
  chapterTitle?: string;
  /** Ordered topic title list provided by parent after fetch */
  topicTitles?: string[];
  userId?: string;
}

export function CourseSidebar({
  currentChapterId,
  currentTopicIndex = 0,
  open,
  chapterTitle,
  topicTitles = [],
  userId,
}: CourseSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { getStatus } = useTopicCompletion(currentChapterId, userId);

  if (!open) return null;

  const isOnPracticePage = location.pathname.startsWith("/tutor/");

  const totalTopics = topicTitles.length;
  const completedCount = totalTopics > 0
    ? topicTitles.filter((_, i) => getStatus(i) === "completed").length
    : 0;
  const percentComplete = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

  return (
    <aside
      className={cn(
        "shrink-0 border-r border-border bg-card overflow-y-auto transition-all duration-300 ease-in-out h-[calc(100vh-57px)] sticky top-[57px]",
        open ? "w-[260px] opacity-100" : "w-0 opacity-0 overflow-hidden",
      )}
    >
      <div className="p-4 pt-5 pb-4 border-b border-border">
        {/* Unit name — primary hierarchy, more space from separator */}
        {chapterTitle ? (
          <h2 className="text-sm font-semibold text-foreground truncate mb-4">
            {chapterTitle}
          </h2>
        ) : (
          <div className="h-4 w-3/4 rounded bg-secondary/60 animate-pulse mb-4" />
        )}
        {/* Progress indicators — secondary, smaller and lighter */}
        {totalTopics > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-normal text-muted-foreground">
                {percentComplete}% complete
              </span>
              <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                {completedCount}/{totalTopics} topics
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300 ease-out",
                  percentComplete >= 100 ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-3 space-y-1">
        {topicTitles.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-secondary/40 animate-pulse" />
            ))
          : topicTitles.map((topic, i) => {
              const isActive = i === currentTopicIndex;
              const status = getStatus(i);

              return (
                <button
                  key={`${currentChapterId}-${i}`}
                  onClick={() => {
                    // If user has saved state for this topic (e.g. left while in Level 2), resume in tutor instead of simulation
                    const resumePractice = hasSavedTutorState(userId, currentChapterId, i);
                    navigate(resumePractice ? `/tutor/${currentChapterId}/${i}` : `/chapter/${currentChapterId}/${i}`);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : status === "completed"
                        ? "text-foreground hover:bg-secondary/40"
                        : status === "in-progress"
                          ? "text-foreground hover:bg-secondary/40"
                          : "text-muted-foreground hover:bg-secondary/40",
                  )}
                >
                  {status === "completed" ? (
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  ) : isActive ? (
                    <Clock className="w-4 h-4 text-accent shrink-0" />
                  ) : status === "in-progress" ? (
                    <Loader2 className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate">{topic}</span>
                </button>
              );
            })}
      </div>

      <div className="px-3 py-3 border-t border-border mt-2 space-y-1">
        {isOnPracticePage && (
          <button
            onClick={() => navigate(`/chapter/${currentChapterId}/${currentTopicIndex}`)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/40 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-amber-500" />
            Back to Simulation
          </button>
        )}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/40 transition-colors"
        >
          <Home className="w-3.5 h-3.5 text-amber-500" />
          Back to Chapters
        </button>
      </div>
    </aside>
  );
}
