import React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Math rendering via KaTeX.
 * Supports both $...$ (legacy) and \(...\) (current) inline math delimiters.
 *
 * formatMathContent — inline renderer, strips wrapping <p> for use within
 *                     existing block elements. Keeps same call signature as
 *                     the previous custom parser so no call sites need to change.
 *
 * formatMathBlock   — block renderer that preserves \n\n paragraph breaks.
 *                     Used by ProblemCard for the full problem statement.
 */

const REMARK_PLUGINS = [remarkMath] as const;
const REHYPE_PLUGINS = [rehypeKatex] as const;

/** Strips the <p> wrapper react-markdown adds, so math renders inline. */
const InlineParagraph = ({ children }: ComponentPropsWithoutRef<"p">) => (
  <>{children}</>
);

export function formatMathContent(text: string): React.ReactNode {
  if (!text) return null;
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={{ p: InlineParagraph }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function formatMathBlock(text: string, paraClassName?: string): React.ReactNode {
  if (!text) return null;
  const Para = paraClassName
    ? ({ children }: ComponentPropsWithoutRef<"p">) => (
        <p className={paraClassName}>{children}</p>
      )
    : undefined;
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={REHYPE_PLUGINS}
      components={Para ? { p: Para } : undefined}
    >
      {text}
    </ReactMarkdown>
  );
}
