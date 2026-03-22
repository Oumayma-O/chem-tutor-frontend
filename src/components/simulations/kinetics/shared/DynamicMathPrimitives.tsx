/**
 * Shared equation primitives used by all three DynamicMath panels.
 * Pure JSX — no KaTeX / dangerouslySetInnerHTML.
 */
import type { ReactNode } from "react";

export function Frac({ top, bot }: { top: ReactNode; bot: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        verticalAlign: "middle",
        lineHeight: 1.15,
        margin: "0 2px",
      }}
    >
      <span style={{ borderBottom: "1px solid currentColor", paddingBottom: "1px", whiteSpace: "nowrap" }}>
        {top}
      </span>
      <span style={{ paddingTop: "1px", whiteSpace: "nowrap" }}>{bot}</span>
    </span>
  );
}

export function Live({ children }: { children: ReactNode }) {
  return <span className="text-orange-500 font-semibold">{children}</span>;
}

export function Sup({ children }: { children: ReactNode }) {
  return (
    <sup style={{ fontSize: "0.72em", verticalAlign: "super", lineHeight: 0 }}>
      {children}
    </sup>
  );
}

export function EqRow({ children, highlight = false }: { children: ReactNode; highlight?: boolean }) {
  return (
    <div className={`w-full bg-slate-50 dark:bg-slate-900/60 border rounded-xl px-3 py-1.5 transition-all duration-300 ${
      highlight
        ? "border-blue-400 dark:border-blue-500 ring-2 ring-blue-300 dark:ring-blue-600 ring-offset-1"
        : "border-slate-200 dark:border-slate-700"
    }`}>
      <div className="flex items-center gap-1 flex-wrap leading-6 text-sm min-w-0">
        {children}
      </div>
    </div>
  );
}
