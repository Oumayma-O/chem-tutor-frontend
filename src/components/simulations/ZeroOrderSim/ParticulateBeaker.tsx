/**
 * Particulate-level beaker with Brownian-motion animation.
 *
 * Architecture:
 *  - Positions stored in a useRef (not state) so animation never triggers re-renders.
 *  - A requestAnimationFrame loop updates positions and writes directly to DOM via
 *    circleRefs — React is bypassed for the motion path.
 *  - Color changes (fractionA prop) are handled by a separate useEffect that sets
 *    fill attributes imperatively, so React reconciliation never resets live positions.
 *  - The JSX renders circles with cx="0" cy="0" as placeholders; the mount effect
 *    immediately writes the seeded initial positions before the first paint.
 */
import { useEffect, useRef, useLayoutEffect } from "react";

const N = 40;
const R = 5.5; // particle radius (SVG units)

// Beaker SVG geometry
const VW = 200; // viewBox width
const VH = 220; // viewBox height
const BODY = { x: 18, y: 32, w: 164, h: 168 }; // liquid area
const PZ = {    // particle zone (inner, respecting radius)
  minX: BODY.x + R + 4,
  maxX: BODY.x + BODY.w - R - 4,
  minY: BODY.y + R + 4,
  maxY: BODY.y + BODY.h - R - 4,
};

// ── Seeded LCG pseudo-random ──────────────────────────────────────────
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

interface Particle { x: number; y: number; vx: number; vy: number }

// Stable initial state (module level — never recomputed).
const INITIAL: Particle[] = (() => {
  const rng = lcg(0xfeed42);
  return Array.from({ length: N }, () => {
    const speed = 0.35 + rng() * 0.45;
    const angle = rng() * Math.PI * 2;
    return {
      x: PZ.minX + rng() * (PZ.maxX - PZ.minX),
      y: PZ.minY + rng() * (PZ.maxY - PZ.minY),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  });
})();

// Conversion order: particle at index CONVERT_ORDER[i] is the i-th to turn product.
// PRIORITY[j] = rank of particle j in conversion order.
const CONVERT_ORDER: number[] = (() => {
  const rng = lcg(0xbeef99);
  const arr = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
})();
const PRIORITY: number[] = new Array(N);
CONVERT_ORDER.forEach((particleIdx, rank) => { PRIORITY[particleIdx] = rank; });

// ─────────────────────────────────────────────────────────────────────

interface Props {
  fractionA: number;
  reactantColor: string;
  productColor: string;
  reactantLabel: string;
  productLabel: string;
}

export function ParticulateBeaker({
  fractionA,
  reactantColor,
  productColor,
  reactantLabel,
  productLabel,
}: Props) {
  const circleRefs = useRef<(SVGCircleElement | null)[]>(new Array(N).fill(null));
  const posRef = useRef<Particle[]>(INITIAL.map(p => ({ ...p })));
  const rafRef = useRef<number>(0);
  const colorsRef = useRef({ reactantColor, productColor });

  // Keep colors ref fresh without re-running the RAF effect.
  useLayoutEffect(() => {
    colorsRef.current = { reactantColor, productColor };
  });

  // ── Set initial positions imperatively before first paint ──────────
  useLayoutEffect(() => {
    posRef.current.forEach((p, i) => {
      const el = circleRefs.current[i];
      if (el) {
        el.setAttribute("cx", p.x.toFixed(1));
        el.setAttribute("cy", p.y.toFixed(1));
      }
    });
  }, []);

  // ── Brownian motion RAF loop ───────────────────────────────────────
  useEffect(() => {
    let last = 0;
    const FRAME_MS = 33; // ~30 fps

    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      last = now;

      posRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x - R < PZ.minX) { p.vx = Math.abs(p.vx);  p.x = PZ.minX + R; }
        if (p.x + R > PZ.maxX) { p.vx = -Math.abs(p.vx); p.x = PZ.maxX - R; }
        if (p.y - R < PZ.minY) { p.vy = Math.abs(p.vy);  p.y = PZ.minY + R; }
        if (p.y + R > PZ.maxY) { p.vy = -Math.abs(p.vy); p.y = PZ.maxY - R; }

        const el = circleRefs.current[i];
        if (el) {
          el.setAttribute("cx", p.x.toFixed(1));
          el.setAttribute("cy", p.y.toFixed(1));
        }
      });
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Update colors when fractionA changes ──────────────────────────
  useEffect(() => {
    const nA = Math.round(fractionA * N);
    const { reactantColor: rC, productColor: pC } = colorsRef.current;
    circleRefs.current.forEach((el, i) => {
      if (el) el.setAttribute("fill", PRIORITY[i] < nA ? rC : pC);
    });
  }, [fractionA, reactantColor, productColor]);

  const nA = Math.round(fractionA * N);

  return (
    <div className="flex flex-col h-full gap-1">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="flex-1 min-h-0 w-full h-full"
        style={{ overflow: "visible" }}
      >
        {/* Liquid background */}
        <rect
          x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx="5"
          fill="hsl(var(--muted) / 0.18)"
        />

        {/* Particles — initial fill set here; RAF + color useEffect overrides imperatively */}
        {INITIAL.map((_, i) => (
          <circle
            key={i}
            ref={(el) => { circleRefs.current[i] = el; }}
            cx="0" cy="0"
            r={R}
            fill={PRIORITY[i] < nA ? reactantColor : productColor}
            opacity={0.88}
          />
        ))}

        {/* Beaker outline (drawn on top so it clips particles at edges) */}
        <rect
          x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx="5"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="3"
        />

        {/* Rim */}
        <rect
          x={BODY.x - 6} y={BODY.y - 16} width={BODY.w + 12} height="16" rx="3"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="2.5"
        />

        {/* Graduation marks */}
        {[0.25, 0.5, 0.75].map((f, gi) => (
          <line
            key={gi}
            x1={BODY.x + BODY.w - 14} y1={BODY.y + f * BODY.h}
            x2={BODY.x + BODY.w + 2}  y2={BODY.y + f * BODY.h}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex justify-center gap-4 shrink-0 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: reactantColor }} />
          {reactantLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: productColor }} />
          {productLabel}
        </span>
      </div>
    </div>
  );
}
