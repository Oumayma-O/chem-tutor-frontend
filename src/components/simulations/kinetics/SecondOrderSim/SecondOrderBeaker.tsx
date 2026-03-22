/**
 * Deterministic particulate beaker for Second-Order kinetics.
 *
 * Parent computes exact particle counts from fractionA via useSecondOrder.
 * This component is a dumb renderer — RAF loop handles only Brownian motion.
 * Type changes (A→P, B→P) are resolved each frame from countA/countB props.
 *
 * playing=true  → normal speed fizz
 * playing=false → slow-speed fizz (particles still move, just gently)
 */
import { useEffect, useRef, useLayoutEffect } from "react";
import type { ReactionType } from "./content";

// ── Physics constants ─────────────────────────────────────────────────
const RADIUS       = 5;

// ── Beaker geometry — matches shared ParticulateBeaker exactly ────────
const VW = 200;
const VH = 220;
const BK = { x: 18, y: 32, w: 164, h: 168 };
const PZ = {
  minX: BK.x + RADIUS + 3,
  maxX: BK.x + BK.w - RADIUS - 3,
  minY: BK.y + RADIUS + 4,
  maxY: BK.y + BK.h - RADIUS - 2,
};
const PLAY_SPEED   = 1.3;
const PAUSE_SPEED  = 0.28;
const FLASH_FRAMES = 18;

// ── Collision burst ring pool ─────────────────────────────────────────
const N_BURSTS     = 12;
const BURST_FRAMES = 22;   // frames the ring expands over
const BURST_R_MAX  = 20;   // max extra radius beyond RADIUS

// ── Particle pool sizes — must match resolveType logic ────────────────
export const BEAKER_TOTAL_AA = 36;   // particles for aa / aa-fast
export const BEAKER_AB_EACH  = 18;   // particles per species for ab

// ── Types ─────────────────────────────────────────────────────────────
type PType = "A" | "B" | "P";

interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;  // unit direction x
  dy: number;  // unit direction y
  sf: number;  // per-particle speed factor (0.6–1.4)
  type: PType;
  flash: number;
}

interface Burst {
  slot: number;   // which pre-rendered ring element to use
  x: number;
  y: number;
  frame: number;  // counts down from BURST_FRAMES to 0
  color: string;
}

// ── Seeded LCG — deterministic initial positions ──────────────────────
let _seed = 1;
function lcg() {
  _seed = (1664525 * _seed + 1013904223) & 0xffffffff;
  return (_seed >>> 0) / 0x100000000;
}

function createParticles(rt: ReactionType): Particle[] {
  _seed = 54321;
  const total = rt === "ab" ? BEAKER_AB_EACH * 2 : BEAKER_TOTAL_AA;
  const w = PZ.maxX - PZ.minX - RADIUS * 2;
  const h = PZ.maxY - PZ.minY - RADIUS * 2;
  return Array.from({ length: total }, (_, i) => {
    const angle = lcg() * Math.PI * 2;
    const initType: PType = rt === "ab" && i >= BEAKER_AB_EACH ? "B" : "A";
    return {
      id: i,
      x: PZ.minX + RADIUS + lcg() * w,
      y: PZ.minY + RADIUS + lcg() * h,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      sf: 0.6 + lcg() * 0.8,
      type: initType,
      flash: 0,
    };
  });
}

/**
 * Deterministic type resolver — maps particle id to PType based on counts.
 *
 * For "ab": ids 0…(AB_EACH-1) are the A species; ids AB_EACH…(2*AB_EACH-1) are B.
 *   id < AB_EACH:  id < cA ? "A" : "P"
 *   id >= AB_EACH: (id - AB_EACH) < cB ? "B" : "P"
 *
 * For "aa" / "aa-fast": all particles are A species.
 *   id < cA ? "A" : "P"
 */
function resolveType(id: number, cA: number, cB: number, rt: ReactionType): PType {
  if (rt === "ab") {
    if (id < BEAKER_AB_EACH) return id < cA ? "A" : "P";
    return (id - BEAKER_AB_EACH) < cB ? "B" : "P";
  }
  return id < cA ? "A" : "P";
}

// ─────────────────────────────────────────────────────────────────────

interface Props {
  reactionType: ReactionType;
  /** How many A particles to show — computed by parent from fractionA */
  countA: number;
  /** How many B particles to show — computed by parent; 0 for aa reactions */
  countB: number;
  /** Total product particles — computed by parent */
  countProduct: number;
  playing: boolean;
  reactantColor: string;
  productColor: string;
  bColor: string;
  reactantLabel: string;
  productLabel: string;
  bLabel: string;
}

