/**
 * Chemistry variable highlighter — shared across all kinetics sims.
 * Matches [Species], k=, t½=, and negative values like −0.015.
 */
import { Fragment } from "react";
import type { ReactNode } from "react";

// Superset of all three sim regex patterns
const CHEM_VAR_RE =
  /(\[[\w]+\][₀t]?(?:\s*=\s*[\d.]+\s*\w+)?|k\s*=\s*[\d.]+(?:\s*[\w·⁻¹]+)*|t½\s*=\s*[\d.∞]+\s*\w*|−[\d.]+)/g;

export function highlightChemVars(text: string): ReactNode[] {
  const result: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(CHEM_VAR_RE.source, "g");
  while ((match = re.exec(text)) !== null) {
    if (match.index > last)
      result.push(<Fragment key={last}>{text.slice(last, match.index)}</Fragment>);
    result.push(
      <span key={match.index} className="font-semibold text-blue-600 dark:text-blue-400">
        {match[0]}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length)
    result.push(<Fragment key={last}>{text.slice(last)}</Fragment>);
  return result;
}
