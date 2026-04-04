/**
 * Low-level LaTeX string helpers (no React).
 * Used by mathNormalize, thinking tracker formatting, and GivenStep multi_input display.
 */

/** Strip one layer of `$...$` or `$$...$$` (API often wraps fragments separately). */
export function stripOuterMathDelimiters(s: string): string {
  let t = s.trim();
  for (let n = 0; n < 8; n++) {
    if (t.startsWith("$$") && t.endsWith("$$") && t.length >= 4) {
      t = t.slice(2, -2).trim();
      continue;
    }
    if (t.startsWith("$") && t.endsWith("$") && t.length >= 2 && !t.startsWith("$$")) {
      t = t.slice(1, -1).trim();
      continue;
    }
    break;
  }
  return t;
}
