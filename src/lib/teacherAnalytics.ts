import { ProblemAttempt } from "@/types/cognitive";

export interface TeachingStandard {
  id: string;
  name: string;
  description: string;
  category?: string;
}

export const TEACHING_STANDARDS: TeachingStandard[] = [
  {
    id: "ngss-hs-ps1-5",
    name: "NGSS HS-PS1-5",
    description: "Apply scientific principles to explain reaction rates",
    category: "NGSS",
  },
  {
    id: "ngss-hs-ps1-6",
    name: "NGSS HS-PS1-6",
    description: "Design and refine systems using reaction kinetics",
    category: "NGSS",
  },
  {
    id: "ca-chem-8a",
    name: "CA Chem 8a",
    description: "Reaction rates and rate laws",
    category: "California",
  },
  {
    id: "ca-chem-8b",
    name: "CA Chem 8b",
    description: "Factors affecting reaction rates",
    category: "California",
  },
];

export function calculateGrowthTrend(
  attempts: ProblemAttempt[],
): { direction: "up" | "down" | "stable"; percentage: number } {
  if (attempts.length < 2) return { direction: "stable", percentage: 0 };
  const recentScores = attempts.slice(0, 5).map((a) => a.finalScore);
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const olderScores = attempts.slice(5, 10).map((a) => a.finalScore);
  if (olderScores.length === 0) {
    const diff = recentScores[0] - recentScores[recentScores.length - 1];
    return { direction: diff > 5 ? "up" : diff < -5 ? "down" : "stable", percentage: diff };
  }
  const avgOlder = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
  const diff = avgRecent - avgOlder;
  return { direction: diff > 5 ? "up" : diff < -5 ? "down" : "stable", percentage: diff };
}

