/**
 * Chemistry variable highlighter — shared across all kinetics sims.
 *
 * Handles two layers:
 *  1. e^(...) → e<sup>...</sup>  (proper exponential notation)
 *  2. [Species], k=, t½=, −value → bold blue highlight
 */
import { Fragment } from "react";
import type { ReactNode } from "react";

// ── Layer 1: exponential notation ─────────────────────────────────────────────
// Matches  e^(anything)  e.g.  e^(−k·t)  or  e^(-0.069·5)
const EXP_RE = /e\^\(([^)]+)\)/g;

// ── Layer 2: chem-var highlighting ────────────────────────────────────────────
const CHEM_VAR_RE =
  /(\[[\w]+\][₀t]?(?:\s*=\s*[\d.]+\s*\w+)?|k\s*=\s*[\d.]+(?:\s*[\w·⁻¹]+)*|t½\s*=\s*[\d.∞]+\s*\w*|−[\d.]+)/g;

/** Highlight chemical variables in a plain string chunk (no e^). */
function highlightChunk(text: string, keyOffset: number): ReactNode[] {
  const result: ReactNode[] = [];
  const re = new RegExp(CHEM_VAR_RE.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last)
      result.push(<Fragment key={keyOffset + last}>{text.slice(last, m.index)}</Fragment>);
    result.push(
      <span key={keyOffset + m.index} className="font-semibold text-blue-600 dark:text-blue-400">
        {m[0]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length)
    result.push(<Fragment key={keyOffset + last}>{text.slice(last)}</Fragment>);
  return result;
}

/** Full processor: handles e^(...) superscripts then chem-var highlighting. */
export function highlightChemVars(text: string): ReactNode[] {
  const result: ReactNode[] = [];
  const re = new RegExp(EXP_RE.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    // Highlight the plain text before this e^(...)
    if (m.index > last)
      result.push(...highlightChunk(text.slice(last, m.index), last));

    // Render e^(exponent) with a real <sup>
    result.push(
      <span key={`exp-${m.index}`}>
        e<sup style={{ fontSize: "0.72em" }}>{m[1]}</sup>
      </span>
    );
    last = m.index + m[0].length;
  }

  // Remaining text after last e^(...)
  if (last < text.length)
    result.push(...highlightChunk(text.slice(last), last));

  return result;
}