export function SecondOrderBeaker({
  reactionType, countA, countB, countProduct, playing,
  reactantColor, productColor, bColor,
  reactantLabel, productLabel, bLabel,
}: Props) {
  const svgRef          = useRef<SVGSVGElement>(null);
  const particlesRef    = useRef<Particle[]>(createParticles(reactionType));
  const rafRef          = useRef<number>(0);
  const playingRef      = useRef(playing);
  const countARef       = useRef(countA);
  const countBRef       = useRef(countB);
  const reactionTypeRef = useRef(reactionType);
  const colorsRef       = useRef({ reactantColor, productColor, bColor });
  const burstsRef       = useRef<Burst[]>([]);
  const burstSlotRef    = useRef(0);

  useLayoutEffect(() => { playingRef.current = playing; }, [playing]);
  useLayoutEffect(() => { countARef.current = countA; }, [countA]);
  useLayoutEffect(() => { countBRef.current = countB; }, [countB]);
  useLayoutEffect(() => {
    colorsRef.current = { reactantColor, productColor, bColor };
  }, [reactantColor, productColor, bColor]);

  // Reset particles and clear burst rings when reaction type switches
  useEffect(() => {
    reactionTypeRef.current = reactionType;
    particlesRef.current = createParticles(reactionType);
    burstsRef.current = [];
  }, [reactionType]);

  // RAF loop — all mutable state in refs; bypasses React reconciler
  useEffect(() => {
    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      const svg = svgRef.current;
      if (!svg) return;

      const ps     = particlesRef.current;
      const speed  = playingRef.current ? PLAY_SPEED : PAUSE_SPEED;
      const cA     = countARef.current;
      const cB     = countBRef.current;
      const rt     = reactionTypeRef.current;
      const colors = colorsRef.current;

      // ── Move (Brownian) ─────────────────────────────────────────
      for (const p of ps) {
        p.x += p.dx * p.sf * speed;
        p.y += p.dy * p.sf * speed;
        if (p.x < PZ.minX + RADIUS) { p.x = PZ.minX + RADIUS; p.dx =  Math.abs(p.dx); }
        if (p.x > PZ.maxX - RADIUS) { p.x = PZ.maxX - RADIUS; p.dx = -Math.abs(p.dx); }
        if (p.y < PZ.minY + RADIUS) { p.y = PZ.minY + RADIUS; p.dy =  Math.abs(p.dy); }
        if (p.y > PZ.maxY - RADIUS) { p.y = PZ.maxY - RADIUS; p.dy = -Math.abs(p.dy); }
        if (p.flash > 0) p.flash--;

        // ── Resolve type from parent counts; collision effect on change ─
        const newType = resolveType(p.id, cA, cB, rt);
        if (newType !== p.type) {
          const oldType = p.type;
          p.type = newType;
          p.flash = FLASH_FRAMES;

          // Only show collision when playing and a forward reaction (A/B → P) occurs
          if (isPlay && newType === "P") {
            // Find nearest eligible collision partner
            let nearest: Particle | null = null;
            let minDist2 = Infinity;
            for (const q of ps) {
              if (q.id === p.id) continue;
              const eligible = rt === "ab"
                ? (oldType === "A" ? q.type === "B" : q.type === "A")
                : q.type === "A";
              if (!eligible) continue;
              const dx = q.x - p.x, dy = q.y - p.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < minDist2) { minDist2 = d2; nearest = q; }
            }

            // Teleport p to be touching the partner, then burst at midpoint
            let burstX = p.x, burstY = p.y;
            if (nearest) {
              const dx   = p.x - nearest.x;
              const dy   = p.y - nearest.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              // Place p at exactly 2.1 radii from the partner
              p.x = nearest.x + (dx / dist) * RADIUS * 2.1;
              p.y = nearest.y + (dy / dist) * RADIUS * 2.1;
              p.x = Math.max(PZ.minX + RADIUS, Math.min(PZ.maxX - RADIUS, p.x));
              p.y = Math.max(PZ.minY + RADIUS, Math.min(PZ.maxY - RADIUS, p.y));
              burstX = (p.x + nearest.x) / 2;
              burstY = (p.y + nearest.y) / 2;
            }

            const slot = burstSlotRef.current;
            burstSlotRef.current = (burstSlotRef.current + 1) % N_BURSTS;
            const burstColor = oldType === "A" ? colors.reactantColor : colors.bColor;
            burstsRef.current.push({ slot, x: burstX, y: burstY, frame: BURST_FRAMES, color: burstColor });
          }
        }
      }

      // ── Animate burst rings ─────────────────────────────────────
      burstsRef.current = burstsRef.current.filter(b => {
        b.frame--;
        const progress = b.frame / BURST_FRAMES;  // 1→0 as ring expands
        const ringEl = svg.getElementById(`burst-${b.slot}`) as SVGCircleElement | null;
        if (ringEl) {
          ringEl.setAttribute("cx",      b.x.toFixed(1));
          ringEl.setAttribute("cy",      b.y.toFixed(1));
          ringEl.setAttribute("r",       (RADIUS + (1 - progress) * BURST_R_MAX).toFixed(1));
          ringEl.setAttribute("opacity", (progress * 0.75).toFixed(2));
          ringEl.setAttribute("stroke",  b.color);
        }
        if (b.frame <= 0) {
          ringEl?.setAttribute("opacity", "0");
          return false;
        }
        return true;
      });

      // ── Update particle SVG elements ────────────────────────────
      for (const p of ps) {
        const el = svg.getElementById(`sp-${p.id}`) as SVGCircleElement | null;
        if (!el) continue;
        el.setAttribute("cx", p.x.toFixed(1));
        el.setAttribute("cy", p.y.toFixed(1));
        if (p.flash > 0) {
          // White flash during reaction transition
          el.setAttribute("fill",    "#ffffff");
          el.setAttribute("r",       (RADIUS * 1.7).toFixed(1));
          el.setAttribute("opacity", "0.95");
        } else {
          const fill = p.type === "A" ? colors.reactantColor
            : p.type === "B" ? colors.bColor
            : colors.productColor;
          el.setAttribute("fill",    fill);
          el.setAttribute("r",       String(RADIUS));
          el.setAttribute("opacity", "1");
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // intentionally empty — all state via refs

  const total   = reactionType === "ab" ? BEAKER_AB_EACH * 2 : BEAKER_TOTAL_AA;
  const isAB    = reactionType === "ab";
  const caption = isAB
    ? "only A+B collisions react"
    : reactionType === "aa-fast"
      ? "higher k · more reactions per collision"
      : "same-particle collisions";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-auto max-w-[300px] max-h-[260px] mx-auto md:max-w-none md:max-h-[290px] xl:max-h-none md:flex-1 md:min-h-0"
        style={{ overflow: "visible" }}
        aria-label="Second-order collision beaker"
      >
        {/* ── Beaker interior fill (behind particles) ────────────── */}
        <rect
          x={BK.x} y={BK.y} width={BK.w} height={BK.h} rx="5"
          fill="hsl(var(--card))" fillOpacity="0.1"
        />

        {/* ── Particles (pre-rendered; positions/colors updated via RAF) ── */}
        {Array.from({ length: total }, (_, i) => {
          const isB = reactionType === "ab" && i >= BEAKER_AB_EACH;
          return (
            <circle
              key={i}
              id={`sp-${i}`}
              cx={PZ.minX + RADIUS}
              cy={PZ.minY + RADIUS}
              r={RADIUS}
              fill={isB ? bColor : reactantColor}
              opacity={0.9}
            />
          );
        })}

        {/* ── Burst rings (above particles, clipped by beaker outline) ── */}
        {Array.from({ length: N_BURSTS }, (_, i) => (
          <circle
            key={`burst-${i}`}
            id={`burst-${i}`}
            cx="0" cy="0" r="0"
            fill="none" stroke="white" strokeWidth="2"
            opacity="0"
          />
        ))}

        {/* ── Beaker outline (drawn over particles) ──────────────── */}
        <rect
          x={BK.x} y={BK.y} width={BK.w} height={BK.h} rx="5"
          fill="none" stroke="hsl(var(--border))" strokeWidth="3"
        />

        {/* ── Rim cap ────────────────────────────────────────────── */}
        <rect
          x={BK.x - 6} y={BK.y - 16} width={BK.w + 12} height="16" rx="3"
          fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2.5"
        />

        {/* ── Graduation marks ───────────────────────────────────── */}
        {[0.25, 0.5, 0.75].map((f, gi) => (
          <line key={gi}
            x1={BK.x + BK.w - 14} y1={BK.y + f * BK.h}
            x2={BK.x + BK.w + 2}  y2={BK.y + f * BK.h}
            stroke="hsl(var(--muted-foreground))" strokeWidth="1.5"
          />
        ))}
      </svg>

      {/* ── Legend + counters ───────────────────────────────────── */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <div className="flex justify-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: reactantColor }} />
            {reactantLabel}
          </span>
          {isAB && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: bColor }} />
              {bLabel}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: productColor }} />
            {productLabel}
          </span>
        </div>
        <div className="flex justify-center items-center gap-3 text-[10px] font-mono text-muted-foreground flex-wrap">
          <span style={{ color: reactantColor }}>[{reactantLabel}]: <strong>{countA}</strong></span>
          {isAB && <span style={{ color: bColor }}>[{bLabel}]: <strong>{countB}</strong></span>}
          <span style={{ color: productColor }}>[{productLabel}]: <strong>{countProduct}</strong></span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 text-center leading-tight">{caption}</p>
      </div>
    </div>
  );
}
