/**
 * Client-side fallback when step validation API fails (network/5xx).
 * Mirrors tolerance rules in useStepHandlers' former catch block.
 */

export function normalizeStepAnswerString(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Numeric tolerance for "Final Answer" vs intermediate steps; otherwise string equality after normalize.
 */
export function compareStudentAnswerFallback(
  studentText: string,
  correctAnswer: string | undefined,
  stepLabel: string,
): boolean {
  const normalize = normalizeStepAnswerString;
  const numStudent = parseFloat(normalize(studentText));
  const numCorrect = parseFloat(normalize(correctAnswer ?? ""));
  if (!isNaN(numStudent) && !isNaN(numCorrect)) {
    const isFinalStep = stepLabel.toLowerCase().includes("answer");
    const tolerance = isFinalStep ? 0.01 : 0.05;
    return numCorrect === 0
      ? Math.abs(numStudent) < 1e-9
      : Math.abs(numStudent - numCorrect) / Math.abs(numCorrect) <= tolerance;
  }
  return normalize(studentText) === normalize(correctAnswer ?? "");
}
