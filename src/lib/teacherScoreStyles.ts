/** Breakpoints aligned across badges and Recharts mastery bars (teacher dashboard). */
export const TEACHER_SCORE_STRONG_MIN = 80;
export const TEACHER_SCORE_MODERATE_MIN = 50;

/**
 * Tailwind classes for percentage / mastery badges (teacher dashboard).
 * Thresholds: ≥80% strong, ≥50% moderate, else at-risk styling.
 */
export function scorePercentBadgeClassName(pct: number): string {
  if (pct >= TEACHER_SCORE_STRONG_MIN) return "border-green-500 text-green-700 dark:text-green-400";
  if (pct >= TEACHER_SCORE_MODERATE_MIN) return "border-yellow-500 text-yellow-700 dark:text-yellow-400";
  return "border-red-500 text-red-700 dark:text-red-400";
}

/**
 * HSL fills for Recharts bars (student mastery, category breakdown).
 * Uses the same thresholds as {@link scorePercentBadgeClassName}.
 */
export function masteryPercentBarColorHsl(pct: number): string {
  if (pct >= TEACHER_SCORE_STRONG_MIN) return "hsl(152 60% 45%)";
  if (pct >= TEACHER_SCORE_MODERATE_MIN) return "hsl(38 92% 55%)";
  return "hsl(0 72% 55%)";
}

/**
 * Pass/fail for assessment rows (practice / exit ticket %) — uses the same bar as {@link scorePercentBadgeClassName} “strong”.
 * Cohort mastery bands (50 / 75) in roster views use different rules; do not use this there.
 */
export function isAssessmentPassingPercent(pct: number): boolean {
  return pct >= TEACHER_SCORE_STRONG_MIN;
}
