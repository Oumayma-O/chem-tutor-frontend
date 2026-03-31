/**
 * Shared draft persistence utilities for structured step widgets.
 *
 * All widgets (MultiInput, ComparisonStep, EquationBuilder) store their
 * draft state as a JSON string in answers[stepId].answer via onDraftChange.
 * This module owns the parse/serialize contract so widgets stay pure UI.
 */

/** Parse a JSON draft string into a typed payload, with a fallback for unknown/legacy formats. */
export function parseDraft<T>(
  draft: string | undefined,
  legacyFallback?: (raw: unknown) => T | null,
): Partial<T> {
  if (!draft) return {};
  try {
    const parsed: unknown = JSON.parse(draft);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Partial<T>;
    }
    // Non-object JSON (array, string, number) — try legacy handler
    if (legacyFallback) {
      const result = legacyFallback(parsed);
      if (result !== null) return result as Partial<T>;
    }
  } catch { /* invalid JSON — ignore */ }
  return {};
}

/** Serialize a draft payload to JSON and call onDraftChange. */
export function saveDraft<T extends object>(
  payload: T,
  onDraftChange: ((draft: string) => void) | undefined,
): void {
  onDraftChange?.(JSON.stringify(payload));
}
