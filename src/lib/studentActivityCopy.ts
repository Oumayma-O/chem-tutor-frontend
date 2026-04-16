import type { StudentAnalyticsMode } from "@/lib/studentAnalyticsPresentation";

export function getActivityCardTitle(options: {
  analyticsMode: StudentAnalyticsMode;
  chapterFilter?: string;
  unitTitle: (unitId: string) => string;
}): string {
  const { analyticsMode, chapterFilter, unitTitle } = options;
  if (analyticsMode === "exit-ticket") {
    return chapterFilter
      ? `Exit ticket submissions — ${unitTitle(chapterFilter)}`
      : "Recent exit ticket submissions";
  }
  if (analyticsMode === "all") {
    return chapterFilter
      ? `Activity — ${unitTitle(chapterFilter)}`
      : "Recent activity (practice + exit tickets)";
  }
  return chapterFilter
    ? `Attempts — ${unitTitle(chapterFilter)}`
    : "Recent attempts (all chapters)";
}

export function getActivityCardDescription(options: {
  analyticsMode: StudentAnalyticsMode;
  chapterFilter?: string;
}): string | null {
  const { analyticsMode, chapterFilter } = options;
  if (chapterFilter) return null;
  if (analyticsMode === "exit-ticket") {
    return "Newest first; scores from class exit tickets.";
  }
  if (analyticsMode === "all") {
    return "Newest first; practice and exit ticket rows mixed. Unfinished practice is omitted.";
  }
  return "Newest first; chapter on each row. Unfinished practice (not submitted) is omitted.";
}

export function getActivityEmptyStateCopy(options: {
  analyticsMode: StudentAnalyticsMode;
  chapterFilter?: string;
}): string {
  const { analyticsMode, chapterFilter } = options;
  if (analyticsMode === "exit-ticket") {
    return chapterFilter
      ? "No exit ticket submissions for this chapter in this class yet."
      : "No exit ticket submissions for this class yet.";
  }
  if (analyticsMode === "all") {
    return "No scored practice or exit ticket activity in scope yet.";
  }
  return chapterFilter
    ? "No submitted attempts for this chapter yet."
    : "No submitted attempts in the recent sample yet.";
}
