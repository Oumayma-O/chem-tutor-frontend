/**
 * Live equations panel — plain JSX with inline fraction layout.
 * No KaTeX / dangerouslySetInnerHTML so there is no [object Object] risk.
 *
 * Matches the legacy layout:
 *   Row 1 — static symbolic form
 *   Row 2 — concrete numbers (live, orange)
 *   Row 3 — half-life
 *   Row 4 — rate law with exponent
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

function EqRow({ children }: { children: ReactNode }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2">
      <div className="flex items-center gap-1 flex-wrap leading-7 text-sm">
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
  halfLife: number;
  reactantLabel: string;
}

const DELTA_T = 5; // seconds window used for the live rate row

export function DynamicMath({
  k,
  initialConc,
  tCurrent,
  concAtT,
  halfLife,
  reactantLabel,
}: Props) {
  const t2 = Math.min(tCurrent + DELTA_T, 20);
  const conc2 = Math.max(0, initialConc - k * t2);
  const deltaConc = conc2 - concAtT;                 // negative (reactant decreasing)
  const negDeltaConc = Math.abs(deltaConc).toFixed(2); // positive magnitude

  const kF        = k.toFixed(2);
  const a0F       = initialConc.toFixed(2);
  const atF       = concAtT.toFixed(2);
  const conc2F    = conc2.toFixed(2);
  const t2F       = t2.toFixed(2);
  const tF        = tCurrent.toFixed(2);
  const dtF       = (t2 - tCurrent).toFixed(2);
  const hlF       = isFinite(halfLife) ? halfLife.toFixed(2) : "∞";

  return (
    <div className="space-y-2 font-mono text-foreground max-w-lg mx-auto w-full">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        Zero-Order Kinetics Equations
      </div>

      <EqRow>
        <span>Rate = k = −</span>
        <Frac top="Δc" bot="Δt" />
        <span>= −</span>
        <Frac top={<span>c<sub>2</sub> − c<sub>1</sub></span>} bot={<span>t<sub>2</sub> − t<sub>1</sub></span>} />
      </EqRow>

      <EqRow>
        <span>Rate = </span>
        <Live>{kF}</Live>
        <span> = −</span>
        <Frac
          top={<span>(<Live>{negDeltaConc}</Live>)</span>}
          bot={<Live>{dtF}</Live>}
        />
        <span> = −</span>
        <Frac
          top={<span><Live>{conc2F}</Live> − <Live>{atF}</Live></span>}
          bot={<span><Live>{t2F}</Live> − <Live>{tF}</Live></span>}
        />
      </EqRow>

      <EqRow>
        <span>t<sub>1/2</sub> = [A<sub>0</sub>]/(2k)</span>
        <span className="mx-3 text-muted-foreground">→</span>
        <Live>{hlF}</Live>
        <span> = </span>
        <Live>{a0F}</Live>
        <span>/(2×</span>
        <Live>{kF}</Live>
        <span>)</span>
      </EqRow>

      <EqRow>
        <span>Rate = k[{reactantLabel}]<Sup>0</Sup></span>
        <span className="mx-3 text-muted-foreground">→</span>
        <Live>{kF}</Live>
        <span> = </span>
        <Live>{kF}</Live>
        <span>(</span>
        <Live>{atF}</Live>
        <span>)<Sup>0</Sup></span>
      </EqRow>
    </div>
  );
}
