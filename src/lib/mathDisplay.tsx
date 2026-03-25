import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

/**
 * Renders a string that may contain:
 *   - Inline math:  $...$
 *   - Display math: $$...$$
 *   - \mathrm{}, \text{}, \frac{}{}, ^{}, _{}, \times, \rightarrow, etc.
 *   - Plain markdown text
 *
 * Uses react-markdown → remark-math → rehype-katex pipeline.
 * The `p` element is rendered as an inline <span> so this component
 * is safe to embed anywhere (inside <p>, <span>, <td>, etc.).
 */

const inlineComponents: Components = {
  // Prevent react-markdown from wrapping content in block <p> tags.
  // This makes <MathText> safe for inline use everywhere.
  p: ({ children }) => <span>{children}</span>,
};

/**
 * KaTeX treats `\\cdotK` as one invalid command. `\\cdot K` (unit kelvin) still needs `K` in `\\text{}`.
 * Last line of defense before remark-math / KaTeX (must run before {@link autoWrapLatex}).
 */
function fixCdotKelvinForKatex(text: string): string {
  if (!text) return text;
  return text.replace(/\\cdot\s*K\b/g, "\\cdot \\text{K}");
}

/**
 * If the model forgets to wrap LaTeX in $...$, do it here.
 * Detects bare LaTeX commands (e.g. \mathrm, \times, ^{, _{) and wraps
 * contiguous math runs in $...$  so KaTeX can render them.
 */
/**
 * Auto-wrap bare LaTeX into $...$ so KaTeX can render it.
 *
 * If the string already has $/$( delimiters → leave as-is.
 * If the string has no LaTeX commands at all → plain text, leave as-is.
 * Otherwise wrap the ENTIRE string in $...$ so KaTeX handles it.
 *
 * Wrapping the whole string is simpler and more correct than the previous
 * whitespace-tokeniser, which broke on multi-word brace arguments like
 * \text{Avg Atomic Mass} (splitting "Avg" and "Mass}" into separate tokens
 * that did not individually look like LaTeX, leaving raw commands visible).
 */
function autoWrapLatex(text: string): string {
  // Final safety net: \cdotX (no space) must never reach KaTeX as-is — \cdotX is an
  // unknown command. Apply everywhere, including inside existing $...$ blocks.
  // eslint-disable-next-line no-param-reassign
  text = text.replace(/\\cdot([A-Za-z])/g, "\\cdot $1");
  if (/\$|\\\(/.test(text)) return text;
  if (!/\\[a-zA-Z]/.test(text) && !/[_^]\{/.test(text)) return text;
  return `$${text}$`;
}

/** Upgrade a single $...$ chunk to $$...$$ for display-style KaTeX (tall fractions, spacing). */
function preferDisplayMathBody(text: string): string {
  const t = text.trim();
  if (t.startsWith("$$")) return t;
  if (t.startsWith("$") && t.endsWith("$")) {
    const inner = t.slice(1, -1);
    if (inner.includes("$")) return t;
    return `$$${inner}$$`;
  }
  return `$$${t}$$`;
}

interface MathTextProps {
  children: string;
  className?: string;
  /** Block/display math ($$...$$) — use for equation lines and long expressions. */
  preferDisplay?: boolean;
}

export function MathText({ children, className, preferDisplay }: MathTextProps) {
  const safeText = fixCdotKelvinForKatex(children);
  let body = autoWrapLatex(safeText);
  if (preferDisplay) {
    body = preferDisplayMathBody(body);
  }
  const content = (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, trust: false }]]}
      components={inlineComponents}
    >
      {body}
    </ReactMarkdown>
  );
  return (
    <span
      className={cn(
        "math-content-katex inline-block max-w-full min-w-0 overflow-x-auto scrollbar-hide align-middle",
        className
      )}
    >
      {content}
    </span>
  );
}

/**
 * Normalize LaTeX that may be double-escaped from the API (e.g. \\text -> \text)
 * so KaTeX can render it instead of showing raw commands.
 * Also collapses $$...$$ (display/block math) → $...$ (inline math) so the AI
 * can't accidentally produce oversized centered formulas in step content.
 *
 * JSON-eaten LaTeX recovery: when the LLM outputs a single-backslash command
 * (e.g. \text) instead of the required double-escaped \\text, the JSON parser
 * silently converts the backslash+letter pair to a control character:
 *   \t → U+0009 (tab)   → eats \text, \times, \theta …
 *   \f → U+000C (ff)    → eats \frac, \forall
 *   \r → U+000D (CR)    → eats \rightarrow, \rho
 *   \b → U+0008 (bs)    → eats \beta, \begin
 * We restore the most common chemistry LaTeX commands from these artifacts.
 */

