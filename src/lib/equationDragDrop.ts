/**
 * Drag-and-drop: ordered tokens → one string for validate-step / hints.
 * Problem JSON lists the correct order in `equationParts`; the UI shuffles display only.
 * Always build the canonical key from that array (correctAnswer is null for drag_drop).
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

/** Canonical expression for a drag_drop step: problem `equation_parts` order only. */
export function canonicalDragDropFromParts(parts: string[] | null | undefined): string {
  if (!parts?.length) return "";
  return buildMathExpression(parts);
}

/**
 * Strip outer `$` and wrap in `$...$` when the token looks like LaTeX (commands, sub/sup).
 * Shared by GivenStep rendering and answer-reveal copy.
 */
export function equationPartToInlineMathString(part: string): string {
  const cleaned = part.replace(/\$/g, "");
  return /\\[a-zA-Z]|[_^]/.test(cleaned) ? `$${cleaned}$` : cleaned;
}

/** Space-joined tokens for one MathText/string line (same order as GivenStep). */
export function joinEquationPartsForDisplayString(parts: string[]): string {
  return parts.map(equationPartToInlineMathString).join(" ");
}

function fisherYatesShuffle<T>(items: T[], random: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Fisher–Yates shuffle of a copy. Run once when ingesting a problem (e.g. parseProblemOutput)
 * so the bank order stays stable across Reset remounts; never shuffle `equation_parts` itself
 * — that array defines the canonical correct order for validation.
 */
export function shuffleEquationPartsForDisplay(parts: string[]): string[] {
  return fisherYatesShuffle(parts, Math.random);
}

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * Deterministic Fisher–Yates from a stable key (e.g. `${problemId}:${stepId}`).
 * Use when `equation_parts_display` is missing (older cached problems) so the bank is still
 * shuffled and stays identical across Reset remounts.
 */
export function shuffleEquationPartsSeeded(parts: string[], seedKey: string): string[] {
  const rnd = mulberry32(hashStringToSeed(seedKey));
  return fisherYatesShuffle(parts, rnd);
}
