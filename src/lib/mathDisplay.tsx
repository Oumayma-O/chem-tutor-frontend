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
 * Backwards-compatible shim.
 * All existing call-sites using formatMathContent(text) continue to work.
 */
export function formatMathContent(text: string): React.ReactNode {
  return <MathText>{text}</MathText>;
}
