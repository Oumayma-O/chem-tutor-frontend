import { SolutionStep, StudentAnswer } from "@/types/chemistry";
import { shuffleEquationPartsSeeded } from "@/lib/equationDragDrop";
import { GivenStep } from "./GivenStep";
import { EquationBuilder } from "./EquationBuilder";
import { MultiInput } from "./MultiInput";
import { ComparisonStep } from "./ComparisonStep";
import { InteractiveStep } from "./InteractiveStep";

interface TutorStepRendererProps {
  /** Current problem id — stable keys for given/read-only steps within this problem. */
  problemId: string;
  displaySteps: SolutionStep[];
  answers: Record<string, StudentAnswer>;
  hints: Record<string, string>;
  structuredStepComplete: Record<string, boolean>;
  hintLoading: Set<string>;
  checkingAnswer: Set<string>;
  handleValidateEquation: (orderedParts: string[], step: SolutionStep) => Promise<boolean>;
  handleStructuredStepComplete: (stepId: string, correct: boolean) => void;
  handleRequestHint: (stepId: string) => void;
  handleAnswerChange: (stepId: string, value: string) => void;
  handleCheckAnswer: (stepOrId: string | SolutionStep) => Promise<void>;
}

export function TutorStepRenderer({
  problemId,
  displaySteps,
  answers,
  hints,
  structuredStepComplete,
  hintLoading,
  checkingAnswer,
  handleValidateEquation,
  handleStructuredStepComplete,
  handleRequestHint,
  handleAnswerChange,
  handleCheckAnswer,
}: TutorStepRendererProps) {
  const callHandleCheckAnswer = (stepId: string) => {
    return handleCheckAnswer(stepId);
  };

  return (
    <>
      {displaySteps.map((step) => {
        if (step.is_given) {
          return <GivenStep key={`${problemId}-${step.id}`} step={step} />;
        }

        if (step.type === "drag_drop" && step.equation_parts) {
          const display = step.equation_parts_display;
          const hasStableDisplay =
            Array.isArray(display) && display.length === step.equation_parts.length && display.length > 0;
          const bank =
            hasStableDisplay
              ? display
              : step.equation_parts.length > 1
                ? shuffleEquationPartsSeeded(step.equation_parts, `${problemId}:${step.id}`)
                : step.equation_parts;
          return (
            <EquationBuilder
              key={step.id}
              step_number={step.step_number}
              label={step.label}
              instruction="Drag and drop to form the correct equation"
              availableParts={bank}
              onValidate={(orderedParts) => handleValidateEquation(orderedParts, step)}
              onComplete={(correct) => handleStructuredStepComplete(step.id, correct)}
              isComplete={!!structuredStepComplete[step.id]}
              showHint={!!hints[step.id]}
              hintText={hints[step.id]}
              hintLoading={hintLoading.has(step.id)}
              onRequestHint={() => handleRequestHint(step.id)}
              draft={answers[step.id]?.answer}
              onDraftChange={(d) => handleAnswerChange(step.id, d)}
            />
          );
        }

        if (step.type === "multi_input" && step.input_fields?.length) {
          return (
            <MultiInput
              key={step.id}
              step_number={step.step_number}
              label={step.label}
              instruction={step.instruction}
              variables={step.input_fields}
              onComplete={(correct) => handleStructuredStepComplete(step.id, correct)}
              isComplete={!!structuredStepComplete[step.id]}
              showHint={!!hints[step.id]}
              hintText={hints[step.id]}
              hintLoading={hintLoading.has(step.id)}
              onRequestHint={() => handleRequestHint(step.id)}
              draft={answers[step.id]?.answer}
              onDraftChange={(d) => handleAnswerChange(step.id, d)}
            />
          );
        }

        if (
          step.type === "comparison" &&
          step.comparison_parts?.length === 2 &&
          step.comparison_parts[0]?.trim() &&
          step.comparison_parts[1]?.trim()
        ) {
          return (
            <ComparisonStep
              key={step.id}
              step_number={step.step_number}
              label={step.label}
              instruction={step.instruction}
              comparisonParts={step.comparison_parts as [string, string]}
              correctAnswer={step.correct_answer as "<" | ">" | "="}
              onComplete={(correct) => handleStructuredStepComplete(step.id, correct)}
              isComplete={!!structuredStepComplete[step.id]}
              showHint={!!hints[step.id]}
              hintText={hints[step.id]}
              hintLoading={hintLoading.has(step.id)}
              onRequestHint={() => handleRequestHint(step.id)}
              draft={answers[step.id]?.answer}
              onDraftChange={(d) => handleAnswerChange(step.id, d)}
            />
          );
        }

        return (
          <InteractiveStep
            key={step.id}
            step={step}
            answer={answers[step.id]}
            onAnswerChange={handleAnswerChange}
            onCheckAnswer={callHandleCheckAnswer}
            showHint={!!hints[step.id]}
            hintText={hints[step.id]}
            hintLoading={hintLoading.has(step.id)}
            checkingAnswer={checkingAnswer.has(step.id)}
            onRequestHint={handleRequestHint}
          />
        );
      })}
    </>
  );
}

