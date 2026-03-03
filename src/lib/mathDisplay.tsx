import React from "react";

/**
 * Lightweight math parser for reference cards and inline chemistry.
 * Converts ^x to superscript, _x to subscript (e.g. [A]^m → [A]ᵐ).
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
 * Preprocess common chemistry notation (no underscores) into parseable form.
 * [A]t → [A]_t, [A]0/[A]o → [A]_0, t1/2 → t_{1/2}
 */
function preprocessChemistryNotation(text: string): string {
  return text
    .replace(/\[([A-Za-z])\]t(?=[\s\]|$)/g, "[$1]_t")
    .replace(/\[([A-Za-z])\]0(?=[\s\]|$)/g, "[$1]_0")
    .replace(/\[([A-Za-z])\]o(?=[\s\]|$)/g, "[$1]_0")
    .replace(/\bt1\/2\b/g, "t_{1/2}");
}

/** Render text with inline math (^x, _x) as superscript/subscript. */
export function formatMathContent(text: string): React.ReactNode {
  const normalized = preprocessChemistryNotation(text);
  return <>{parseMathSegment(normalized)}</>;
}
