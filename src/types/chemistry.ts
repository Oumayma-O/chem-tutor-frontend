export type StepType =
  | "given"
  | "interactive"
  | "drag_drop"
  | "multi_input"
  | "comparison";

/** Multi-field worked-example rows (e.g. extracted rates / concentrations). */
export interface InputField {
  label: string;
  value: string;
  unit: string;
}

export interface SolutionStep {
  id: string;
  step_number: number;
  type: StepType;
  label: string;
  instruction: string;
  placeholder?: string;
  /** Show-your-work trace (≤20 words). Only rendered in Level 1 given steps. Null for trivial reads. */
  explanation?: string;
  /** Same as backend ``key_rule``; forwarded to POST /problems/hint. */
  key_rule?: string | null;
  /** Human-readable skill exercised in this step (e.g. "Write rate law expressions from experimental data"). */
  skill_used?: string | null;
  correct_answer?: string;
  hint?: string;
  equation_parts?: string[];
  correct_equation?: string;
  /** When type is multi_input, rows render from here. */
  input_fields?: InputField[];
  comparison_parts?: string[];
  content?: string;
}

/** Cognitive blueprint from problem generation — determines badge and tooltip in UI. */
export type CognitiveBlueprint = "solver" | "recipe" | "architect" | "detective" | "lawyer";

export interface Problem {
  id: string;
  title: string;
  description: string;
  steps: SolutionStep[];
  lesson: string;
  difficulty: "easy" | "medium" | "hard";
  /** Cognitive blueprint for this problem (from backend generation). */
  blueprint?: CognitiveBlueprint;
}

export interface ReferenceStep {
  step_number: number;
  title: string;
  content: string;
}

export interface StudentAnswer {
  step_id: string;
  answer: string;
  is_correct?: boolean;
  attempts: number;
  first_attempt_correct?: boolean;
  validation_feedback?: string;
}

export interface StudentProfile {
  mastery_score: number;
  current_level: 1 | 2 | 3;
  weak_lessons: string[];
  error_patterns: ErrorPattern[];
  completed_problems: string[];
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
  given_steps_count: number;
}

/** Level config. given_steps_count: Level 1 = all steps (up to 6), Level 2 = 2 given, Level 3 = 0. */
export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    title: "Fully Worked Example",
    description: "Observe the complete, step-by-step solution. Problems may have 3–6 steps depending on lesson.",
    given_steps_count: 6,
  },
  {
    level: 2,
    title: "Faded Example",
    description: "Complete the missing steps. The first two steps are shown as scaffolding.",
    given_steps_count: 2,
  },
  {
    level: 3,
    title: "Practice Problem",
    description: "Solve independently with minimal scaffolding. Difficulty adapts to your mastery.",
    given_steps_count: 0,
  },
];


export interface ProgressionResult {
  should_advance: boolean;
  next_level: Level;
  reason: string;
  suggested_difficulty?: "easy" | "medium" | "hard";
}
