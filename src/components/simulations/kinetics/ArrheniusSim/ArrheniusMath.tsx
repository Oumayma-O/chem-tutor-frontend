import type { ReactNode } from "react";
import { UNIVERSAL_R, type ReactionConfig } from "./content";
import { arrheniusRateConstant } from "./useArrhenius";
import { TUTORIAL_RING_EQUATION_PILL } from "./arrheniusTutorialUi";
import { cn } from "@/lib/utils";

interface Props {
  reaction: ReactionConfig;
  effectiveEa: number;
  temperature: number;
  k: number;
  lnK: number;
  invT: number;
  highlightArrheniusPill?: boolean;
  highlightLinearPill?: boolean;
  highlightTwoPointPill?: boolean;
  /** Show "Pick two temperatures (model)" only on Arrhenius footer Step 9 (two-point form). */
  showTwoPointControls?: boolean;
  twoPointT1?: number;
  twoPointT2?: number;
  onTwoPointT1?: (t: number) => void;
  onTwoPointT2?: (t: number) => void;
}

function fmtSci(val: number): string {
  if (val === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(val)));
  const coef = val / Math.pow(10, exp);
  return `${coef.toFixed(2)} × 10^${exp}`;
}

function fmtK(val: number): string {
  if (!isFinite(val)) return "≈ 0";
  if (val < 1e-10) return "≈ 0";
  return fmtSci(val);
}

/** Outer inset + softer ring so scroll/overflow parents don’t clip the highlight. */
function EquationCard({
  dataTutorial,
  highlight,
  children,
}: {
  dataTutorial: string;
  highlight: boolean;
  children: ReactNode;
}) {
  const card = (
    <div
      data-tutorial={dataTutorial}
      className={cn(
        "rounded-lg border border-border bg-card px-3 py-2",
        highlight && TUTORIAL_RING_EQUATION_PILL,
      )}
    >
      {children}
    </div>
  );
  if (!highlight) return card;
  return (
    <div className="overflow-visible py-2 px-2 -my-2 -mx-2">
      {card}
    </div>
  );
}

export function ArrheniusMath({
  reaction,
  effectiveEa,
  temperature,
  k,
  lnK,
  invT,
  highlightArrheniusPill = false,
  highlightLinearPill = false,
  highlightTwoPointPill = false,
  showTwoPointControls = false,
  twoPointT1 = 300,
  twoPointT2 = 400,
  onTwoPointT1,
  onTwoPointT2,
}: Props) {
  const eaKJ = (effectiveEa / 1000).toFixed(1);
  const invTStr = invT.toExponential(4);
  const lnAStr = Math.log(reaction.A).toFixed(2);

  const tLow = Math.min(twoPointT1, twoPointT2);
  const tHigh = Math.max(twoPointT1, twoPointT2);
  const k1Model = arrheniusRateConstant(reaction.A, reaction.Ea, tLow);
  const k2Model = arrheniusRateConstant(reaction.A, reaction.Ea, tHigh);
  const invGap = 1 / tLow - 1 / tHigh;
  const eaFromTwoPoint =
    invGap !== 0
      ? (UNIVERSAL_R * Math.log(k2Model / k1Model)) / invGap
      : NaN;

  return (
    <div className="flex flex-col gap-2 overflow-visible">
      {/* ── 1. Arrhenius equation ── */}
      <EquationCard
        dataTutorial="equation-arrhenius"
        highlight={highlightArrheniusPill}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Arrhenius Equation
        </p>
        {/* Generic form */}
        <p className="text-xs text-foreground font-mono">
          k = A · e<sup style={{ fontSize: "0.72em" }}>−E<sub>a</sub>/RT</sup>
        </p>
        {/* Live substitution */}
        <div className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed font-mono">
          <span>k = {reaction.A.toExponential(2)} · e</span>
          <sup style={{ fontSize: "0.72em" }}>
            −<span className="text-sky-700 dark:text-sky-300 font-semibold">{eaKJ}×10³</span>
            {" / "}
            <span className="text-sky-700 dark:text-sky-300 font-semibold">
              ({UNIVERSAL_R.toFixed(3)}×{temperature})
            </span>
          </sup>
        </div>
        <div className="mt-1 text-[11px] font-semibold text-amber-500 font-mono transition-colors duration-300">
          k ≈ {fmtK(k)} s⁻¹
        </div>
      </EquationCard>

      {/* ── 2. Linear form ── */}
      <EquationCard
        dataTutorial="equation-linear"
        highlight={highlightLinearPill}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Linear Form
        </p>
        {/* Generic */}
        <p className="text-xs text-foreground font-mono">
          ln(k) = (−E<sub>a</sub>/R) · (1/T) + ln(A)
        </p>
        {/* Live values */}
        <div className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed font-mono">
          <div>
            slope = −E<sub>a</sub>/R = −{(effectiveEa / UNIVERSAL_R).toFixed(0)} K
          </div>
          <div>1/T = {invTStr} K⁻¹</div>
          <div>ln(A) = {lnAStr}</div>
        </div>
        <div className="mt-1 text-[11px] font-semibold text-amber-500 font-mono">
          ln(k) = {isFinite(lnK) ? lnK.toFixed(3) : "−∞"}
        </div>
      </EquationCard>

      {/* ── 3. Two-point form (sliders only when showTwoPointControls) ── */}
      <EquationCard
        dataTutorial="equation-twopoint"
        highlight={highlightTwoPointPill}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Two-Point Form
        </p>
        <p className="text-xs text-foreground font-mono leading-relaxed">
          ln(k<sub>2</sub>/k<sub>1</sub>) = (E<sub>a</sub>/R) · (1/T<sub>1</sub> − 1/T<sub>2</sub>)
        </p>
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
          Use when k is known at two temperatures to solve for E<sub>a</sub>.
        </p>
        {showTwoPointControls && onTwoPointT1 && onTwoPointT2 && (
          <div className="mt-2 space-y-2 rounded-md border border-border/80 bg-muted/30 p-2">
            <p className="text-[10px] font-medium text-foreground">Pick two temperatures (model)</p>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="w-8 shrink-0">T₁</span>
                <input
                  type="range"
                  min={250}
                  max={650}
                  step={5}
                  value={tLow}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    onTwoPointT1(Math.min(v, tHigh - 10));
                  }}
                  className="flex-1"
                />
                <span className="w-12 font-mono text-foreground">{tLow} K</span>
              </label>
              <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="w-8 shrink-0">T₂</span>
                <input
                  type="range"
                  min={250}
                  max={650}
                  step={5}
                  value={tHigh}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    onTwoPointT2(Math.max(v, tLow + 10));
                  }}
                  className="flex-1"
                />
                <span className="w-12 font-mono text-foreground">{tHigh} K</span>
              </label>
            </div>
            <p className="text-[10px] font-mono text-foreground leading-relaxed">
              k₁ ≈ {fmtK(k1Model)} · k₂ ≈ {fmtK(k2Model)}
            </p>
            <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              Eₐ from two-point ≈{" "}
              {isFinite(eaFromTwoPoint) ? (eaFromTwoPoint / 1000).toFixed(1) : "—"} kJ/mol · model{" "}
              {(reaction.Ea / 1000).toFixed(1)} kJ/mol
            </p>
          </div>
        )}
      </EquationCard>
    </div>
  );
}
