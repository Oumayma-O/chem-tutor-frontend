/**
 * Live equations panel for First-Order Kinetics.
 *
 * Row 1 — Integrated rate law (symbolic)
 * Row 2 — Integrated rate law (concrete numbers, live)
 * Row 3 — Half-life
 * Row 4 — Rate law with exponent
 */
import type { ReactNode } from "react";

// ── Primitive helpers ─────────────────────────────────────────────────

function Frac({ top, bot }: { top: ReactNode; bot: ReactNode }) {
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

function Live({ children }: { children: ReactNode }) {
  return <span className="text-orange-500 font-semibold">{children}</span>;
}

function Sup({ children }: { children: ReactNode }) {
  return (
    <sup style={{ fontSize: "0.72em", verticalAlign: "super", lineHeight: 0 }}>
      {children}
    </sup>
  );
}

function EqRow({ children, highlight = false }: { children: ReactNode; highlight?: boolean }) {
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

// ─────────────────────────────────────────────────────────────────────

interface Props {
  k: number;
  initialConc: number;
  tCurrent: number;
  concAtT: number;
  lnAatT: number;
  halfLife: number;
  reactantLabel: string;
  tutorialStep: number;
}

export function DynamicMath({
  k,
  initialConc,
  tCurrent,
  concAtT,
  lnAatT,
  halfLife,
  reactantLabel,
  tutorialStep,
}: Props) {
  const showNumbers  = tutorialStep >= 3;
  const showHalfLife = tutorialStep >= 5;

  const kF   = k.toFixed(3);
  const a0F  = initialConc.toFixed(2);
  const atF  = concAtT.toFixed(3);
  const tF   = tCurrent.toFixed(1);
  const hlF  = isFinite(halfLife) ? halfLife.toFixed(2) : "∞";
  const lnA0 = Math.log(initialConc).toFixed(3);
  const lnAt = isFinite(lnAatT) ? lnAatT.toFixed(3) : "−∞";

  return (
    <div className="space-y-1 font-mono text-foreground w-full max-w-2xl mx-auto px-1 mt-1">

      {/* Row 1 — Integrated rate law symbolic */}
      <EqRow>
        <span>k = </span>
        <Frac
          top={<span>ln[{reactantLabel}]₀ − ln[{reactantLabel}]<sub>t</sub></span>}
          bot={<span>t</span>}
        />
      </EqRow>

      {/* Row 2 — Live numbers */}
      <EqRow>
        <Live>{showNumbers ? kF : "?"}</Live>
        <span> = </span>
        <Frac
          top={<span><Live>{showNumbers ? lnA0 : "?"}</Live> − (<Live>{showNumbers ? lnAt : "?"}</Live>)</span>}
          bot={<Live>{showNumbers ? tF : "?"}</Live>}
        />
      </EqRow>

      {/* Row 3 — Half-life */}
      <EqRow highlight={tutorialStep === 5}>
        <span>t<sub>1/2</sub> = </span>
        <Frac top="ln(2)" bot="k" />
        <span className="mx-3 text-muted-foreground">→</span>
        <Live>{showHalfLife ? hlF : "?"}</Live>
        <span> = </span>
        <Frac
          top="0.693"
          bot={<Live>{showHalfLife ? kF : "?"}</Live>}
        />
      </EqRow>

      {/* Row 4 — Rate law */}
      <EqRow>
        <span>Rate = k[{reactantLabel}]<Sup>1</Sup></span>
        <span className="mx-3 text-muted-foreground">→</span>
        <Live>{kF}</Live>
        <span> × </span>
        <Live>{atF}</Live>
        <span> = </span>
        <Live>{(k * concAtT).toFixed(4)}</Live>
        <span> M/s</span>
      </EqRow>
    </div>
  );
}