const BREVE = "\u02D8"; // U+02D8 — often appears when \u00b7 (middle dot) is mangled by a sanitizer

/**
 * Backend markdown sanitizer sometimes destroys `\u00b7` or `\cdot` in “J/(mol·K)” and leaves
 * visible garbage like “mol 0˘ 0b7K” (0 + breve + hex digits for U+00B7 + K). Normalize to LaTeX.
 */
export function fixCorruptedUnitMiddleDots(s: string): string {
  if (!s) return s;
  let out = s;
  // “mol 0˘ 0b7K” / variants (spaces optional)
  out = out.replace(new RegExp(`mol\\s*0\\s*${BREVE}\\s*0b7\\s*K`, "gi"), "mol\\cdot K");
  out = out.replace(new RegExp(`\\(mol\\s*0\\s*${BREVE}\\s*0b7\\s*K\\)`, "gi"), "(mol\\cdot K)");
  out = out.replace(new RegExp(`mol\\s*${BREVE}\\s*0b7\\s*K`, "gi"), "mol\\cdot K");
  out = out.replace(/mol\s*0b7\s*K/gi, "mol\\cdot K");
  out = out.replace(/mol\s*0{1,2}b7\s*K/gi, "mol\\cdot K");
  // Unicode middle dot already correct but outside \text — still ok in \mathrm
  out = out.replace(/mol\u00b7K/g, "mol\\cdot K");
  out = out.replace(/mol\s*\u00b7\s*K/g, "mol\\cdot K");
  return out;
}

/**
 * LLM / bad JSON often produces units like:
 *   \backslash\text{cdotK}  (meant: middle dot before K)
 *   \text{cdotK}           (same, missing \cdot)
 *   \textbackslash\text{cdotK}
 * KaTeX then shows literal “\” or “cdotK”. Map these to proper \cdot \text{K} (or spacing).
 */
function fixMangledCdotInUnits(s: string): string {
  let out = fixCorruptedUnitMiddleDots(s);
  out = out.replace(/\\textbackslash\s*\\text\{cdot\s*([A-Za-z]+)\}/gi, "\\cdot \\text{$1}");
  out = out.replace(/\\backslash\s*\\text\{cdot([A-Za-z]+)\}/gi, "\\cdot \\text{$1}");
  out = out.replace(/\\backslash\s*\\text\{\s*cdot\s*([A-Za-z]+)\s*\}/gi, "\\cdot \\text{$1}");
  out = out.replace(/\\backslash\s*\\cdot/gi, "\\cdot");
  out = out.replace(/\\backslash\s*\{\s*cdot\s*([A-Za-z]+)\s*\}/gi, "\\cdot \\text{$1}");
  // \text{cdotK} with no \backslash (single mangled “command”)
  out = out.replace(/\\text\{\s*cdot([A-Za-z]+)\s*\}/gi, "\\cdot \\text{$1}");
  out = out.replace(/\\text\{\s*cdot\s+([A-Za-z]+)\s*\}/gi, "\\cdot \\text{$1}");
  out = out.replace(/\\text\{\s*cdot\s*\}/gi, "\\cdot");
  const CDOTS_PH = "__PRESERVE_CDOTS__";
  out = out.replace(/\\cdots/g, CDOTS_PH);
  out = out.replace(/\\cdot([A-Za-z])/g, "\\cdot $1");
  out = out.split(CDOTS_PH).join("\\cdots");
  return out;
}

/** Run unit/dot fixes on every $...$ segment (inline math only). */
function fixMangledCdotInsideAllInlineMath(text: string): string {
  return text.replace(/\$([^$]+)\$/g, (_, inner) => `$${fixMangledCdotInUnits(inner)}$`);
}

