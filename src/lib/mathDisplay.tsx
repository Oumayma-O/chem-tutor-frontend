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

interface MathTextProps {
  children: string;
  className?: string;
}

export function MathText({ children, className }: MathTextProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={inlineComponents}
      className={className}
    >
      {children}
    </ReactMarkdown>
  );
}

/**
 * Backwards-compatible shim.
 * All existing call-sites using formatMathContent(text) continue to work.
 */
export function formatMathContent(text: string): React.ReactNode {
  return <MathText>{text}</MathText>;
}
