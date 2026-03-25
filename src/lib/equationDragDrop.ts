/**
 * Drag-and-drop equation tokens → single string for legacy API validation.
 * Ordered array comparison for `equation_parts` should use the raw token arrays
 * (see useStepHandlers), not this output.
 */
export function buildMathExpression(tokens: string[]): string {
  return tokens
    .join(" ")
    .replace(/·/g, " * ")
    .replace(/×/g, " * ")
    .replace(/−/g, " - ")
    .replace(/–/g, " - ")
    .replace(/\[([A-Za-z]+)\](\w*)/g, "$1$2")
    .replace(/\s{2,}/g, " ")
    .trim();
}
