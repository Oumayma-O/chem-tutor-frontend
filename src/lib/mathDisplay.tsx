import React from "react";

/**
 * Lightweight math parser for reference cards and inline chemistry.
 * Converts LaTeX-style notation to React elements.
 *
 * Supported: \text{}, \frac{}{}, ^{}, _{}, \times, \rightarrow,
 *            \circ, ^{} / ^x shorthands, _{} / _x shorthands.
 *
 * Uses findMatchingBrace() for all brace-delimited constructs so that
 * nested braces (e.g. \frac{24.31 \text{ g Mg}}{1 \text{ mol Mg}}) parse correctly.
 */

// ── Brace matching ──────────────────────────────────────────────────────────

/**
 * Find the index of the closing `}` that matches the `{` whose content starts at `afterOpen`.
 * Returns -1 if not found.
 */
function findMatchingBrace(str: string, afterOpen: number): number {
  let depth = 1;
  let i = afterOpen;
  while (i < str.length) {
    if (str[i] === "{") depth++;
    else if (str[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

// ── Core parser ─────────────────────────────────────────────────────────────

function parseMathSegment(math: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < math.length) {
    // ── \circ / ^circ ───────────────────────────────────────────────────────
    if (math.startsWith("^\\circ", i)) {
      nodes.push("°");
      i += 6;
    } else if (math.startsWith("\\circ", i)) {
      nodes.push("°");
      i += 5;

    // ── \times ──────────────────────────────────────────────────────────────
    } else if (math.startsWith("\\times", i)) {
      nodes.push("×");
      i += 6;

    // ── \rightarrow ─────────────────────────────────────────────────────────
    } else if (math.startsWith("\\rightarrow", i)) {
      nodes.push("→");
      i += 11;

    // ── \leftarrow ──────────────────────────────────────────────────────────
    } else if (math.startsWith("\\leftarrow", i)) {
      nodes.push("←");
      i += 10;

    // ── \geq ────────────────────────────────────────────────────────────────
    } else if (math.startsWith("\\geq", i)) {
      nodes.push("≥");
      i += 4;

    // ── \leq ────────────────────────────────────────────────────────────────
    } else if (math.startsWith("\\leq", i)) {
      nodes.push("≤");
      i += 4;

    // ── \pm ─────────────────────────────────────────────────────────────────
    } else if (math.startsWith("\\pm", i)) {
      nodes.push("±");
      i += 3;

    // ── \Delta ──────────────────────────────────────────────────────────────
    } else if (math.startsWith("\\Delta", i)) {
      nodes.push("Δ");
      i += 6;

    // ── \text{...} ──────────────────────────────────────────────────────────
    } else if (math.startsWith("\\text{", i)) {
      const contentStart = i + 6; // index after the opening {
      const end = findMatchingBrace(math, contentStart);
      if (end !== -1) {
        nodes.push(math.slice(contentStart, end));
        i = end + 1;
      } else {
        nodes.push(math[i]);
        i++;
      }

    // ── \frac{num}{den} ─────────────────────────────────────────────────────
    } else if (math.startsWith("\\frac{", i)) {
      const numStart = i + 6; // index after opening { of numerator
      const numEnd = findMatchingBrace(math, numStart);
      if (numEnd !== -1 && math[numEnd + 1] === "{") {
        const denStart = numEnd + 2; // index after opening { of denominator
        const denEnd = findMatchingBrace(math, denStart);
        if (denEnd !== -1) {
          const numContent = math.slice(numStart, numEnd);
          const denRaw = math.slice(denStart, denEnd);
          const denContent =
            denRaw.startsWith("(") && denRaw.endsWith(")")
              ? denRaw.slice(1, -1)
              : denRaw;
          nodes.push(
            <span
              key={key++}
              className="inline-flex flex-col items-center leading-none align-middle mx-[0.1em]"
              style={{ fontSize: "0.85em", verticalAlign: "middle" }}
            >
              <span style={{ borderBottom: "1px solid currentColor", padding: "0 1px 1px" }}>
                {parseMathSegment(numContent)}
              </span>
              <span style={{ padding: "1px 1px 0" }}>
                {parseMathSegment(denContent)}
              </span>
            </span>
          );
          i = denEnd + 1;
        } else {
          nodes.push(math[i]);
          i++;
        }
      } else {
        nodes.push(math[i]);
        i++;
      }

    // ── ^{...} superscript ──────────────────────────────────────────────────
    } else if (math.startsWith("^{", i)) {
      const contentStart = i + 2;
      const end = findMatchingBrace(math, contentStart);
      if (end !== -1) {
        nodes.push(<sup key={key++}>{parseMathSegment(math.slice(contentStart, end))}</sup>);
        i = end + 1;
      } else {
        nodes.push(math[i]);
        i++;
      }

    // ── ^ shorthand (single char/digit superscript) ─────────────────────────
    } else if (math[i] === "^" && i + 1 < math.length && math[i + 1] !== "{") {
      let sup = "";
      let j = i + 1;
      while (j < math.length && /[\d+\-]/.test(math[j])) {
        sup += math[j];
        j++;
      }
      if (sup.length === 0 && j < math.length) {
        sup = math[j];
        j++;
      }
      nodes.push(<sup key={key++}>{sup}</sup>);
      i = j;

    // ── _{...} subscript ────────────────────────────────────────────────────
    } else if (math.startsWith("_{", i)) {
      const contentStart = i + 2;
      const end = findMatchingBrace(math, contentStart);
      if (end !== -1) {
        nodes.push(<sub key={key++}>{parseMathSegment(math.slice(contentStart, end))}</sub>);
        i = end + 1;
      } else {
        nodes.push(math[i]);
        i++;
      }

    // ── _ shorthand (single digit subscript) ────────────────────────────────
    } else if (math[i] === "_" && i + 1 < math.length && math[i + 1] !== "{") {
      let sub = "";
      let j = i + 1;
      while (j < math.length && /[\d]/.test(math[j])) {
        sub += math[j];
        j++;
      }
      if (sub.length === 0 && j < math.length) {
        sub = math[j];
        j++;
      }
      nodes.push(<sub key={key++}>{sub}</sub>);
      i = j;

    // ── plain character ──────────────────────────────────────────────────────
    } else {
      nodes.push(math[i]);
      i++;
    }
  }

  return nodes;
}

// ── Pre-processing ──────────────────────────────────────────────────────────

function toScientificStr(n: number): string {
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mantissa = n / Math.pow(10, exp);
  const mantStr = parseFloat(mantissa.toPrecision(3)).toString();
  return `${mantStr} \\times 10^{${exp}}`;
}

/**
 * Preprocess common chemistry notation into parseable LaTeX-ish form.
 */
function preprocessChemistryNotation(text: string): string {
  return text
    .replace(/\\dfrac\{/g, "\\frac{")
    .replace(/\\cdot/g, "·")
    .replace(/\[([A-Za-z])\]t(?=[\s\](),;=+\-*]|$)/g, "[$1]_t")
    .replace(/\[([A-Za-z])\]0(?=[\s\](),;=+\-*]|$)/g, "[$1]_0")
    .replace(/\[([A-Za-z])\]o(?=[\s\](),;=+\-*]|$)/g, "[$1]_0")
    .replace(/\bt1\/2\b/g, "t_{1/2}")
    // Convert N/(expr) and N/[conc] to \frac{N}{D} — but NOT inside _{...}
    .replace(
      /(\d+)\/((?:\([^)]+\)|\[[A-Za-z]\][_{}0-9a-zA-Z]*|[a-zA-Z][a-zA-Z0-9_{}]*))/g,
      "\\frac{$1}{$2}"
    )
    // Small decimals (< 0.01): 0.000135 → 1.35 \times 10^{-4}
    .replace(/\b(0\.0{2,}\d+)\b/g, (match) => {
      const n = parseFloat(match);
      if (isNaN(n) || n === 0) return match;
      return toScientificStr(n);
    })
    // Large integers (≥ 10 000): 135000 → 1.35 \times 10^{5}
    .replace(/\b([1-9]\d{4,})\b/g, (match) => {
      const n = parseInt(match, 10);
      if (isNaN(n)) return match;
      return toScientificStr(n);
    });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Render text that may contain $...$ inline math delimiters.
 * Segments outside $ are plain text; segments inside $ are parsed as math.
 */
export function formatMathContent(text: string): React.ReactNode {
  const segments = text.split(/\$([^$]+)\$/);

  if (segments.length === 1) {
    // No $...$ delimiters — treat whole string as math (legacy path)
    const normalized = preprocessChemistryNotation(text);
    const parts = normalized.split(" or ");
    const shouldBreak = parts.length > 1 && parts[0].includes("=");
    if (!shouldBreak) return <>{parseMathSegment(normalized)}</>;
    return (
      <>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && <br />}
            {parseMathSegment(part)}
          </React.Fragment>
        ))}
      </>
    );
  }

  // Mixed text/math rendering
  return (
    <>
      {segments.map((seg, i) => {
        if (i % 2 === 0) {
          return seg ? <React.Fragment key={i}>{seg}</React.Fragment> : null;
        } else {
          const normalized = preprocessChemistryNotation(seg);
          return <React.Fragment key={i}>{parseMathSegment(normalized)}</React.Fragment>;
        }
      })}
    </>
  );
}
