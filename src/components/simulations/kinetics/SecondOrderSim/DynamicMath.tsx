/**
 * Live equations panel for Second-Order Kinetics.
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
  invAatT: number;
  halfLife: number;
  reactantLabel: string;
  bReactantLabel?: string;
  tutorialStep: number;
  rateDisplay: string;    // e.g. "k[A]²" or "k[A][B]"
}

export function DynamicMath({
  k,
  initialConc,
  tCurrent,
  concAtT,
  invAatT,
  halfLife,
  reactantLabel,
  bReactantLabel,
  tutorialStep,
  rateDisplay,
}: Props) {
  const showNumbers  = tutorialStep >= 2;
  const showHalfLife = tutorialStep >= 4;

  const kF    = k.toFixed(3);
  const a0F   = initialConc.toFixed(2);
  const tF    = tCurrent.toFixed(1);
  const hlF   = isFinite(halfLife) ? halfLife.toFixed(2) : "∞";
  const inv0F = (1 / initialConc).toFixed(3);
  const invTF = isFinite(invAatT) ? invAatT.toFixed(3) : "∞";
  const atF   = concAtT.toFixed(3);

  return (
    <div className="flex-1 flex flex-col justify-center space-y-1 font-mono text-foreground w-full mx-auto px-1">

      {/* Row 1 — Integrated rate law symbolic */}
      <EqRow>
        <span>k = </span>
        <Frac
          top={<span><Frac top={<span>1</span>} bot={<span>[{reactantLabel}]<sub>t</sub></span>} /> − <Frac top={<span>1</span>} bot={<span>[{reactantLabel}]₀</span>} /></span>}
          bot={<span>t</span>}
        />
      </EqRow>

      {/* Row 2 — Live numbers */}
      <EqRow>
        <Live>{showNumbers ? kF : "?"}</Live>
        <span> = </span>
        <Frac
          top={<span><Live>{showNumbers ? invTF : "?"}</Live> − <Live>{showNumbers ? inv0F : "?"}</Live></span>}
          bot={<Live>{showNumbers ? tF : "?"}</Live>}
        />
      </EqRow>

      {/* Row 3 — Half-life */}
      <EqRow highlight={tutorialStep === 4}>
        <span>t<sub>1/2</sub> = </span>
        <Frac top="1" bot={<span>k[{reactantLabel}]₀</span>} />
        <span className="mx-3 text-muted-foreground">→</span>
        <Live>{showHalfLife ? hlF : "?"}</Live>
        <span> = </span>
        <Frac
          top="1"
          bot={<span><Live>{showHalfLife ? kF : "?"}</Live> × <Live>{showHalfLife ? a0F : "?"}</Live></span>}
        />
      </EqRow>

      {/* Row 4 — Rate law */}
      <EqRow>
        <span>Rate = </span>
        {rateDisplay === "k[A][B]" ? (
          <>
            <span>k[{reactantLabel}][{bReactantLabel ?? "B"}]</span>
            <span className="mx-3 text-muted-foreground">→</span>
            <Live>{kF}</Live>
            <span> × </span>
            <Live>{atF}</Live>
            <span> × </span>
            <Live>{atF}</Live>
            <span> = </span>
            <Live>{(k * concAtT * concAtT).toFixed(4)}</Live>
            <span> M/s</span>
          </>
        ) : (
          <>
            <span>k[{reactantLabel}]<Sup>2</Sup></span>
            <span className="mx-3 text-muted-foreground">→</span>
            <Live>{kF}</Live>
            <span> × </span>
            <Live>{atF}</Live>
            <Sup>2</Sup>
            <span> = </span>
            <Live>{(k * concAtT * concAtT).toFixed(4)}</Live>
            <span> M/s</span>
          </>
        )}
      </EqRow>
    </div>
  );
}
