import { format } from "date-fns";
import { TEACHER_SCORE_MODERATE_MIN, TEACHER_SCORE_STRONG_MIN } from "@/lib/teacherScoreStyles";

export type StudentAnalyticsMode = "all" | "practice" | "exit-ticket";

export type SuggestedActionSpec = {
  label: string;
  variant: "default" | "secondary" | "outline";
};

export function buildStudentScopeText(options: {
  analyticsMode: StudentAnalyticsMode;
  chapterFilter?: string;
  analyticsLesson: number | "all";
  analyticsDate?: Date;
  unitTitle: (unitId: string) => string;
  lessonTitle?: string;
}): string {
  const {
    analyticsMode,
    chapterFilter,
    analyticsLesson,
    analyticsDate,
    unitTitle,
    lessonTitle,
  } = options;
  const modePart =
    analyticsMode === "practice" ? "Practice" : analyticsMode === "exit-ticket" ? "Exit Ticket" : "All";
  let scopePart = "";
  if (chapterFilter && analyticsLesson !== "all") {
    scopePart = ` for ${lessonTitle ?? `Lesson ${analyticsLesson + 1}`}`;
  } else if (chapterFilter) {
    scopePart = ` for ${unitTitle(chapterFilter)}`;
  }
  const datePart = analyticsDate ? ` on ${format(analyticsDate, "MMM d, yyyy")}` : "";
  return `Viewing ${modePart} data${scopePart}${datePart}.`;
}

export function getSuggestedActionSpecs(masteryPct: number): SuggestedActionSpec[] {
  if (masteryPct < TEACHER_SCORE_MODERATE_MIN) {
    return [
      { label: "Assign Worked Examples", variant: "default" },
      { label: "Recommend Simulation", variant: "secondary" },
    ];
  }
  if (masteryPct < TEACHER_SCORE_STRONG_MIN) {
    return [
      { label: "Targeted Practice", variant: "default" },
      { label: "Issue Exit Ticket", variant: "secondary" },
    ];
  }
  return [
    { label: "Challenge Problems", variant: "default" },
    { label: "Issue Exit Ticket", variant: "outline" },
  ];
}