function normalizeLatexEscapes(text: string): string {
  // ── 0. Corrupted “mol 0˘ 0b7K” (mangled U+00B7) + \cdotX before other passes
  let out = fixCorruptedUnitMiddleDots(text);
  out = out.replace(/\\cdot([A-Za-z])/g, "\\cdot $1");

  // ── 1. Collapse display math $$...$$ → $...$
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, inner) => `$${inner.trim()}$`);

  // ── 2. Fix double-escaped backslashes sent by well-behaved backends (\\text → \text)
  out = out.replace(/\\\\/g, "\\");
  // Re-run after backslash normalization (handles \\cdotK that just became \cdotK)
  out = out.replace(/\\cdot([A-Za-z])/g, "\\cdot $1");

  // ── 2b. Gas constant / J·mol⁻¹·K⁻¹ style mangling (whole string + again per $...$ block)
  out = fixMangledCdotInUnits(out);
  out = fixMangledCdotInsideAllInlineMath(out);

  // ── 3. Fix $X$^{n} / $X$_{n}: sub/superscript leaked outside closing $
  // e.g. "$2s$^{2}" → "$2s^{2}$"  (LLM wrapped only the base, not the exponent)
  out = out.replace(/\$([^$]+)\$\^\{([^}]+)\}/g, (_, inner, exp) => `$${inner}^{${exp}}$`);
  out = out.replace(/\$([^$]+)\$_\{([^}]+)\}/g, (_, inner, sub) => `$${inner}_{${sub}}$`);

  // ── 4. Restore JSON-eaten LaTeX commands
  // \t (tab U+0009) victims
  out = out.replace(/\u0009ext(?=[\s{(]|$)/g, "\\text");
  out = out.replace(/\u0009imes(?=[\s{,.)\]$]|$)/g, "\\times");
  out = out.replace(/\u0009heta(?=[\s{_^,.)\]$]|$)/g, "\\theta");
  out = out.replace(/\u0009au(?=[\s{_^,.)\]$]|$)/g, "\\tau");
  out = out.replace(/\u0009o(?=[\s{]|$)/g, "\\to");
  // \f (form feed U+000C) victims
  out = out.replace(/\u000crac(?=\{)/g, "\\frac");
  out = out.replace(/\u000corall(?=[\s{]|$)/g, "\\forall");
  // \r (carriage return U+000D) victims
  out = out.replace(/\u000dightarrow/g, "\\rightarrow");
  out = out.replace(/\u000dho(?=[\s{_^,.)\]$]|$)/g, "\\rho");
  // \b (backspace U+0008) victims
  out = out.replace(/\u0008eta(?=[\s{_^,.)\]$]|$)/g, "\\beta");

  // ── 5. Re-apply cdot/unit fixes (JSON recovery can leave new fragments; cheap idempotent pass)
  out = fixMangledCdotInUnits(out);
  out = fixMangledCdotInsideAllInlineMath(out);

  // ── 6. Wrap bare \cdot X outside $...$ into $\cdot X$ so autoWrapLatex's early-exit
  //       (triggered when the string already contains some $...$) doesn't leave the
  //       middle-dot operator as unrendered plain text or a KaTeX unknown-command error.
  //       applyOutsideMath is safe to call here — it's a plain function declaration (hoisted).
  out = applyOutsideMath(out, (seg) => {
    const ph = "__CDOTS_PH__";
    return seg
      .replace(/\\cdots/g, ph)
      .replace(/\\cdot([A-Za-z])/g, (_, ch) => `$\\cdot ${ch}$`)
      .replace(new RegExp(ph, "g"), "\\cdots");
  });

  return out;
}

/** LaTeX command names that are sometimes sent with ^ instead of \ (e.g. ^mathrm -> \mathrm). */
const CARET_AS_BACKSLASH_COMMANDS = "mathrm|text|mathit|mathbf|times|cdot|ldots|rightarrow|left|right|frac|sqrt|sin|cos|log|ln";

/**
 * “Substitute” steps often arrive as plain ASCII calculators, e.g.
 *   Ea = 8.314 * ln(8.10e-3/1.20e-3) / (1/298.15 - 1/318.15)
 * with no $...$ and no TeX commands, so KaTeX never runs. Convert to inline math.
 */
