// Cognitive modeling types for tracking student thinking process

export type ThinkingStepType = 
  | "formula_selection"
  | "variable_identification"
  | "substitution"
  | "calculation"
  | "units_handling"
  | "final_answer";

export type ThinkingCategory = "conceptual" | "procedural" | "units";

export type ErrorCategory = 
  | "conceptual"      // Wrong formula, wrong chemical principle, misunderstanding reaction order
  | "procedural"      // Correct concept, wrong setup
  | "computational"   // Math, rounding, unit conversion
  | "representation"; // Graph interpretation, symbolic misuse

export type ErrorSubcategory =
  | "rate_law_understanding"
  | "formula_setup"
  | "arithmetic"
  | "dimensional_awareness"
  | "graph_reading"
  | "symbolic_notation"
  | "variable_substitution"
  | "unit_mismatch";

export type ErrorSeverity = "blocking" | "slowing" | "minor";

export interface ThinkingStep {
  id: string;
  type: ThinkingStepType;
  category: ThinkingCategory;
  label: string;
  studentInput: string;
  expectedValue?: string;
  isCorrect?: boolean;
  timestamp: number;
  timeSpent: number; // seconds
}

export interface ClassifiedError {
  stepId: string;
  category: ErrorCategory;
  subcategory?: ErrorSubcategory;
  severity: ErrorSeverity;
  description: string;
  conceptMissing?: string;
  misconception_tag?: string;
  suggestedIntervention: NextStepAction;
}

export interface MisconceptionPattern {
  tag: string;
  category: ErrorCategory;
  subcategory?: ErrorSubcategory;
  count: number;
  description: string;
}

export type NextStepAction = 
  | "worked_example"
  | "faded_example"
  | "full_problem"
  | "micro_hint"
  | "concept_refresher"
  | "arithmetic_drill"
  | "unit_drill";

export interface SkillMastery {
  skillId: string;
  skillName: string;
  category: "reaction_concepts" | "rate_laws" | "variable_isolation" | "unit_conversion" | "graph_interpretation";
  score: number; // 0-100
  status: "mastered" | "developing" | "at_risk";
  lastUpdated: number;
  problemCount: number;
}

export interface ProblemAttempt {
  problemId: string;
  timestamp: number;
  thinkingSteps: ThinkingStep[];
  errors: ClassifiedError[];
  hintsUsed: number;
  scaffoldingLevel: number;
  totalTimeSeconds: number;
  stepFailures: Record<string, number>; // stepId -> failure count
  firstAttemptCorrect: boolean;
  finalScore: number;
}

export interface StudentCognitiveProfile {
  studentId: string;
  masteryScore: number;
  skillMap: SkillMastery[];
  recentAttempts: ProblemAttempt[];
  errorPatterns: {
    category: ErrorCategory;
    count: number;
    recentSteps: string[];
  }[];
  learningPatternSummary?: string;
  predictedProficiency: Record<string, number>; // standard -> predicted score
  weakTopics: string[];
}

export interface LearningInsight {
  type: "strength" | "weakness" | "pattern" | "recommendation";
  title: string;
  description: string;
  relatedSkills: string[];
  confidence: number;
}

export interface ExitTicketResult {
  problemId: string;
  timestamp: number;
  completed: boolean;
  hintsUsed: number;
  finalScore: number;
  conceptualBreakdown: Record<string, number>;
  confidenceRating: number; // 0-100
  readyFlag: boolean;
  timeSpentSeconds: number;
}

// Standards alignment
export interface StandardAlignment {
  ngss: string;
  californiaState?: string;
  skillCategory: string;
  description: string;
}

export interface TeacherAnalytics {
  studentId: string;
  studentName: string;
  overallMastery: number;
  skillBreakdown: SkillMastery[];
  growthTrend: "improving" | "stable" | "declining";
  growthPercentage: number;
  predictedProficiency: number;
  recentErrors: ClassifiedError[];
  standardsProgress: Record<string, number>;
  exitTickets: ExitTicketResult[];
  lastActive: number;
}

export interface TeacherDashboardFilters {
  standard?: string;
  errorType?: ErrorCategory;
  growthLevel?: "improving" | "stable" | "declining";
  skillCategory?: string;
}
