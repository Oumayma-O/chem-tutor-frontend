/**
 * React rendering layer for math/LaTeX content.
 * Normalization (pure string transforms) lives in mathNormalize.ts.
 */
import React, { Component } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";
import {
  fixCdotKelvinForKatex,
  autoWrapLatex,
  preferDisplayMathBody,
  normalizeMathString,
  type RenderMode,
} from "./mathNormalize";

// ─── Shared ReactMarkdown plugin config (module-level = stable references) ────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REMARK_PLUGINS: any[] = [remarkMath];
const KATEX_OPTIONS = { throwOnError: false, strict: false, trust: false };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REHYPE_PLUGINS: any[] = [[rehypeKatex, KATEX_OPTIONS]];

// ─── Inline renderer ───────────────────────────────────────────────────────────

/** Prevent react-markdown from emitting block elements so MathText is safe inside <p>. */
const inlineComponents: Components = {
  p: ({ children }) => <span>{children}</span>,
  blockquote: ({ children }) => <span>{children}</span>,
  ul: ({ children }) => <span>{children}</span>,
  ol: ({ children }) => <span>{children}</span>,
  li: ({ children }) => <span className="before:content-['•'] before:mr-1">{children}</span>,
};

interface MathTextProps {
  children: string;
  className?: string;
  /** Block/display math ($$...$$) — use for equation lines and tall fractions. */
  preferDisplay?: boolean;
}

export function MathText({ children, className, preferDisplay }: MathTextProps) {
  const safeText = fixCdotKelvinForKatex(children);
  let body = autoWrapLatex(safeText);
  if (preferDisplay) body = preferDisplayMathBody(body);
  return (
    <span
      className={cn(
        "math-content-katex inline-block max-w-full min-w-0 overflow-x-auto scrollbar-hide align-middle",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={inlineComponents}
      >
        {body}
      </ReactMarkdown>
    </span>
  );
}

// ─── Block renderer (hints / explanations) ────────────────────────────────────

/**
 * Block markdown renderer for hint and explanation text.
 * Renders paragraphs, bullets, bold, and inline math correctly.
 * Use this instead of formatMathContent() for multi-line prose content.
 */
const blockComponents: Components = {
  code: ({ children }) => (
    <code className="font-mono text-xs bg-slate-100 rounded px-1 py-0.5">{children}</code>
  ),
};

export function HintMarkdown({ children, className }: { children: string; className?: string }) {
  const normalized = normalizeMathString(children, "hint");
  return (
    <div
      className={cn(
        "hint-markdown text-sm text-foreground leading-relaxed",
        "[&>p]:mb-2 [&>p:last-child]:mb-0",
        "[&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mb-2",
        "[&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:mb-2",
        "[&_li]:mb-0.5",
        "[&_strong]:font-semibold",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={blockComponents}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

// ─── Error boundary ───────────────────────────────────────────────────────────

/** Catches any render error inside MathText and falls back to the raw source string. */
class MathErrorBoundary extends Component<
  { children: React.ReactNode; fallback: string },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return <span>{this.props.fallback}</span>;
    return this.props.children;
  }
}

// ─── Main entry point (inline, backward-compatible) ───────────────────────────

export type FormatMathContentOptions = {
  /** Prefer display math ($$) for drag_drop–style equations and tall fractions. */
  preferDisplay?: boolean;
  /** If set, also use display math when the normalized string is at least this long. */
  longMathThreshold?: number;
  /**
   * Normalization mode.
   * - "equation" — pure math (equation_parts, labeled values, correct_answer).
   *   Skips prose-aware transforms so chemistry terms like "charge", "mass",
   *   "formula" are never pulled out of math context.
   * - "mixed"    — prose + inline math (instructions, statements). Default.
   */
  mode?: RenderMode;
};

/**
 * Format math content for inline rendering.
 * For multi-line prose (hints, explanations), use <HintMarkdown> instead.
 */
export function formatMathContent(text: string, opts?: FormatMathContentOptions): React.ReactNode {
  const normalized = normalizeMathString(text, opts?.mode ?? "mixed");
  const preferDisplay =
    opts?.preferDisplay === true ||
    (opts?.longMathThreshold != null && normalized.length >= opts.longMathThreshold);
  return (
    <MathErrorBoundary fallback={text}>
      <MathText preferDisplay={preferDisplay}>{normalized}</MathText>
    </MathErrorBoundary>
  );
}
