import type { Level, ProgressionResult } from "@/types/chemistry";

/** True when the progression flow offers advancing from Level 2 to Level 3. */
export function isLevel2To3Advance(
  result: ProgressionResult,
  currentLevel: Level | number,
): boolean {
  return result.should_advance && result.next_level === 3 && currentLevel === 2;
}

/** @deprecated Use {@link isLevel2To3Advance} */
export const isAdvanceFromLevel2To3 = isLevel2To3Advance;

/**
 * Level 2 problems completed for the L2→L3 modal, including the attempt that triggered it.
 * Combines in-session `levelSolved[2]` (persisted via tutor snapshot) with optional
 * backend `level_2_completions` from mastery API so refresh cannot bypass the cap.
 */
export function effectiveLevel2CompletedCountIncludingCurrent(args: {
  levelSolvedAtLevel2: number;
  masteryLevel2Completions: number | null;
}): number {
  const fromSessionIncludingCurrent = args.levelSolvedAtLevel2 + 1;
  const fromMastery = args.masteryLevel2Completions ?? 0;
  return Math.max(fromSessionIncludingCurrent, fromMastery);
}
