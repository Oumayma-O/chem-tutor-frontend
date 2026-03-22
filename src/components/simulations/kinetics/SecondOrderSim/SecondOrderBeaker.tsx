/**
 * Collision-based particulate beaker for Second-Order kinetics.
 *
 * Two modes:
 *   playing=true  → RAF collision physics; particles react only on physical contact
 *   playing=false → Brownian motion only; particle counts snap to fractionA
 *
 * Reaction types:
 *   "aa"      → A + A → B  (only A+A collisions react)
 *   "ab"      → A + B → C  (only A+B collisions react; A+A and B+B are inert)
 *   "aa-fast" → A + A → B  (higher reaction probability per collision)
 */
import { useEffect, useRef, useLayoutEffect } from "react";
import type { ReactionType } from "./content";

// ── Beaker geometry (SVG coordinate space) ────────────────────────────
const VW = 300;
const VH = 290;
const BK = { x: 28, y: 18, w: 244, h: 220 }; // beaker inner rect
const PZ = {                                    // particle zone
  minX: BK.x + 5,
  maxX: BK.x + BK.w - 5,
  minY: BK.y + 5,
  maxY: BK.y + BK.h - 5,
};

// ── Physics constants ─────────────────────────────────────────────────
const RADIUS          = 7;
const BASE_SPEED      = 1.3;
const REACT_PROB_NORM = 0.06;   // probability per frame per overlapping eligible pair
const REACT_PROB_FAST = 0.16;
const FLASH_FRAMES    = 14;
const TOTAL_AA        = 36;     // particles for A+A reactions
const AB_EACH         = 18;     // particles per species for A+B (18A + 18B = 36)

// ── Types ─────────────────────────────────────────────────────────────
type PType = "A" | "B" | "P";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: PType;
  originalType: "A" | "B";   // never changes — used for scrubber restoration
  flash: number;
}

// ── Seeded LCG (deterministic initial positions) ──────────────────────
let _seed = 1;
function lcg() {
  _seed = (1664525 * _seed + 1013904223) & 0xffffffff;
  return ((_seed >>> 0) / 0x100000000);
}

function createParticles(rt: ReactionType): Particle[] {
  _seed = 54321;
  const total = rt === "ab" ? AB_EACH * 2 : TOTAL_AA;
  const w = PZ.maxX - PZ.minX - RADIUS * 2;
  const h = PZ.maxY - PZ.minY - RADIUS * 2;
  return Array.from({ length: total }, (_, i) => {
    const angle = lcg() * Math.PI * 2;
    const speed = BASE_SPEED * (0.6 + lcg() * 0.8);
    const origType: "A" | "B" = rt === "ab" && i >= AB_EACH ? "B" : "A";
    return {
      id: i,
      x: PZ.minX + RADIUS + lcg() * w,
      y: PZ.minY + RADIUS + lcg() * h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      type: origType,
      originalType: origType,
      flash: 0,
    };
  });
}

// ── Component ─────────────────────────────────────────────────────────
interface Props {
  reactionType: ReactionType;
  playing: boolean;
  fractionA: number;
  reactantColor: string;
  productColor: string;
  bColor: string;
  reactantLabel: string;
  productLabel: string;
  bLabel: string;
}

