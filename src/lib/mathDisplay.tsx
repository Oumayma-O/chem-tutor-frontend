import React from "react";

/**
 * Lightweight math parser for reference cards and inline chemistry.
 * Converts ^x to superscript, _x to subscript, \frac{N}{D} to stacked fraction.
 */
function parseMathSegment(math: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < math.length) {
    if (math.startsWith("\\circ", i)) {
      nodes.push("°");
      i += 5;
    } else if (math.startsWith("^\\circ", i)) {
      nodes.push("°");
      i += 6;
    } else if (math.startsWith("\\times", i)) {
      nodes.push("×");
      i += 6;
    } else if (math.startsWith("\\text{", i)) {
      const end = math.indexOf("}", i + 6);
      if (end !== -1) {
        nodes.push(math.slice(i + 6, end));
        i = end + 1;
      } else {
        nodes.push(math[i]);
        i++;
      }
    } else if (math.startsWith("\\frac{", i)) {
      // Stacked fraction: \frac{numerator}{denominator}
      const numEnd = math.indexOf("}", i + 6);
      if (numEnd !== -1 && math[numEnd + 1] === "{") {
        const denEnd = math.indexOf("}", numEnd + 2);
        if (denEnd !== -1) {
          const numContent = math.slice(i + 6, numEnd);
          const denRaw = math.slice(numEnd + 2, denEnd);
          // Strip outer parentheses from denominator for cleaner display
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
    } else if (math.startsWith("^{", i)) {
      const end = math.indexOf("}", i + 2);
      if (end !== -1) {
        nodes.push(<sup key={key++}>{parseMathSegment(math.slice(i + 2, end))}</sup>);
        i = end + 1;
      } else {
        nodes.push(math[i]);
        i++;
      }
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
    } else if (math.startsWith("_{", i)) {
      const end = math.indexOf("}", i + 2);
      if (end !== -1) {
        nodes.push(<sub key={key++}>{parseMathSegment(math.slice(i + 2, end))}</sub>);
        i = end + 1;
      } else {
        nodes.push(math[i]);
        i++;
      }
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
    } else {
      nodes.push(math[i]);
      i++;
    }
  }

  return nodes;
}

/**
 * Preprocess common chemistry notation into parseable form.
 * [A]t → [A]_t, [A]0/[A]o → [A]_0, t1/2 → t_{1/2}
 * 1/[A]_t → \frac{1}{[A]_t} (proper stacked fraction)
 */
function toScientificStr(n: number): string {
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mantissa = n / Math.pow(10, exp);
  const mantStr = parseFloat(mantissa.toPrecision(3)).toString();
  return `${mantStr} \\times 10^{${exp}}`;
}

function preprocessChemistryNotation(text: string): string {
  return text
    .replace(/\[([A-Za-z])\]t(?=[\s\](),;=+\-*]|$)/g, "[$1]_t")
    .replace(/\[([A-Za-z])\]0(?=[\s\](),;=+\-*]|$)/g, "[$1]_0")
    .replace(/\[([A-Za-z])\]o(?=[\s\](),;=+\-*]|$)/g, "[$1]_0")
    .replace(/\bt1\/2\b/g, "t_{1/2}")
    // Convert N/(expr) and N/[conc] to \frac{N}{D} — but NOT inside _{...} (e.g. t_{1/2})
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

/** Render text with inline math as superscript/subscript/fractions.
 *  When " or " separates two equations (both sides contain "="), a line break is inserted. */
export function formatMathContent(text: string): React.ReactNode {
  const normalized = preprocessChemistryNotation(text);
  const parts = normalized.split(" or ");

  // Only break on "or" when it sits between two equation expressions
  const shouldBreak = parts.length > 1 && parts[0].includes("=");

  if (!shouldBreak) {
    return <>{parseMathSegment(normalized)}</>;
  }

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
