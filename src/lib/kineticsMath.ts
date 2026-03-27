export function clampNonNegative(value: number): number {
  return Math.max(0, value);
}

export function zeroOrderConcentration(t: number, a0: number, k: number): number {
  return clampNonNegative(a0 - k * t);
}

export function firstOrderConcentration(t: number, a0: number, k: number): number {
  return a0 * Math.exp(-k * t);
}

export function secondOrderConcentration(t: number, a0: number, k: number): number {
  return a0 / (1 + a0 * k * t);
}

export function zeroOrderHalfLife(a0: number, k: number): number {
  return a0 / (2 * k);
}

export function firstOrderHalfLife(k: number): number {
  return Math.LN2 / k;
}

export function secondOrderHalfLife(a0: number, k: number): number {
  return 1 / (a0 * k);
}

