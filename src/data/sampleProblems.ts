import { Problem } from "@/types/chemistry";

// Problem pools organized by difficulty
export const problemPools = {
  easy: [
    {
      id: "zero-order-easy-1",
      title: "Zero-Order Reaction Kinetics",
      description: "The decomposition of compound A follows zero-order kinetics with k = 0.010 M/s. Initial concentration [A]₀ = 0.50 M. Find [A] after 10 s.",
      lesson: "Reaction Kinetics",
      difficulty: "easy" as const,
      steps: [
        { id: "e1-1", step_number: 1, type: "given" as const, label: "Equation", instruction: "Select the correct rate law:", content: "[A]ₜ = [A]₀ − k·t", equation_parts: ["[A]ₜ", "=", "[A]₀", "−", "k", "·", "t"], correct_equation: "[A]ₜ = [A]₀ − k · t" },
        { id: "e1-2", step_number: 2, type: "given" as const, label: "Knowns", instruction: "Identify known variables:", content: "[A]₀ = 0.50 M\nk = 0.010 M/s\nt = 10 s", labeled_values: [{ variable: "[A]₀", value: "0.50", unit: "M" }, { variable: "k", value: "0.010", unit: "M/s" }, { variable: "t", value: "10", unit: "s" }] },
        { id: "e1-3", step_number: 3, type: "interactive" as const, label: "Substitute", instruction: "Multiply k × t:", correct_answer: "0.10", hint: "Multiply the rate constant by time: 0.010 × 10 = ?" },
        { id: "e1-4", step_number: 4, type: "interactive" as const, label: "Calculate", instruction: "Subtract from [A]₀:", correct_answer: "0.40", hint: "Subtract your previous result from the initial concentration: 0.50 − 0.10 = ?" },
        { id: "e1-5", step_number: 5, type: "interactive" as const, label: "Answer", instruction: "Final concentration with units:", correct_answer: "0.40 M", hint: "Concentration is measured in molarity (M). Write your number followed by M." },
      ],
    },
    {
      id: "zero-order-easy-2",
      title: "Zero-Order Reaction Kinetics",
      description: "The decomposition of compound B follows zero-order kinetics with k = 0.020 M/s. Initial concentration [A]₀ = 1.00 M. Find [A] after 5 s.",
      lesson: "Reaction Kinetics",
      difficulty: "easy" as const,
      steps: [
        { id: "e2-1", step_number: 1, type: "given" as const, label: "Equation", instruction: "Select the correct rate law:", content: "[A]ₜ = [A]₀ − k·t", equation_parts: ["[A]ₜ", "=", "[A]₀", "−", "k", "·", "t"], correct_equation: "[A]ₜ = [A]₀ − k · t" },
        { id: "e2-2", step_number: 2, type: "given" as const, label: "Knowns", instruction: "Identify known variables:", content: "[A]₀ = 1.00 M\nk = 0.020 M/s\nt = 5 s", labeled_values: [{ variable: "[A]₀", value: "1.00", unit: "M" }, { variable: "k", value: "0.020", unit: "M/s" }, { variable: "t", value: "5", unit: "s" }] },
        { id: "e2-3", step_number: 3, type: "interactive" as const, label: "Substitute", instruction: "Multiply k × t:", correct_answer: "0.10", hint: "Multiply: 0.020 × 5 = ? Check your decimal placement." },
        { id: "e2-4", step_number: 4, type: "interactive" as const, label: "Calculate", instruction: "Subtract from [A]₀:", correct_answer: "0.90", hint: "Apply the rate law: [A]₀ − k·t. What's 1.00 − 0.10?" },
        { id: "e2-5", step_number: 5, type: "interactive" as const, label: "Answer", instruction: "Final concentration with units:", correct_answer: "0.90 M", hint: "Include the molarity unit (M) with your numerical answer." },
      ],
    },
  ],
  medium: [
    {
      id: "zero-order-medium-1",
      title: "Zero-Order Reaction Kinetics",
      description: "The decomposition of compound Y follows zero-order kinetics with k = 0.015 M/s. Initial concentration [A]₀ = 0.60 M. Find [A] after 10 s.",
      lesson: "Reaction Kinetics",
      difficulty: "medium" as const,
      steps: [
        { id: "m1-1", step_number: 1, type: "given" as const, label: "Equation", instruction: "Select the correct rate law:", content: "[A]ₜ = [A]₀ − k·t", equation_parts: ["[A]ₜ", "=", "[A]₀", "−", "k", "·", "t"], correct_equation: "[A]ₜ = [A]₀ − k · t" },
        { id: "m1-2", step_number: 2, type: "given" as const, label: "Knowns", instruction: "Identify known variables:", content: "[A]₀ = 0.60 M\nk = 0.015 M/s\nt = 10 s", labeled_values: [{ variable: "[A]₀", value: "0.60", unit: "M" }, { variable: "k", value: "0.015", unit: "M/s" }, { variable: "t", value: "10", unit: "s" }] },
        { id: "m1-3", step_number: 3, type: "interactive" as const, label: "Substitute", instruction: "Multiply k × t:", correct_answer: "0.15", hint: "Multiply 0.015 × 10. Count decimal places carefully." },
        { id: "m1-4", step_number: 4, type: "interactive" as const, label: "Calculate", instruction: "Subtract from [A]₀:", correct_answer: "0.45", hint: "How much concentration remains after subtracting the amount consumed?" },
        { id: "m1-5", step_number: 5, type: "interactive" as const, label: "Answer", instruction: "Final concentration with units:", correct_answer: "0.45 M", hint: "Express your final answer with the molarity unit (M)." },
      ],
    },
    {
      id: "zero-order-medium-2",
      title: "Zero-Order Reaction Kinetics",
      description: "The decomposition of compound Z follows zero-order kinetics with k = 0.025 M/s. Initial concentration [A]₀ = 0.75 M. Find [A] after 8 s.",
      lesson: "Reaction Kinetics",
      difficulty: "medium" as const,
      steps: [
        { id: "m2-1", step_number: 1, type: "given" as const, label: "Equation", instruction: "Select the correct rate law:", content: "[A]ₜ = [A]₀ − k·t", equation_parts: ["[A]ₜ", "=", "[A]₀", "−", "k", "·", "t"], correct_equation: "[A]ₜ = [A]₀ − k · t" },
        { id: "m2-2", step_number: 2, type: "given" as const, label: "Knowns", instruction: "Identify known variables:", content: "[A]₀ = 0.75 M\nk = 0.025 M/s\nt = 8 s", labeled_values: [{ variable: "[A]₀", value: "0.75", unit: "M" }, { variable: "k", value: "0.025", unit: "M/s" }, { variable: "t", value: "8", unit: "s" }] },
        { id: "m2-3", step_number: 3, type: "interactive" as const, label: "Substitute", instruction: "Multiply k × t:", correct_answer: "0.20", hint: "Think of 0.025 × 8 as (25 × 8) ÷ 1000 = ?" },
        { id: "m2-4", step_number: 4, type: "interactive" as const, label: "Calculate", instruction: "Subtract from [A]₀:", correct_answer: "0.55", hint: "Subtract the consumed amount from the initial concentration." },
        { id: "m2-5", step_number: 5, type: "interactive" as const, label: "Answer", instruction: "Final concentration with units:", correct_answer: "0.55 M", hint: "Include the molarity unit (M) with your result." },
      ],
    },
  ],
  hard: [
    {
      id: "zero-order-hard-1",
      title: "Zero-Order Reaction Kinetics",
      description: "The decomposition of compound W follows zero-order kinetics with k = 0.0125 M/s. Initial concentration [A]₀ = 0.85 M. Find [A] after 24 s.",
      lesson: "Reaction Kinetics",
      difficulty: "hard" as const,
      steps: [
        { id: "h1-1", step_number: 1, type: "given" as const, label: "Equation", instruction: "Select the correct rate law:", content: "[A]ₜ = [A]₀ − k·t", equation_parts: ["[A]ₜ", "=", "[A]₀", "−", "k", "·", "t"], correct_equation: "[A]ₜ = [A]₀ − k · t" },
        { id: "h1-2", step_number: 2, type: "given" as const, label: "Knowns", instruction: "Identify known variables:", content: "[A]₀ = 0.85 M\nk = 0.0125 M/s\nt = 24 s", labeled_values: [{ variable: "[A]₀", value: "0.85", unit: "M" }, { variable: "k", value: "0.0125", unit: "M/s" }, { variable: "t", value: "24", unit: "s" }] },
        { id: "h1-3", step_number: 3, type: "interactive" as const, label: "Substitute", instruction: "Multiply k × t:", correct_answer: "0.30", hint: "Break it down: 0.0125 × 24 = 0.0125 × 20 + 0.0125 × 4 = 0.25 + 0.05 = ?" },
        { id: "h1-4", step_number: 4, type: "interactive" as const, label: "Calculate", instruction: "Subtract from [A]₀:", correct_answer: "0.55", hint: "Initial minus consumed: 0.85 − 0.30 = ?" },
        { id: "h1-5", step_number: 5, type: "interactive" as const, label: "Answer", instruction: "Final concentration with units:", correct_answer: "0.55 M", hint: "Express concentration in molarity (M)." },
      ],
    },
    {
      id: "zero-order-hard-2",
      title: "Zero-Order Reaction Kinetics",
      description: "The decomposition of compound V follows zero-order kinetics with k = 0.0175 M/s. Initial concentration [A]₀ = 1.25 M. Find [A] after 30 s.",
      lesson: "Reaction Kinetics",
      difficulty: "hard" as const,
      steps: [
        { id: "h2-1", step_number: 1, type: "given" as const, label: "Equation", instruction: "Select the correct rate law:", content: "[A]ₜ = [A]₀ − k·t", equation_parts: ["[A]ₜ", "=", "[A]₀", "−", "k", "·", "t"], correct_equation: "[A]ₜ = [A]₀ − k · t" },
        { id: "h2-2", step_number: 2, type: "given" as const, label: "Knowns", instruction: "Identify known variables:", content: "[A]₀ = 1.25 M\nk = 0.0175 M/s\nt = 30 s", labeled_values: [{ variable: "[A]₀", value: "1.25", unit: "M" }, { variable: "k", value: "0.0175", unit: "M/s" }, { variable: "t", value: "30", unit: "s" }] },
        { id: "h2-3", step_number: 3, type: "interactive" as const, label: "Substitute", instruction: "Multiply k × t:", correct_answer: "0.525", hint: "175 × 30 = 5250, then move the decimal: 0.0175 × 30 = ?" },
        { id: "h2-4", step_number: 4, type: "interactive" as const, label: "Calculate", instruction: "Subtract from [A]₀:", correct_answer: "0.725", hint: "Line up decimals: 1.250 − 0.525 = ?" },
        { id: "h2-5", step_number: 5, type: "interactive" as const, label: "Answer", instruction: "Final concentration with units:", correct_answer: "0.725 M", hint: "Report with molarity unit (M)." },
      ],
    },
  ],
};

