/**
 * Live equations panel for First-Order Kinetics.
 *
 * Row 1 — Integrated rate law (symbolic)
 * Row 2 — Integrated rate law (concrete numbers, live)
 * Row 3 — Half-life
 * Row 4 — Rate law with exponent
 */
import { Frac, Live, Sup, EqRow } from "../shared/DynamicMathPrimitives";

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
    <div className="flex-1 flex flex-col justify-center space-y-1 font-mono text-foreground w-full mx-auto px-1">

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
