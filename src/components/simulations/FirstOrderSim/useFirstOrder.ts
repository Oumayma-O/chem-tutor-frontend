import { useMemo } from "react";
import { MAX_TIME, TIME_STEP } from "./content";

export interface DataPoint {
  t: number;
  reactant: number;  // [A]t
  product: number;   // [A]₀ − [A]t
  lnA: number;       // ln([A]t) — used for the second graph
  rate: number;      // k·[A]t
}

export interface FirstOrderResult {
  /** Full time-series for charts (t = 0 … MAX_TIME). */
  series: DataPoint[];
  /** [A] at the current slider time. */
  concAtT: number;
  /** [B] at the current slider time. */
  productAtT: number;
  /** ln([A]t) at the current slider time. */
  lnAatT: number;
  /** Rate = k·[A]t at the current slider time. */
  rate: number;
  /** Half-life = ln(2)/k — constant, independent of [A]₀. */
  halfLife: number;
  /** [A]t / [A]₀ — drives the shared ParticulateBeaker. */
  fractionA: number;
}

export function useFirstOrder(
  k: number,
  initialConc: number,
  tCurrent: number,
): FirstOrderResult {
  return useMemo(() => {
    const halfLife = Math.LN2 / k;

    const series: DataPoint[] = [];
    const steps = Math.round(MAX_TIME / TIME_STEP);
    for (let i = 0; i <= steps; i++) {
      const t        = parseFloat((i * TIME_STEP).toFixed(2));
      const reactant = initialConc * Math.exp(-k * t);
      const product  = initialConc - reactant;
      const lnA      = Math.log(reactant);  // natural log
      const rate     = k * reactant;
      series.push({ t, reactant, product, lnA, rate });
    }

    const concAtT    = initialConc * Math.exp(-k * tCurrent);
    const productAtT = initialConc - concAtT;
    const lnAatT     = Math.log(concAtT);
    const rate       = k * concAtT;
    const fractionA  = concAtT / initialConc;

    return { series, concAtT, productAtT, lnAatT, rate, halfLife, fractionA };
  }, [k, initialConc, tCurrent]);
}
