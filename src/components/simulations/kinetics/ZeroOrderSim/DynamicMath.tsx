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
import { Frac, Live, Sup, EqRow } from "../shared/DynamicMathPrimitives";

// ─────────────────────────────────────────────────────────────────────

interface Props {
  k: number;
  initialConc: number;
  tCurrent: number;
  concAtT: number;
  halfLife: number;
  reactantLabel: string;
  tutorialStep: number;
}

const DELTA_T = 5; // seconds window used for the live rate row

export function DynamicMath({
  k,
  initialConc,
  tCurrent,
  concAtT,
  halfLife,
  reactantLabel,
  tutorialStep,
}: Props) {
  // Progressive reveal: live numbers hidden until the relevant tutorial step
  const showRate     = tutorialStep >= 3;
  const showHalfLife = tutorialStep >= 4;
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
    <div className="space-y-1.5 font-mono text-foreground w-full max-w-2xl mx-auto px-1">
      <EqRow>
        <span>Rate = k = −</span>
        <Frac top="Δc" bot="Δt" />
        <span>= −</span>
        <Frac top={<span>c<sub>2</sub> − c<sub>1</sub></span>} bot={<span>t<sub>2</sub> − t<sub>1</sub></span>} />
      </EqRow>

      <EqRow>
        <span>Rate = </span>
        <Live>{showRate ? kF : "?"}</Live>
        <span> = −</span>
        <Frac
          top={<span>(<Live>{showRate ? negDeltaConc : "?"}</Live>)</span>}
          bot={<Live>{showRate ? dtF : "?"}</Live>}
        />
        <span> = −</span>
        <Frac
          top={<span><Live>{showRate ? conc2F : "?"}</Live> − <Live>{showRate ? atF : "?"}</Live></span>}
          bot={<span><Live>{showRate ? t2F : "?"}</Live> − <Live>{showRate ? tF : "?"}</Live></span>}
        />
      </EqRow>

      <EqRow highlight={tutorialStep === 4}>
        <span>t<sub>1/2</sub> = [A<sub>0</sub>]/(2k)</span>
        <span className="mx-3 text-muted-foreground">→</span>
        <Live>{showHalfLife ? hlF : "?"}</Live>
        <span> = </span>
        <Live>{showHalfLife ? a0F : "?"}</Live>
        <span>/(2×</span>
        <Live>{showHalfLife ? kF : "?"}</Live>
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
