import { Problem, StudentAnswer, type SolutionStep } from "@/types/chemistry";
import { ProblemCard } from "@/components/tutor/layout";
import { InteractiveStep } from "@/components/tutor/steps";

export interface ProblemExitTicketAssessmentProps {
  problem: Problem;
  steps: Array<SolutionStep & { type: "interactive" }>;
  answers: Record<string, StudentAnswer>;
  onAnswerChange: (stepId: string, answer: string) => void;
  onCheckAnswer: (stepId: string) => void;
}

/** Problem-based exit ticket: single generated problem, interactive steps, no hints. */
export function ProblemExitTicketAssessment({
  problem,
  steps,
  answers,
  onAnswerChange,
  onCheckAnswer,
}: ProblemExitTicketAssessmentProps) {
  return (
    <>
      <ProblemCard problem={problem} />
      <div className="mt-6 space-y-4">
        {steps.map((step) => (
          <InteractiveStep
            key={step.id}
            step={step}
            answer={answers[step.id]}
            onAnswerChange={onAnswerChange}
            onCheckAnswer={onCheckAnswer}
            showHint={false}
            onRequestHint={() => {}}
          />
        ))}
      </div>
    </>
  );
}