export function SecondOrderBeaker({
  reactionType, playing, fractionA,
  reactantColor, productColor, bColor,
  reactantLabel, productLabel, bLabel,
}: Props) {
  const svgRef           = useRef<SVGSVGElement>(null);
  const particlesRef     = useRef<Particle[]>(createParticles(reactionType));
  const rafRef           = useRef<number>(0);
  const playingRef       = useRef(playing);
  const fractionARef     = useRef(fractionA);
  const reactionTypeRef  = useRef(reactionType);
  const colorsRef        = useRef({ reactantColor, productColor, bColor });

  // Keep refs current each render
  useLayoutEffect(() => { playingRef.current = playing; }, [playing]);
  useLayoutEffect(() => { fractionARef.current = fractionA; }, [fractionA]);
  useLayoutEffect(() => {
    colorsRef.current = { reactantColor, productColor, bColor };
  }, [reactantColor, productColor, bColor]);

  // Reset particles when reaction type changes
  useEffect(() => {
    reactionTypeRef.current = reactionType;
    particlesRef.current = createParticles(reactionType);
  }, [reactionType]);

  // RAF loop — runs once, uses refs throughout
  useEffect(() => {
    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      const svg = svgRef.current;
      if (!svg) return;

      const ps       = particlesRef.current;
      const rt       = reactionTypeRef.current;
      const isPlay   = playingRef.current;
      const prob     = rt === "aa-fast" ? REACT_PROB_FAST : REACT_PROB_NORM;
      const colors   = colorsRef.current;

      // ── Move (Brownian) ────────────────────────────────────────────
      for (const p of ps) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < PZ.minX + RADIUS) { p.x = PZ.minX + RADIUS; p.vx =  Math.abs(p.vx); }
        if (p.x > PZ.maxX - RADIUS) { p.x = PZ.maxX - RADIUS; p.vx = -Math.abs(p.vx); }
        if (p.y < PZ.minY + RADIUS) { p.y = PZ.minY + RADIUS; p.vy =  Math.abs(p.vy); }
        if (p.y > PZ.maxY - RADIUS) { p.y = PZ.maxY - RADIUS; p.vy = -Math.abs(p.vy); }
        if (p.flash > 0) p.flash--;
      }

      if (isPlay) {
        // ── Collision-based reactions ──────────────────────────────
        const r2 = (RADIUS * 2.2) * (RADIUS * 2.2);
        for (let i = 0; i < ps.length; i++) {
          if (ps[i].type === "P") continue;
          for (let j = i + 1; j < ps.length; j++) {
            if (ps[j].type === "P") continue;
            const eligible = rt === "ab"
              ? ps[i].type !== ps[j].type          // A+B only
              : ps[i].type === "A" && ps[j].type === "A"; // A+A only
            if (!eligible) continue;
            const dx = ps[i].x - ps[j].x;
            const dy = ps[i].y - ps[j].y;
            if (dx * dx + dy * dy < r2 && Math.random() < prob) {
              ps[i].type = "P"; ps[i].flash = FLASH_FRAMES;
              ps[j].type = "P"; ps[j].flash = FLASH_FRAMES;
              // Separate to avoid instant re-collision
              ps[i].vx *= -1; ps[i].vy *= -1;
              ps[j].vx *= -1; ps[j].vy *= -1;
            }
          }
        }
      } else {
        // ── Snap to fractionA when paused / scrubbing ──────────────
        const fa       = fractionARef.current;
        const totalA0  = rt === "ab" ? AB_EACH : TOTAL_AA;
        const totalB0  = rt === "ab" ? AB_EACH : 0;
        const targetA  = Math.round(fa * totalA0);
        const targetB  = Math.round(fa * totalB0);
        let diffA = ps.filter(p => p.type === "A").length - targetA;
        for (const p of ps) {
          if (diffA === 0) break;
          if (diffA > 0 && p.type === "A")                          { p.type = "P"; diffA--; }
          else if (diffA < 0 && p.type === "P" && p.originalType === "A") { p.type = "A"; diffA++; }
        }
        let diffB = ps.filter(p => p.type === "B").length - targetB;
        for (const p of ps) {
          if (diffB === 0) break;
          if (diffB > 0 && p.type === "B")                          { p.type = "P"; diffB--; }
          else if (diffB < 0 && p.type === "P" && p.originalType === "B") { p.type = "B"; diffB++; }
        }
      }

      // ── Update SVG elements (imperative, bypasses React reconciler) ─
      for (const p of ps) {
        const el = svg.getElementById(`sp-${p.id}`) as SVGCircleElement | null;
        if (!el) continue;
        el.setAttribute("cx", p.x.toFixed(1));
        el.setAttribute("cy", p.y.toFixed(1));
        const fill = p.type === "A" ? colors.reactantColor
          : p.type === "B" ? colors.bColor
          : colors.productColor;
        el.setAttribute("fill", fill);
        if (p.flash > 0) {
          el.setAttribute("r",       (RADIUS * 1.55).toFixed(1));
          el.setAttribute("opacity", "0.55");
        } else {
          el.setAttribute("r",       String(RADIUS));
          el.setAttribute("opacity", "1");
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // intentionally empty — all state via refs

  const total    = reactionType === "ab" ? AB_EACH * 2 : TOTAL_AA;
  const isAB     = reactionType === "ab";
  const caption  = isAB
    ? "only A+B collisions react"
    : reactionType === "aa-fast"
      ? "higher k · more reactions per collision"
      : "same-particle collisions";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ width: "100%", flex: 1, minHeight: 0 }}
        aria-label="Second-order collision beaker"
      >
        {/* ── Beaker body ────────────────────────────────────────── */}
        <rect
          x={BK.x} y={BK.y} width={BK.w} height={BK.h}
          rx="6" ry="6"
          fill="hsl(var(--muted)/0.15)"
          stroke="hsl(var(--border))"
          strokeWidth="2"
        />
        {/* Scale ticks */}
        {[0.25, 0.5, 0.75].map((f) => {
          const yy = BK.y + BK.h * (1 - f);
          return (
            <line key={f}
              x1={BK.x + BK.w - 10} y1={yy}
              x2={BK.x + BK.w}      y2={yy}
              stroke="hsl(var(--border))" strokeWidth="1"
            />
          );
        })}

        {/* ── Particles (pre-rendered circles, positions updated via RAF) ── */}
        {Array.from({ length: total }, (_, i) => {
          const isB = reactionType === "ab" && i >= AB_EACH;
          return (
            <circle
              key={i}
              id={`sp-${i}`}
              cx={PZ.minX + RADIUS}
              cy={PZ.minY + RADIUS}
              r={RADIUS}
              fill={isB ? bColor : reactantColor}
            />
          );
        })}

        {/* ── Legend ─────────────────────────────────────────────── */}
        <g transform={`translate(${BK.x + 6}, ${BK.y + BK.h + 16})`}>
          <circle cx={6}  cy={0} r={5} fill={reactantColor} />
          <text   x={14} y={4}  fontSize="10" fill="hsl(var(--muted-foreground))">{reactantLabel}</text>
          {isAB ? (
            <>
              <circle cx={34} cy={0} r={5} fill={bColor} />
              <text   x={42} y={4}  fontSize="10" fill="hsl(var(--muted-foreground))">{bLabel}</text>
              <circle cx={62} cy={0} r={5} fill={productColor} />
              <text   x={70} y={4}  fontSize="10" fill="hsl(var(--muted-foreground))">{productLabel}</text>
            </>
          ) : (
            <>
              <circle cx={34} cy={0} r={5} fill={productColor} />
              <text   x={42} y={4}  fontSize="10" fill="hsl(var(--muted-foreground))">{productLabel}</text>
            </>
          )}
        </g>

        {/* ── Caption ────────────────────────────────────────────── */}
        <text
          x={VW / 2} y={BK.y + BK.h + 42}
          textAnchor="middle" fontSize="9"
          fill="hsl(var(--muted-foreground))"
        >
          {caption}
        </text>
      </svg>
    </div>
  );
}
