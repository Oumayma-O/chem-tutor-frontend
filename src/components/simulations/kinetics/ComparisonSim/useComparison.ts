/**
 * Math hook for the Comparing Reaction Orders simulation.
 *
 * Returns concentration values and chart series for all three orders
 * at the current time `tCurrent`.
 */
import { useMemo } from "react";
import { ORDERS, INITIAL_CONC, MAX_TIME, TIME_STEP } from "./content";

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

function calcZero(t: number, a0: number, k: number): number {
  return Math.max(0, a0 - k * t);
}

function calcFirst(t: number, a0: number, k: number): number {
  return a0 * Math.exp(-k * t);
}

function calcSecond(t: number, a0: number, k: number): number {
  return a0 / (1 + a0 * k * t);
}

export function useComparison(tCurrent: number) {
  const [zeroOrder, firstOrder, secondOrder] = ORDERS;

  const snapshots: OrderSnapshot[] = useMemo(() => {
    return ORDERS.map((o, i) => {
      const calc = i === 0 ? calcZero : i === 1 ? calcFirst : calcSecond;
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
        zero:   calcZero(tSnap,   INITIAL_CONC, zeroOrder.k),
        first:  calcFirst(tSnap,  INITIAL_CONC, firstOrder.k),
        second: calcSecond(tSnap, INITIAL_CONC, secondOrder.k),
      });
    }
    return points;
  }, [zeroOrder.k, firstOrder.k, secondOrder.k]);

  /** Half-lives */
  const halfLives = useMemo(() => ({
    zero:   INITIAL_CONC / (2 * zeroOrder.k),
    first:  Math.LN2 / firstOrder.k,
    second: 1 / (secondOrder.k * INITIAL_CONC),
  }), [zeroOrder.k, firstOrder.k, secondOrder.k]);

  return { snapshots, series, halfLives };
}
