import React from "react";
import { Problem } from "@/types/chemistry";

/**
 * Lightweight LaTeX-to-React renderer for inline math ($...$).
 * Handles: ^\circ, \times, \text{}, ^{}, _{}, ^X (single char superscript)
 */
function parseMathSegment(math: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < math.length) {
    // \circ → °
    if (math.startsWith("\\circ", i)) {
      nodes.push("°");
      i += 5;
    }
    // ^\circ → °
    else if (math.startsWith("^\\circ", i)) {
      nodes.push("°");
      i += 6;
    }
    // \times → ×
    else if (math.startsWith("\\times", i)) {
      nodes.push("×");
      i += 6;
    }
    // \text{...}
    else if (math.startsWith("\\text{", i)) {
      const end = math.indexOf("}", i + 6);
      if (end !== -1) {
        nodes.push(math.slice(i + 6, end));
        i = end + 1;
      } else {
        nodes.push(math[i]);
        i++;
      }
    }
    // ^{...} superscript
    else if (math.startsWith("^{", i)) {
      const end = math.indexOf("}", i + 2);
      if (end !== -1) {
        nodes.push(<sup key={key++}>{parseMathSegment(math.slice(i + 2, end))}</sup>);
        i = end + 1;
      } else {
        nodes.push(math[i]);
        i++;
      }
    }
    // ^X single-char superscript (not followed by {)
    else if (math[i] === "^" && i + 1 < math.length && math[i + 1] !== "{") {
      // Grab digits or a single char
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
    }
    // _{...} subscript
    else if (math.startsWith("_{", i)) {
      const end = math.indexOf("}", i + 2);
      if (end !== -1) {
        nodes.push(<sub key={key++}>{parseMathSegment(math.slice(i + 2, end))}</sub>);
        i = end + 1;
      } else {
        nodes.push(math[i]);
        i++;
      }
    }
    // _X single-char subscript
    else if (math[i] === "_" && i + 1 < math.length && math[i + 1] !== "{") {
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
    }
    else {
      nodes.push(math[i]);
      i++;
    }
  }

  return nodes;
}

function renderMathText(text: string): React.ReactNode[] {
  // Split on $...$ delimiters
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      const inner = part.slice(1, -1);
      return (
        <span key={idx} className="font-mono text-primary/90">
          {parseMathSegment(inner)}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

interface ProblemCardProps {
  problem: Problem;
}

export function ProblemCard({ problem }: ProblemCardProps) {
  return (
    <div className="bg-problem-bg border-l-4 border-problem-border rounded-lg p-6 mb-6">
      <h3 className="text-lg font-bold text-foreground mb-3">Problem</h3>
      <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
        {renderMathText(problem.description)}
      </p>
    </div>
  );
}