function normalizeAsciiCalculatorEquation(text: string): string {
  const joiner = text.includes("\n") ? "\n" : null;
  const lines = joiner != null ? text.split("\n") : [text];
  const outLines = lines.map((raw) => {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t) return line;
    if (/\$/.test(t)) return line;
    if (/\\[a-zA-Z]/.test(t)) return line;
    if (!/=/.test(t)) return line;
    const sci = /\d\.?\d*e[+-]?\d/i.test(t);
    const star = /\*/.test(t);
    const ln = /\bln\s*\(/i.test(t);
    if (!sci && !star && !ln) return line;

    let o = t
      .replace(/\bEa\b/g, "E_a")
      .replace(/(\d+\.?\d*)e([+-]?\d+)/gi, (_, b: string, e: string) => `${b}\\times 10^{${e}}`)
      .replace(/\*\s*/g, "\\cdot ")
      .replace(/\bln\s*\(/gi, "\\ln(");

    return `$${o}$`;
  });
  return joiner != null ? outLines.join("\n") : outLines[0] ?? text;
}

/**
 * Convert plain-text scientific notation and caret exponents to inline math.
 * - ^mathrm{...}, ^text{...} etc. (mistaken ^ for \) → \mathrm, \text so formulas render
 * - 6.022e23 → 6.022 × $10^{23}$
 * - 10^22 → $10^{22}$
 * - ^m, ^n, ^2 (bare caret + letter/digits) → $^{m}$, $^{n}$, $^{2}$ so they render as superscripts
 */
/**
 * Apply a transform only to the non-math segments of a string (text outside $...$).
 * Math blocks ($...$) are passed through unchanged to avoid double-processing.
 */
function applyOutsideMath(text: string, fn: (segment: string) => string): string {
  // Split on $...$ blocks (keep delimiters so we can rejoin correctly)
  const parts = text.split(/(\$[^$]+\$)/);
  return parts.map((part, i) => (i % 2 === 1 ? part : fn(part))).join("");
}

function scientificNotationToMath(text: string): string {
  let out = text;
  // Fix ^ before LaTeX commands (e.g. ^mathrm{HCl} when backslash was lost) so they render
  out = out.replace(new RegExp(`\\^(${CARET_AS_BACKSLASH_COMMANDS})(?=[{\\s]|$)`, "g"), "\\$1");
  // e-notation: number e exponent → number × 10^{exponent}
  out = out.replace(/(\d+\.?\d*)e(\d+)/gi, (_, base, exp) => `${base} × $10^{${exp}}$`);
  // 10^nnn first so we don't match its ^ with the generic pattern below
  out = out.replace(/10\^(\d+)/g, (_, exp) => `$10^{${exp}}$`);

  // Bare variable^{expr} or variable_{expr} outside $...$: R^{2} → $R^{2}$, [A]_{t} → $[A]_{t}$
  // LLM sometimes omits $ delimiters on expressions like R^{2}= 0.998 or k_{obs}.
  // Process only non-math segments so we never double-wrap.
  out = applyOutsideMath(out, (seg) =>
    seg
      // R^{2} → $R^{2}$,  [A]^{n} → $[A]^{n}$
      .replace(/([A-Za-z\]\)])\^\{([^}$]+)\}/g, (_, base, exp) => `$${base}^{${exp}}$`)
      // k_{obs} → $k_{obs}$,  [A]_{t} → $[A]_{t}$
      .replace(/([A-Za-z\]\)])_\{([^}$]+)\}/g, (_, base, sub) => `$${base}_{${sub}}$`)
  );

  // bare caret exponent without braces (e.g. [A]^m, [B]^n, mol^-1, s^-2) → superscript
  // Must run outside $...$ only — applying inside would corrupt e.g. "$4s^2$" → "$4s$^{2}$$"
  out = applyOutsideMath(out, (seg) =>
    seg.replace(/\^(-?[a-zA-Z0-9]+)/g, (_, exp) => `$^{${exp}}$`)
  );
  return out;
}

export type FormatMathContentOptions = {
  /** Prefer display math ($$) for drag_drop–style equations and tall fractions. */
  preferDisplay?: boolean;
  /** If set, also use display math when the normalized string is at least this long. */
  longMathThreshold?: number;
};

/**
 * Backwards-compatible shim.
 * All existing call-sites using formatMathContent(text) continue to work.
 */
export function formatMathContent(text: string, opts?: FormatMathContentOptions): React.ReactNode {
  const safeText = fixCdotKelvinForKatex(text);
  const ascii = normalizeAsciiCalculatorEquation(safeText);
  const normalized = normalizeLatexEscapes(ascii);
  const withMath = scientificNotationToMath(normalized);
  const preferDisplay =
    opts?.preferDisplay === true ||
    (opts?.longMathThreshold != null && withMath.length >= opts.longMathThreshold);
  return <MathText preferDisplay={preferDisplay}>{withMath}</MathText>;
}
