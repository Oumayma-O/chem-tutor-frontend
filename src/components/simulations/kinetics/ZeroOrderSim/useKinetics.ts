import { useMemo } from "react";
import { MAX_TIME, TIME_STEP } from "./content";
import { zeroOrderConcentration, zeroOrderHalfLife } from "@/lib/kineticsMath";

export interface DataPoint {
  t: number;
  reactant: number;  // [A]t  (clamped ≥ 0)
  product: number;   // [A]₀ − [A]t
  rate: number;      // always k
}

export interface KineticsResult {
  /** Full time-series for charts (t = 0 … MAX_TIME). */
  series: DataPoint[];
  /** Concentration at the current slider time. */
  concAtT: number;
  /** Product concentration at the current slider time. */
  productAtT: number;
  /** Rate = k (constant). */
  rate: number;
  /** Half-life = [A]₀ / (2k). */
  halfLife: number;
  /** Fraction of reactant remaining (0–1). */
  fractionA: number;
}

export function useKinetics(
  k: number,
  initialConc: number,
  tCurrent: number,
): KineticsResult {
  return useMemo(() => {
    const rate = k;
    const halfLife = zeroOrderHalfLife(initialConc, k);

    // Build full series
    const series: DataPoint[] = [];
    const steps = Math.round(MAX_TIME / TIME_STEP);
    for (let i = 0; i <= steps; i++) {
      const t = parseFloat((i * TIME_STEP).toFixed(2));
      const reactant = zeroOrderConcentration(t, initialConc, k);
      const product = initialConc - reactant;
      series.push({ t, reactant, product, rate });
    }

    const concAtT = zeroOrderConcentration(tCurrent, initialConc, k);
    const productAtT = initialConc - concAtT;
    const fractionA = concAtT / initialConc;

    return { series, concAtT, productAtT, rate, halfLife, fractionA };
  }, [k, initialConc, tCurrent]);
}
