/** Map aggregate mastery (0–100) to suggested problem difficulty for Level 3 progression hints. */
export function getDifficultyForMastery(masteryScore: number): "easy" | "medium" | "hard" {
  if (masteryScore >= 60) return "hard";
  if (masteryScore >= 25) return "medium";
  return "easy";
}
