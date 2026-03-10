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
function autoWrapLatex(text: string): string {
  // Already has $ or \( delimiters — leave as-is
  if (/\$|\\\(/.test(text)) return text;
  // No LaTeX commands at all — plain text
  if (!/\\[a-zA-Z]/.test(text) && !/[_^]\{/.test(text)) return text;

  // Split into tokens (non-whitespace + whitespace runs), wrap math regions in $...$
  const tokens = text.split(/(\s+)/);
  // matches: \command, ^{…}, _{…}, bare ^digit/letter (e.g. 10^22), bare _digit/letter, or starts with ^ or _
  const isMathToken = (t: string) =>
    /\\[a-zA-Z]/.test(t) || /[_^]\{/.test(t) || /[_^]\w/.test(t) || /^\^/.test(t) || /^_/.test(t);

  const out: string[] = [];
  let buf = "";

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (isMathToken(tok)) {
      buf += tok;
    } else if (/^\s+$/.test(tok) && buf) {
      // whitespace inside a math run — include it only if the next token is also math
      const next = tokens[i + 1];
      if (next && isMathToken(next)) {
        buf += tok;
      } else {
        out.push(`$${buf.trim()}$`, tok);
        buf = "";
      }
    } else {
      if (buf) { out.push(`$${buf.trim()}$`); buf = ""; }
      out.push(tok);
    }
  }
  if (buf) out.push(`$${buf.trim()}$`);
  return out.join("");
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
 */
function normalizeLatexEscapes(text: string): string {
  return text.replace(/\\\\/g, "\\");
}

/**
 * Convert plain-text scientific notation and caret exponents to inline math.
 * - 6.022e23 → 6.022 × $10^{23}$
 * - 10^22 → $10^{22}$
 * - ^m, ^n, ^2 (bare caret + letter/digits) → $^{m}$, $^{n}$, $^{2}$ so they render as superscripts
 */
function scientificNotationToMath(text: string): string {
  let out = text;
  // e-notation: number e exponent → number × 10^{exponent}
  out = out.replace(/(\d+\.?\d*)e(\d+)/gi, (_, base, exp) => `${base} × $10^{${exp}}$`);
  // 10^nnn first so we don't match its ^ with the generic pattern below
  out = out.replace(/10\^(\d+)/g, (_, exp) => `$10^{${exp}}$`);
  // bare caret exponent (e.g. [A]^m, [B]^n, ]^2) → superscript
  out = out.replace(/\^([a-zA-Z0-9]+)/g, (_, exp) => `$^{${exp}}$`);
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
