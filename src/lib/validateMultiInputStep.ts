import { apiValidateStep } from "@/lib/api";
import type { Problem, SolutionStep } from "@/types/chemistry";

export async function validateMultiInputStep(
  problem: Problem,
  step: SolutionStep,
  studentAnswer: string,
  correctAnswer: string,
): Promise<{ isCorrect: boolean; feedback?: string }> {
  const data = await apiValidateStep({
    student_answer: studentAnswer,
    correct_answer: correctAnswer,
    step_id: step.id,
    step_number: step.step_number,
    step_label: step.label,
    step_type: "multi_input",
    step_instruction: step.instruction,
    problem_context: problem.description,
  });
  return {
    isCorrect: data.is_correct,
    feedback: data.feedback?.trim() || undefined,
  };
}
