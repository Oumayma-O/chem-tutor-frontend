/**
 * Particulate beaker for Second-Order kinetics.
 *
 * Collision model (playing=true):
 *   When the math dictates a reaction must occur, two eligible particles are
 *   selected and magnetized toward each other (velocity overridden each frame).
 *   The conversion only fires when they physically touch (dist ≤ REACT_DIST):
 *     - Both change to product color
 *     - Expanding burst ring fires at their midpoint
 *     - They bounce away with randomised post-reaction velocities
 *
 * Scrubbing (playing=false):
 *   All pending pairs are cancelled and resolveType is applied instantly.
 *   No burst animations — scrubbing must feel snappy.
 */
import { useEffect, useRef, useLayoutEffect } from "react";
import type { ReactionType } from "./content";

// ── Physics ───────────────────────────────────────────────────────────
const RADIUS       = 5;
const PLAY_SPEED   = 1.3;
const PAUSE_SPEED  = 0.28;
const ATTRACT_MULT = 2.8;         // speed boost while magnetized
const REACT_DIST   = RADIUS * 2.1; // touch threshold
const FLASH_FRAMES = 18;

// ── Burst ring pool ───────────────────────────────────────────────────
const N_BURSTS     = 12;
const BURST_FRAMES = 22;
const BURST_R_MAX  = 20;

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

// ── Pool sizes — exported so parent can compute countA/countB ─────────
export const BEAKER_TOTAL_AA = 52;
export const BEAKER_AB_EACH  = 26;

// ── Types ─────────────────────────────────────────────────────────────
type PType = "A" | "B" | "P" | "dead";

interface Particle {
  id: number;
  x: number;  y: number;
  dx: number; dy: number; // unit direction vector
  sf: number;             // per-particle speed factor (0.6–1.4)
  type: PType;
  flash: number;
}

interface PendingPair {
  idA: number; // first particle (type A for aa; type A or B for ab)
  idB: number; // partner    (type A for aa; opposite type for ab)
}

interface Burst {
  slot:  number;
  x:     number;
  y:     number;
  frame: number;
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
      x:  PZ.minX + RADIUS + lcg() * w,
      y:  PZ.minY + RADIUS + lcg() * h,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      sf: 0.6 + lcg() * 0.8,
      type: initType,
      flash: 0,
    };
  });
}

/**
 * Maps particle id → expected PType given current counts.
 *
 * 2 → 1 merge model:
 *   A+A→B : the first half of consumed A slots become P, the second half become dead
 *   A+B→C : consumed A slots become P, consumed B slots become dead
 */
function resolveType(id: number, cA: number, cB: number, rt: ReactionType): PType {
  if (rt === "ab") {
    if (id < BEAKER_AB_EACH) return id < cA ? "A" : "P";   // A → product
    return (id - BEAKER_AB_EACH) < cB ? "B" : "dead";       // B → dead
  }
  // aa / aa-fast: each reaction consumes 2 A → 1 product + 1 dead
  const consumed = BEAKER_TOTAL_AA - cA;
  const numP = Math.floor(consumed / 2);
  if (id < cA)       return "A";
  if (id < cA + numP) return "P";
  return "dead";
}

// ─────────────────────────────────────────────────────────────────────

interface Props {
  reactionType:  ReactionType;
  countA:        number; // computed by parent from fractionA
  countB:        number;
  countProduct:  number;
  playing:       boolean;
  reactantColor: string;
  productColor:  string;
  bColor:        string;
  reactantLabel: string;
  productLabel:  string;
  bLabel:        string;
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
  const pendingPairsRef = useRef<PendingPair[]>([]);
  const pendingSetRef   = useRef<Set<number>>(new Set());

  useLayoutEffect(() => { playingRef.current = playing; }, [playing]);
  useLayoutEffect(() => { countARef.current  = countA;  }, [countA]);
  useLayoutEffect(() => { countBRef.current  = countB;  }, [countB]);
  useLayoutEffect(() => {
    colorsRef.current = { reactantColor, productColor, bColor };
  }, [reactantColor, productColor, bColor]);

  // Full reset when reaction type changes
  useEffect(() => {
    reactionTypeRef.current = reactionType;
    particlesRef.current    = createParticles(reactionType);
    burstsRef.current       = [];
    pendingPairsRef.current = [];
    pendingSetRef.current   = new Set();
  }, [reactionType]);

