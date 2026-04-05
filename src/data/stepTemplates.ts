/** Step templates for admin chapter forms (not loaded from API). */

export interface StepTemplate {
  id: string;
  label: string;
  description: string;
}

export const STEP_TEMPLATES = {
  "problem-solving": {
    id: "problem-solving",
    label: "Problem Solving",
    description: "Identify → Set Up → Substitute → Calculate → Verify",
    steps: ["Identify the Formula", "List Known Variables", "Substitute Values", "Calculate", "Verify Units"],
  },
  conceptual: {
    id: "conceptual",
    label: "Conceptual",
    description: "Observe → Predict → Explain → Connect",
    steps: ["Observe the Pattern", "Make a Prediction", "Explain the Mechanism", "Connect to Theory"],
  },
  "lab-style": {
    id: "lab-style",
    label: "Lab Style",
    description: "Hypothesis → Design → Data → Analysis → Conclusion",
    steps: ["State the Hypothesis", "Design the Setup", "Collect Data", "Analyze Results", "Draw Conclusions"],
  },
} as const;

export type StepTemplateId = keyof typeof STEP_TEMPLATES;
