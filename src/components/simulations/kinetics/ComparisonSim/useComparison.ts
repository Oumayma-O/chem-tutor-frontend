/**
 * Math hook for the Comparing Reaction Orders simulation.
 *
 * Returns concentration values and chart series for all three orders
 * at the current time `tCurrent`.
 */
import { useMemo } from "react";
import { ORDERS, INITIAL_CONC, MAX_TIME, TIME_STEP } from "./content";
import {
  zeroOrderConcentration,
  firstOrderConcentration,
  secondOrderConcentration,
  zeroOrderHalfLife,
  firstOrderHalfLife,
  secondOrderHalfLife,
} from "@/lib/kineticsMath";

export interface OrderSnapshot {
  concA: number;   // reactant remaining
  concP: number;   // product formed
  fractionA: number; // 0→1 for beaker
}

export interface ChartPoint {
  t: number;
  zero: number;
  first: number;
  second: number;
}

export function useComparison(tCurrent: number) {
  const [zeroOrder, firstOrder, secondOrder] = ORDERS;

  const snapshots: OrderSnapshot[] = useMemo(() => {
    return ORDERS.map((o, i) => {
      const calc = i === 0 ? zeroOrderConcentration : i === 1 ? firstOrderConcentration : secondOrderConcentration;
      const concA = calc(tCurrent, INITIAL_CONC, o.k);
      const concP = INITIAL_CONC - concA;
      return {
        concA,
        concP,
        fractionA: concA / INITIAL_CONC,
      };
    });
  }, [tCurrent]);

  /** Full [A] vs t series for the multi-line chart */
  const series: ChartPoint[] = useMemo(() => {
    const points: ChartPoint[] = [];
    for (let t = 0; t <= MAX_TIME + TIME_STEP / 2; t += TIME_STEP) {
      const tSnap = Math.min(t, MAX_TIME);
      points.push({
        t: parseFloat(tSnap.toFixed(2)),
        zero:   zeroOrderConcentration(tSnap,   INITIAL_CONC, zeroOrder.k),
        first:  firstOrderConcentration(tSnap,  INITIAL_CONC, firstOrder.k),
        second: secondOrderConcentration(tSnap, INITIAL_CONC, secondOrder.k),
      });
    }
    return points;
  }, [zeroOrder.k, firstOrder.k, secondOrder.k]);

  /** Half-lives */
  const halfLives = useMemo(() => ({
    zero:   zeroOrderHalfLife(INITIAL_CONC, zeroOrder.k),
    first:  firstOrderHalfLife(firstOrder.k),
    second: secondOrderHalfLife(INITIAL_CONC, secondOrder.k),
  }), [zeroOrder.k, firstOrder.k, secondOrder.k]);

  return { snapshots, series, halfLives };
}
