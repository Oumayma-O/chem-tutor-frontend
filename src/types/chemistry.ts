export type StepType = "given" | "interactive" | "drag_drop" | "variable_id";

export interface KnownVariable {
  name: string;
  value: string;
  unit: string;
}

export interface SolutionStep {
  id: string;
  stepNumber: number;
  type: StepType;
  label: string;
  instruction: string;
  content?: string;
  placeholder?: string;
  correctAnswer?: string;
  hint?: string;
  equationParts?: string[];
  correctEquation?: string;
  knownVariables?: KnownVariable[];
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  steps: SolutionStep[];
  topic: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface ReferenceStep {
  stepNumber: number;
  title: string;
  content: string;
}

export interface StudentAnswer {
  stepId: string;
  answer: string;
  isCorrect?: boolean;
  attempts: number;
  firstAttemptCorrect?: boolean;
}

export interface StudentProfile {
  masteryScore: number;
  currentLevel: 1 | 2 | 3;
  weakTopics: string[];
  errorPatterns: ErrorPattern[];
  completedProblems: string[];
}

export interface ErrorPattern {
  type: string;
  description: string;
  count: number;
  weight: number;
}

export type Level = 1 | 2 | 3;

export interface LevelConfig {
  level: Level;
  title: string;
  description: string;
  givenStepsCount: number;
}

/** Level config. givenStepsCount: Level 1 = all steps (up to 6), Level 2 = 2 given, Level 3 = 0. */
export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    title: "Fully Worked Example",
    description: "Observe the complete, step-by-step solution. Problems may have 3–6 steps depending on topic.",
    givenStepsCount: 6,
  },
  {
    level: 2,
    title: "Faded Example",
    description: "Complete the missing steps. The first two steps are shown as scaffolding.",
    givenStepsCount: 2,
  },
  {
    level: 3,
    title: "Practice Problem",
    description: "Solve independently with minimal scaffolding. Difficulty adapts to your mastery.",
    givenStepsCount: 0,
  },
];


export interface ProgressionResult {
  shouldAdvance: boolean;
  nextLevel: Level;
  reason: string;
  suggestedDifficulty?: "easy" | "medium" | "hard";
}
