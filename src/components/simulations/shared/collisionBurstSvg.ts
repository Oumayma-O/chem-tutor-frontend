/**
 * Shared imperative SVG “collision burst” ring animation (expanding stroke ring + center).
 * Used by SecondOrderBeaker and Arrhenius ParticulateBeaker for consistent feedback.
 */

export type SvgCollisionBurst = {
  slot: number;
  x: number;
  y: number;
  frame: number;
  color: string;
};

export const COLLISION_BURST_DEFAULTS = {
  nBursts: 12,
  burstFrames: 22,
  burstRMax: 20,
  opacityPeak: 0.75,
  strokeWidth: 2,
} as const;

export type AdvanceCollisionBurstsOpts = {
  elementId: (slot: number) => string;
  particleRadius: number;
  burstFrames: number;
  burstRMax: number;
  opacityPeak?: number;
  strokeWidth?: number;
};

/**
 * Mutates each burst’s `frame`, updates matching `<circle>` in `svg`, returns surviving bursts.
 */
export function advanceCollisionBurstRings(
  svg: SVGSVGElement,
  bursts: SvgCollisionBurst[],
  opts: AdvanceCollisionBurstsOpts,
): SvgCollisionBurst[] {
  const {
    elementId,
    particleRadius,
    burstFrames,
    burstRMax,
    opacityPeak = COLLISION_BURST_DEFAULTS.opacityPeak,
    strokeWidth = COLLISION_BURST_DEFAULTS.strokeWidth,
  } = opts;

  return bursts.filter((b) => {
    b.frame--;
    const progress = b.frame / burstFrames;
    const el = svg.getElementById(elementId(b.slot)) as SVGCircleElement | null;
    if (el) {
      el.setAttribute("cx", b.x.toFixed(1));
      el.setAttribute("cy", b.y.toFixed(1));
      el.setAttribute("r", (particleRadius + (1 - progress) * burstRMax).toFixed(1));
      el.setAttribute("opacity", (progress * opacityPeak).toFixed(2));
      el.setAttribute("stroke", b.color);
      el.setAttribute("stroke-width", String(strokeWidth));
      el.setAttribute("fill", "none");
    }
    if (b.frame <= 0) {
      el?.setAttribute("opacity", "0");
      return false;
    }
    return true;
  });
}
