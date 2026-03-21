import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home } from "lucide-react";

const LESSON_STATE_STORAGE_KEY = "chemtutor_lesson_state";

type LessonStatus = "not-started" | "in-progress" | "completed";

/** Returns 0–100 progress for the ring based on saved level state + overall status. */
function getLessonProgress(
  status: LessonStatus,
  userId: string | undefined,
  unitId: string,
  lessonIndex: number,
): number {
  if (status === "completed") return 100;
  if (status === "not-started") return 0;
  if (userId) {
    try {
      const key = `${LESSON_STATE_STORAGE_KEY}_${userId}_${unitId}_${lessonIndex}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { currentLevel?: number };
        const level = parsed?.currentLevel ?? 1;
        if (level >= 3) return 70;
        if (level >= 2) return 40;
        return 15;
      }
    } catch {}
  }
  return 20;
}

/** SVG circular progress ring — 16×16, advances clockwise from top. */
function LessonRing({ progress }: { progress: number }) {
  const size = 18;
  const r = 7;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - Math.min(progress, 100) / 100);
  const isComplete = progress >= 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      style={{ transition: "all 0.4s ease" }}
    >
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="text-border opacity-60"
      />
      {progress > 0 && (
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          className={isComplete ? "text-green-500" : "text-amber-500"}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      )}
      {isComplete && (
        <circle cx={cx} cy={cy} r={r * 0.38} fill="currentColor" className="text-green-500" />
      )}
    </svg>
  );
}

/** True if we have any saved tutor state for this lesson so we can resume in practice. */
function hasSavedTutorState(userId: string | undefined, unitId: string, lessonIndex: number): boolean {
  if (!userId) return false;
  try {
    const key = `${LESSON_STATE_STORAGE_KEY}_${userId}_${unitId}_${lessonIndex}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { currentLevel?: number; levelCache?: Record<number, unknown> };
    return typeof parsed?.currentLevel === "number" && parsed?.levelCache != null;
  } catch {
    return false;
  }
}

interface CourseSidebarProps {
  currentUnitId: string;
  currentLessonIndex?: number;
  open: boolean;
  unitTitle?: string;
  lessonTitles?: string[];
  userId?: string;
  /** Lesson completion status from parent (single source of truth — avoids duplicate progress API calls). */
  getLessonStatus: (lessonIndex: number) => LessonStatus;
}

export function CourseSidebar({
  currentUnitId,
  currentLessonIndex = 0,
  open,
  unitTitle,
  lessonTitles = [],
  userId,
  getLessonStatus: getStatus,
}: CourseSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!open) return null;

const totalLessons = lessonTitles.length;
  const completedCount = totalLessons > 0
    ? lessonTitles.filter((_, i) => getStatus(i) === "completed").length
    : 0;
  const percentComplete = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <aside
      className={cn(
        "shrink-0 border-r border-border bg-card overflow-y-auto transition-all duration-300 ease-in-out h-[calc(100vh-57px)] fixed left-0 top-[57px] z-50 lg:sticky lg:z-auto",
        open ? "w-[260px] opacity-100" : "w-0 opacity-0 overflow-hidden",
      )}
    >
      <div className="p-4 pt-5 pb-4 border-b border-border">
        {unitTitle ? (
          <h2 className="text-sm font-semibold text-foreground truncate mb-4">
            {unitTitle}
          </h2>
        ) : (
          <div className="h-4 w-3/4 rounded bg-secondary/60 animate-pulse mb-4" />
        )}
        {totalLessons > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-normal text-muted-foreground">
                {percentComplete}% complete
              </span>
              <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                {completedCount}/{totalLessons} lessons
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
        {lessonTitles.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-secondary/40 animate-pulse" />
            ))
          : lessonTitles.map((lesson, i) => {
              const isActive = i === currentLessonIndex;
              const status = getStatus(i);
              const progress = getLessonProgress(status, userId, currentUnitId, i);

              return (
                <button
                  key={`${currentUnitId}-${i}`}
                  onClick={() => {
                    const resumePractice = hasSavedTutorState(userId, currentUnitId, i);
                    navigate(resumePractice ? `/tutor/${currentUnitId}/${i}` : `/unit/${currentUnitId}/${i}`);
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
                  <LessonRing progress={progress} />
                  <span className="truncate">{lesson}</span>
                </button>
              );
            })}
      </div>

      <div className="px-3 py-3 border-t border-border mt-2 space-y-1">
        <button
          onClick={() => navigate("/", { state: location.state })}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary/40 transition-colors"
        >
          <Home className="w-3.5 h-3.5 text-amber-500" />
          Back to Units
        </button>
      </div>
    </aside>
  );
}
