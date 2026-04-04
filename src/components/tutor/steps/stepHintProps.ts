/**
 * Single place to map global hint state → per-step props for EquationBuilder, MultiInput, etc.
 */

export interface StepHintBundle {
  showHint: boolean;
  hintText?: string;
  hintLoading: boolean;
  onRequestHint: () => void;
}

export function buildStepHintBundle(
  stepId: string,
  hints: Record<string, string>,
  hintLoading: Set<string>,
  handleRequestHint: (stepId: string) => void,
): StepHintBundle {
  return {
    showHint: Boolean(hints[stepId]),
    hintText: hints[stepId],
    hintLoading: hintLoading.has(stepId),
    onRequestHint: () => handleRequestHint(stepId),
  };
}
