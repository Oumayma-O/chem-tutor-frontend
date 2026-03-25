import { useMemo } from "react";
import { MAX_TIME, TIME_STEP } from "./content";

export interface DataPoint {
  t: number;
  reactant: number;  // [A]t  = 1/(k·t + 1/[A]₀)
  product: number;   // [A]₀ − [A]t
  invA: number;      // 1/[A]t = k·t + 1/[A]₀  (linear, positive slope)
  rate: number;      // k·[A]t²
}

export interface SecondOrderResult {
  series: DataPoint[];
  concAtT: number;
  productAtT: number;
  invAatT: number;
  halfLife: number;
  fractionA: number;
}

export function useSecondOrder(
  k: number,
  initialConc: number,
  tCurrent: number,
): SecondOrderResult {
  return useMemo(() => {
    const inv0    = 1 / initialConc;
    const halfLife = 1 / (k * initialConc);

    const series: DataPoint[] = [];
    const steps = Math.round(MAX_TIME / TIME_STEP);
    for (let i = 0; i <= steps; i++) {
      const t        = parseFloat((i * TIME_STEP).toFixed(2));
      const reactant = 1 / (k * t + inv0);
      const product  = initialConc - reactant;
      const invA     = k * t + inv0;          // = 1/reactant
      const rate     = k * reactant * reactant;
      series.push({ t, reactant, product, invA, rate });
    }

    const concAtT    = 1 / (k * tCurrent + inv0);
    const productAtT = initialConc - concAtT;
    const invAatT    = k * tCurrent + inv0;
    const fractionA  = concAtT / initialConc;

    return { series, concAtT, productAtT, invAatT, halfLife, fractionA };
  }, [k, initialConc, tCurrent]);
}
