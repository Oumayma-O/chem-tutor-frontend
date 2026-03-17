import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";

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
  if (/\$|\\\(/.test(text)) return text;
  if (!/\\[a-zA-Z]/.test(text) && !/[_^]\{/.test(text)) return text;
  return `$${text}$`;
}

interface MathTextProps {
  children: string;
  className?: string;
}

export function MathText({ children, className }: MathTextProps) {
  const content = (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={inlineComponents}
    >
      {autoWrapLatex(children)}
    </ReactMarkdown>
  );
  return className ? <span className={className}>{content}</span> : <>{content}</>;
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
function normalizeLatexEscapes(text: string): string {
  // ── 1. Collapse display math $$...$$ → $...$
  let out = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, inner) => `$${inner.trim()}$`);

  // ── 2. Fix double-escaped backslashes sent by well-behaved backends (\\text → \text)
  out = out.replace(/\\\\/g, "\\");

  // ── 3. Restore JSON-eaten LaTeX commands
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

  return out;
}

/** LaTeX command names that are sometimes sent with ^ instead of \ (e.g. ^mathrm -> \mathrm). */
const CARET_AS_BACKSLASH_COMMANDS = "mathrm|text|mathit|mathbf|times|cdot|ldots|rightarrow|left|right|frac|sqrt|sin|cos|log|ln";

/**
 * Convert plain-text scientific notation and caret exponents to inline math.
 * - ^mathrm{...}, ^text{...} etc. (mistaken ^ for \) → \mathrm, \text so formulas render
 * - 6.022e23 → 6.022 × $10^{23}$
 * - 10^22 → $10^{22}$
 * - ^m, ^n, ^2 (bare caret + letter/digits) → $^{m}$, $^{n}$, $^{2}$ so they render as superscripts
 */
function scientificNotationToMath(text: string): string {
  let out = text;
  // Fix ^ before LaTeX commands (e.g. ^mathrm{HCl} when backslash was lost) so they render
  out = out.replace(new RegExp(`\\^(${CARET_AS_BACKSLASH_COMMANDS})(?=[{\\s]|$)`, "g"), "\\$1");
  // e-notation: number e exponent → number × 10^{exponent}
  out = out.replace(/(\d+\.?\d*)e(\d+)/gi, (_, base, exp) => `${base} × $10^{${exp}}$`);
  // 10^nnn first so we don't match its ^ with the generic pattern below
  out = out.replace(/10\^(\d+)/g, (_, exp) => `$10^{${exp}}$`);
  // bare caret exponent (e.g. [A]^m, [B]^n, mol^-1, s^-2) → superscript
  out = out.replace(/\^(-?[a-zA-Z0-9]+)/g, (_, exp) => `$^{${exp}}$`);
  return out;
}

/**
 * Backwards-compatible shim.
 * All existing call-sites using formatMathContent(text) continue to work.
 */
export function formatMathContent(text: string): React.ReactNode {
  const normalized = normalizeLatexEscapes(text);
  const withMath = scientificNotationToMath(normalized);
  return <MathText>{withMath}</MathText>;
}