  // ── RAF loop ──────────────────────────────────────────────────────
  useEffect(() => {
    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      const svg = svgRef.current;
      if (!svg) return;

      const ps      = particlesRef.current;
      const isPlay  = playingRef.current;
      const cA      = countARef.current;
      const cB      = countBRef.current;
      const rt      = reactionTypeRef.current;
      const colors  = colorsRef.current;
      const pending = pendingPairsRef.current;
      const pendSet = pendingSetRef.current;

      // ── 1. Check pending pairs for physical collision ─────────────
      // Runs every frame regardless of playing/scrubbing state.
      // Magnetized particles always animate at full ATTRACT speed.
      const reacted = new Set<number>();

      for (const pair of pending) {
        const pA = ps[pair.idA], pB = ps[pair.idB];
        const dx = pB.x - pA.x, dy = pB.y - pA.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= REACT_DIST) {
          // ── COLLISION FIRES ─────────────────────────────────────
          const burstColor = pA.type === "A" ? colors.reactantColor : colors.bColor;
          const burstX = (pA.x + pB.x) / 2, burstY = (pA.y + pB.y) / 2;
          pA.type = "P"; pA.flash = FLASH_FRAMES; // survives as product
          pB.type = "dead"; pB.flash = 0;         // consumed — disappears
          reacted.add(pair.idA); reacted.add(pair.idB);
          pendSet.delete(pair.idA); pendSet.delete(pair.idB);
          const slot = burstSlotRef.current;
          burstSlotRef.current = (burstSlotRef.current + 1) % N_BURSTS;
          burstsRef.current.push({ slot, x: burstX, y: burstY, frame: BURST_FRAMES, color: burstColor });
          const nx = dx / (dist || 1), ny = dy / (dist || 1);
          const a1 = Math.atan2(ny,  nx)  + (Math.random() - 0.5) * 1.2;
          const a2 = Math.atan2(-ny, -nx) + (Math.random() - 0.5) * 1.2;
          pA.dx = Math.cos(a1); pA.dy = Math.sin(a1);
          pB.dx = Math.cos(a2); pB.dy = Math.sin(a2);
        } else {
          // ── Magnetize toward partner ─────────────────────────────
          const inv = 1 / (dist || 1);
          pA.dx =  dx * inv; pA.dy =  dy * inv;
          pB.dx = -dx * inv; pB.dy = -dy * inv;
        }
      }
      pendingPairsRef.current = pending.filter(pair => !reacted.has(pair.idA));

      // ── 2. Sync target vs actual; form new pairs or revert ────────
      const currentP    = ps.filter(p => p.type === "P").length;
      const targetP     = rt === "ab"
        ? (BEAKER_AB_EACH - cA) + (BEAKER_AB_EACH - cB)
        : BEAKER_TOTAL_AA - cA;
      const inProgressP = pendingPairsRef.current.length * 2;

      if (currentP > targetP) {
        // Backward scrub — instantly revert excess P → A/B
        for (const pair of pendingPairsRef.current) {
          pendSet.delete(pair.idA); pendSet.delete(pair.idB);
        }
        pendingPairsRef.current = [];
        pendSet.clear();
        for (const p of ps) { p.type = resolveType(p.id, cA, cB, rt); p.flash = 0; }
      } else {
        const newPairsNeeded = Math.max(0, Math.floor((targetP - currentP - inProgressP) / 2));
        for (let n = 0; n < newPairsNeeded; n++) {
          if (rt === "ab") {
            const freeA = ps.filter(p => p.type === "A" && !pendSet.has(p.id));
            const freeB = ps.filter(p => p.type === "B" && !pendSet.has(p.id));
            if (!freeA.length || !freeB.length) break;
            const pA = freeA[Math.floor(Math.random() * freeA.length)];
            let partner = freeB[0]; let minD2 = Infinity;
            for (const q of freeB) {
              const d2 = (q.x - pA.x) ** 2 + (q.y - pA.y) ** 2;
              if (d2 < minD2) { minD2 = d2; partner = q; }
            }
            pendingPairsRef.current.push({ idA: pA.id, idB: partner.id });
            pendSet.add(pA.id); pendSet.add(partner.id);
          } else {
            const freeA = ps.filter(p => p.type === "A" && !pendSet.has(p.id));
            if (freeA.length < 2) break;
            const pA = freeA[Math.floor(Math.random() * freeA.length)];
            let partner: Particle | null = null; let minD2 = Infinity;
            for (const q of freeA) {
              if (q.id === pA.id) continue;
              const d2 = (q.x - pA.x) ** 2 + (q.y - pA.y) ** 2;
              if (d2 < minD2) { minD2 = d2; partner = q; }
            }
            if (!partner) break;
            pendingPairsRef.current.push({ idA: pA.id, idB: partner.id });
            pendSet.add(pA.id); pendSet.add(partner.id);
          }
        }
      }

      // ── 3. Move all particles ─────────────────────────────────────
      // Magnetized pairs always use ATTRACT speed so collisions are
      // snappy even while scrubbing. Normal particles respect play/pause.
      const baseSpeed = isPlay ? PLAY_SPEED : PAUSE_SPEED;
      for (const p of ps) {
        if (p.type === "dead") continue; // consumed particles don't move
        const step = pendSet.has(p.id) ? PLAY_SPEED * ATTRACT_MULT : baseSpeed * p.sf;
        p.x += p.dx * step;
        p.y += p.dy * step;
        if (p.x < PZ.minX + RADIUS) { p.x = PZ.minX + RADIUS; p.dx =  Math.abs(p.dx); }
        if (p.x > PZ.maxX - RADIUS) { p.x = PZ.maxX - RADIUS; p.dx = -Math.abs(p.dx); }
        if (p.y < PZ.minY + RADIUS) { p.y = PZ.minY + RADIUS; p.dy =  Math.abs(p.dy); }
        if (p.y > PZ.maxY - RADIUS) { p.y = PZ.maxY - RADIUS; p.dy = -Math.abs(p.dy); }
        if (p.flash > 0) p.flash--;
      }

      // ── Animate burst rings ───────────────────────────────────────
      burstsRef.current = burstsRef.current.filter(b => {
        b.frame--;
        const progress = b.frame / BURST_FRAMES; // 1→0
        const el = svg.getElementById(`burst-${b.slot}`) as SVGCircleElement | null;
        if (el) {
          el.setAttribute("cx",      b.x.toFixed(1));
          el.setAttribute("cy",      b.y.toFixed(1));
          el.setAttribute("r",       (RADIUS + (1 - progress) * BURST_R_MAX).toFixed(1));
          el.setAttribute("opacity", (progress * 0.75).toFixed(2));
          el.setAttribute("stroke",  b.color);
        }
        if (b.frame <= 0) { el?.setAttribute("opacity", "0"); return false; }
        return true;
      });

      // ── Update particle SVG elements ──────────────────────────────
      for (const p of ps) {
        const el = svg.getElementById(`sp-${p.id}`) as SVGCircleElement | null;
        if (!el) continue;
        if (p.type === "dead") {
          el.setAttribute("r",       "0");
          el.setAttribute("opacity", "0");
        } else {
          el.setAttribute("cx", p.x.toFixed(1));
          el.setAttribute("cy", p.y.toFixed(1));
          if (p.flash > 0) {
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
        {/* Beaker interior fill (behind particles) */}
        <rect x={BK.x} y={BK.y} width={BK.w} height={BK.h} rx="5"
          fill="hsl(var(--card))" fillOpacity="0.1" />

        {/* Particles — positions / colors updated imperatively by RAF */}
        {Array.from({ length: total }, (_, i) => {
          const isB = reactionType === "ab" && i >= BEAKER_AB_EACH;
          return (
            <circle key={i} id={`sp-${i}`}
              cx={PZ.minX + RADIUS} cy={PZ.minY + RADIUS}
              r={RADIUS} fill={isB ? bColor : reactantColor} opacity={0.9}
            />
          );
        })}

        {/* Burst ring pool — animated imperatively */}
        {Array.from({ length: N_BURSTS }, (_, i) => (
          <circle key={`burst-${i}`} id={`burst-${i}`}
            cx="0" cy="0" r="0"
            fill="none" stroke="white" strokeWidth="2" opacity="0"
          />
        ))}

        {/* Beaker outline drawn over particles so walls look solid */}
        <rect x={BK.x} y={BK.y} width={BK.w} height={BK.h} rx="5"
          fill="none" stroke="hsl(var(--border))" strokeWidth="3" />

        {/* Rim cap */}
        <rect x={BK.x - 6} y={BK.y - 16} width={BK.w + 12} height="16" rx="3"
          fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2.5" />

        {/* Graduation marks */}
        {[0.25, 0.5, 0.75].map((f, gi) => (
          <line key={gi}
            x1={BK.x + BK.w - 14} y1={BK.y + f * BK.h}
            x2={BK.x + BK.w + 2}  y2={BK.y + f * BK.h}
            stroke="hsl(var(--muted-foreground))" strokeWidth="1.5"
          />
        ))}
      </svg>

      {/* Legend + live particle counters */}
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