// Get a random problem from a pool, excluding already completed ones
export function getRandomProblem(
  difficulty: "easy" | "medium" | "hard",
  excludeIds: string[] = []
): Problem {
  const pool = problemPools[difficulty];
  const available = pool.filter((p) => !excludeIds.includes(p.id));

  if (available.length === 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return available[Math.floor(Math.random() * available.length)];
}

// Adaptive difficulty input for Level 3
export interface AdaptiveDifficultyInput {
  masteryScore: number;
  errorPatterns?: { category: string; count: number }[];
  skillMap?: { skillId: string; score: number; status: string }[];
}

export interface AdaptiveDifficultyOutput {
  difficulty: "easy" | "medium" | "hard";
  focusAreas: string[];
  problemStyle: "scaffolded" | "structured_multistep" | "mixed_conceptual_units";
}

// Difficulty by mastery: 0–25 easy, 25–60 medium, 60+ hard (so ~17% per example is not treated as weak)
export function getDifficultyForMastery(masteryScore: number): "easy" | "medium" | "hard";
export function getDifficultyForMastery(input: AdaptiveDifficultyInput): AdaptiveDifficultyOutput;
export function getDifficultyForMastery(
  input: number | AdaptiveDifficultyInput
): "easy" | "medium" | "hard" | AdaptiveDifficultyOutput {
  if (typeof input === "number") {
    if (input >= 60) return "hard";
    if (input >= 25) return "medium";
    return "easy";
  }

  const { masteryScore, errorPatterns = [], skillMap = [] } = input;

  const weakSkills = skillMap
    .filter((s) => s.status === "at_risk" || s.score < 20)
    .map((s) => s.skillId);

  const topErrors = [...errorPatterns]
    .sort((a, b) => b.count - a.count)
    .slice(0, 2)
    .map((e) => e.category);

  const focusAreas = [...new Set([...weakSkills, ...topErrors])];

  if (masteryScore >= 60) {
    return {
      difficulty: "hard",
      focusAreas,
      problemStyle: "mixed_conceptual_units",
    };
  }
  if (masteryScore >= 25) {
    return {
      difficulty: "medium",
      focusAreas,
      problemStyle: "structured_multistep",
    };
  }
  return {
    difficulty: "easy",
    focusAreas,
    problemStyle: "scaffolded",
  };
}
