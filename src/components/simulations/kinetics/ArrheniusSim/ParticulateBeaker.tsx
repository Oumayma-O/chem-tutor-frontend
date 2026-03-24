/**
 * ArrheniusSim/ParticulateBeaker.tsx
 *
 * Layout (top → bottom in the flex column):
 *   1. Catalyst vials  — hovering above the beaker mouth, pour on click
 *   2. SVG             — beaker + compact tripod stand + Bunsen burner
 *   3. Particle legend
 *   4. Temperature slider — directly below the burner, feels physically connected
 *
 * Physics:
 *   - Brownian speed = BASE × √(T / 298)   (Kinetic Molecular Theory)
 *   - Each frame: A–A pairs within REACT_DIST roll dice with
 *       p(T, Ea) = f(Boltzmann factor, normalised to [0.001, 0.035])
 *     Higher T or lower Ea_eff → more reactions per second
 *   - Catalyst particles (hexagons = Vial A, stars = Vial B) float freely;
 *     only one active at a time — switching clears old particles
 *   - `resetKey` prop increments on parent Reset → all particles back to A
 */
import { useEffect, useRef, useLayoutEffect, useState } from "react";
import { CATALYSTS, UNIVERSAL_R } from "./content";
import { TUTORIAL_RING_BEAKER } from "./arrheniusTutorialUi";
import { cn } from "@/lib/utils";
import {
  advanceCollisionBurstRings,
  COLLISION_BURST_DEFAULTS,
  type SvgCollisionBurst,
} from "@/components/simulations/shared/collisionBurstSvg";

// ── SVG geometry ──────────────────────────────────────────────────────────────
const VW = 240;
const VH = 295;

// Beaker body
const BK   = { x: 28, y: 12, w: 184, h: 118 };  // body bottom at y = 130
const RIM  = { x: 22, y:  0, w: 196, h:  14 };   // rim cap
const PZ   = { minX: 34, maxX: 206, minY: 16, maxY: 125 }; // particle zone

// Ring stand (side view): support ring + wire gauze + three legs to the bench
const GAUZE_CY = 131;
const RING_RX = 84;
const RING_RY = 5;
const FOOT_Y = 244;
/** Left / right legs attach near ring rim; back leg is shorter (depth cue). */
const LEG_L_TOP = { x: 120 - RING_RX * 0.88, y: GAUZE_CY - 1 };
const LEG_R_TOP = { x: 120 + RING_RX * 0.88, y: GAUZE_CY - 1 };
const LEG_L_FOOT = { x: 16, y: FOOT_Y };
const LEG_R_FOOT = { x: 224, y: FOOT_Y };
const LEG_BACK_TOP = { x: 120, y: GAUZE_CY + RING_RY };
const LEG_BACK_FOOT = { x: 120, y: FOOT_Y - 9 };

// Bunsen burner — shorter barrel (centered at x = 120)
const BURNER_CX       = VW / 2;
const BURNER_TUBE_TOP = 190;
const BURNER_TUBE_BOT = 248;

// Flame (anchored at burner tube top, grows upward)
const FLAME_BASE_Y = BURNER_TUBE_TOP;
const FLAME_MIN_H  = 7;
const FLAME_MAX_H  = 38; // tip near beaker bottom — flame reads under glass

// ── Particle constants ────────────────────────────────────────────────────────
const N_REACTANT  = 28;
const N_CATALYST  = 8;
const RADIUS      = 5;
const BASE_SPEED  = 1.1;         // px / frame at 298 K
const REACT_DIST  = RADIUS * 2.1;
const FLASH_FRAMES = 18;
const FAIL_FLASH_FRAMES = 14;
const N_BURSTS     = COLLISION_BURST_DEFAULTS.nBursts;
const BURST_FRAMES = COLLISION_BURST_DEFAULTS.burstFrames;
const BURST_R_MAX  = COLLISION_BURST_DEFAULTS.burstRMax;
const REACTANT_BURST_COLOR = "#f59e0b";
const R_GAS = 8.314;

// Boltzmann-based reaction probability [0.001, 0.035] per collision per frame
function reactionProb(T: number, effectiveEa: number): number {
  const logB = -Math.max(effectiveEa, 5000) / (R_GAS * Math.max(T, 200));
  // Range: T=298 Ea=103000 → -41.6;  T=700 Ea=56650 → -9.7
  const norm = Math.max(0, Math.min(1, (logB + 43) / 34));
  return 0.001 + norm * 0.034;
}

/**
 * Collision energy ∝ |v_rel|²; compare to a barrier scaled by Eₐ/(RT).
 * Returns true when the pair is “energetic enough” to attempt a reaction.
 */
function collisionEligibleForReaction(
  vRel: number,
  speed: number,
  T: number,
  effectiveEaJ: number,
): boolean {
  const RT = UNIVERSAL_R * Math.max(T, 200);
  const boltz = Math.exp(-effectiveEaJ / RT);
  const normE = Math.min(1, (vRel / (speed * 2.6 + 1e-6)) ** 2);
  const need =
    0.1 + 0.72 * (1 - Math.min(boltz * 85, 0.94));
  return normE >= need;
}

/** Scale collision success by Arrhenius k relative to k at 298 K (uncatalysed baseline for this reaction). */
function kBoostFromArrhenius(k: number, kRefBaseline: number): number {
  const ratio = k / Math.max(kRefBaseline, 1e-300);
  return Math.min(8, Math.max(0.35, ratio));
}

type PType = "A" | "P" | "C";

interface Particle {
  id: number;
  x: number; y: number;
  dx: number; dy: number;
  sf: number;
  type: PType;
  flash: number;
  /** Short gray flash when collision had insufficient energy (no reaction). */
  failFlash: number;
}
type Burst = SvgCollisionBurst;

// ── Seeded LCG for deterministic initial layout ───────────────────────────────
let _seed = 0xfe4a12;
function lcg() {
  _seed = (1664525 * _seed + 1013904223) & 0xffffffff;
  return (_seed >>> 0) / 0x100000000;
}

function makeReactants(): Particle[] {
  _seed = 0xfe4a12;
  return Array.from({ length: N_REACTANT }, (_, i) => {
    const angle = lcg() * Math.PI * 2;
    return {
      id:    i,
      x:     PZ.minX + RADIUS + lcg() * (PZ.maxX - PZ.minX - RADIUS * 2),
      y:     PZ.minY + RADIUS + lcg() * (PZ.maxY - PZ.minY - RADIUS * 2),
      dx:    Math.cos(angle),
      dy:    Math.sin(angle),
      sf:    0.65 + lcg() * 0.70,
      type:  "A",
      flash: 0,
      failFlash: 0,
    };
  });
}

function makeCatalysts(): Particle[] {
  return Array.from({ length: N_CATALYST }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    return {
      id:    N_REACTANT + i,
      x:     PZ.minX + RADIUS + Math.random() * (PZ.maxX - PZ.minX - RADIUS * 2),
      y:     PZ.minY + RADIUS + Math.random() * (PZ.maxY - PZ.minY - RADIUS * 2),
      dx:    Math.cos(angle),
      dy:    Math.sin(angle),
      sf:    0.45 + Math.random() * 0.35,
      type:  "C",
      flash: 0,
      failFlash: 0,
    };
  });
}

// SVG shape generators centred at (0,0) ───────────────────────────────────────
function hexPath(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return (i === 0 ? "M" : "L") +
      `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }).join("") + "Z";
}

function starPath(r: number, inner = r * 0.42): string {
  return Array.from({ length: 12 }, (_, i) => {
    const a   = (Math.PI * i) / 6 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    return (i === 0 ? "M" : "L") +
      `${(Math.cos(a) * rad).toFixed(1)},${(Math.sin(a) * rad).toFixed(1)}`;
  }).join("") + "Z";
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  playing:             boolean;
  temperature:         number;
  onTemperatureChange: (t: number) => void;
  effectiveEa:         number;    // J/mol — already reduced by catalyst in parent
  /** Current Arrhenius rate constant (same T, Ea_eff as the math panel). */
  k: number;
  /** k for this reaction at 298 K with full Ea (uncatalysed) — normalizes k boost. */
  kRefBaseline: number;
  catalystId:          string;
  onCatalystChange:    (id: string) => void;
  isCatalystEnabled:   boolean;
  resetKey:            number;    // increment to reset all particles to A
  /** Tutorial: pulsing ring on beaker SVG area. */
  ringBeaker?: boolean;
  ringCatalystRow?: boolean;
  ringTempSlider?: boolean;
  tutorialRingClass?: string;
  temperatureLocked?: boolean;
  collisionProbabilityScale?: number;
  particleSpeedScale?: number;
  /** Added to flame norm T (0–1) for brighter / taller flame in late tutorial steps. */
  flameTutorialBoost?: number;
  /** Fraction of beaker reactants converted to product (0–1), for syncing the energy profile. */
  onReactionProgress?: (fraction: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ArrheniusParticulateBeaker({
  playing,
  temperature,
  onTemperatureChange,
  effectiveEa,
  k,
  kRefBaseline,
  catalystId,
  onCatalystChange,
  isCatalystEnabled,
  resetKey,
  ringBeaker = false,
  ringCatalystRow = false,
  ringTempSlider = false,
  tutorialRingClass = "",
  temperatureLocked = false,
  collisionProbabilityScale = 1,
  particleSpeedScale = 1,
  flameTutorialBoost = 0,
  onReactionProgress,
}: Props) {
  const svgRef        = useRef<SVGSVGElement>(null);
  const onProgressRef = useRef(onReactionProgress);
  const lastReportedFractionRef = useRef(-1);
  useLayoutEffect(() => {
    onProgressRef.current = onReactionProgress;
  }, [onReactionProgress]);
  // particles[0..N_REACTANT-1] = reactant/product (stable indices)
  // particles[N_REACTANT..]    = catalyst (replaced on change)
  const particlesRef  = useRef<Particle[]>(makeReactants());
  const rafRef        = useRef<number>(0);
  const playingRef    = useRef(playing);
  const tempRef       = useRef(temperature);
  const eaRef         = useRef(effectiveEa);
  const kRef          = useRef(k);
  const kBaselineRef  = useRef(kRefBaseline);
  const burstsRef     = useRef<Burst[]>([]);
  const burstSlotRef  = useRef(0);
  const collisionScaleRef = useRef(collisionProbabilityScale);
  const speedScaleRef     = useRef(particleSpeedScale);
  const lastProductCountRef = useRef(0);
  const frameTickRef = useRef(0);
  const [productFraction, setProductFraction] = useState(0);

  useLayoutEffect(() => { playingRef.current = playing;      }, [playing]);
  useLayoutEffect(() => { tempRef.current    = temperature;  }, [temperature]);
  useLayoutEffect(() => { eaRef.current      = effectiveEa;  }, [effectiveEa]);
  useLayoutEffect(() => { kRef.current       = k;            }, [k]);
  useLayoutEffect(() => { kBaselineRef.current = kRefBaseline; }, [kRefBaseline]);
  useLayoutEffect(() => { collisionScaleRef.current = collisionProbabilityScale; }, [collisionProbabilityScale]);
  useLayoutEffect(() => { speedScaleRef.current = particleSpeedScale; }, [particleSpeedScale]);

  // ── Reset all particles to A ───────────────────────────────────────────────
  useEffect(() => {
    particlesRef.current = makeReactants();
    burstsRef.current = [];
    lastProductCountRef.current = 0;
    lastReportedFractionRef.current = -1;
    setProductFraction(0);
    onProgressRef.current?.(0);
    // re-add catalyst particles if one is active
    if (catalystId !== "none") {
      particlesRef.current = [...particlesRef.current, ...makeCatalysts()];
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // ── Catalyst swap ──────────────────────────────────────────────────────────
  useEffect(() => {
    const base = particlesRef.current.slice(0, N_REACTANT);
    particlesRef.current = catalystId !== "none"
      ? [...base, ...makeCatalysts()]
      : base;
  }, [catalystId]);

  // ── RAF animation loop ─────────────────────────────────────────────────────
  useEffect(() => {
    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      const svg = svgRef.current;
      if (!svg) return;

      const T      = tempRef.current;
      const Ea     = eaRef.current;
      const isPlay = playingRef.current;
      const speed  = BASE_SPEED * Math.sqrt(T / 298) * speedScaleRef.current;
      const ps     = particlesRef.current;
      const boost  = kBoostFromArrhenius(kRef.current, kBaselineRef.current);
      const pReact = Math.min(
        0.22,
        reactionProb(T, Ea) * boost * collisionScaleRef.current,
      );

      // ── 1. Move all particles ────────────────────────────────────────
      for (const p of ps) {
        const step = isPlay ? speed * p.sf : speed * 0.12 * p.sf;
        p.x += p.dx * step;
        p.y += p.dy * step;
        if (p.x < PZ.minX + RADIUS) { p.x = PZ.minX + RADIUS; p.dx =  Math.abs(p.dx); }
        if (p.x > PZ.maxX - RADIUS) { p.x = PZ.maxX - RADIUS; p.dx = -Math.abs(p.dx); }
        if (p.y < PZ.minY + RADIUS) { p.y = PZ.minY + RADIUS; p.dy =  Math.abs(p.dy); }
        if (p.y > PZ.maxY - RADIUS) { p.y = PZ.maxY - RADIUS; p.dy = -Math.abs(p.dy); }
        if (p.flash > 0) p.flash--;
        if (p.failFlash > 0) p.failFlash--;
      }

      // ── 2. Collision detection among A particles ─────────────────────
      // O(N²) over small N (≤28 reactants) — fast
      const reactants = ps.filter(p => p.type === "A" && p.flash === 0);
      const reacted   = new Set<number>();

      frameTickRef.current++;
      const nP = ps.filter((p) => p.type === "P").length;
      const frac = nP / N_REACTANT;
      if (frac !== lastReportedFractionRef.current) {
        lastReportedFractionRef.current = frac;
        onProgressRef.current?.(frac);
      }
      if (frameTickRef.current % 12 === 0) {
        if (nP !== lastProductCountRef.current) {
          lastProductCountRef.current = nP;
          setProductFraction(frac);
        }
      }

      for (let i = 0; i < reactants.length - 1; i++) {
        if (reacted.has(reactants[i].id)) continue;
        for (let j = i + 1; j < reactants.length; j++) {
          if (reacted.has(reactants[j].id)) continue;
          const pA = reactants[i], pB = reactants[j];
          const dx = pB.x - pA.x, dy = pB.y - pA.y;
          if (dx * dx + dy * dy < REACT_DIST * REACT_DIST) {
            const vax = pA.dx * speed * pA.sf;
            const vay = pA.dy * speed * pA.sf;
            const vbx = pB.dx * speed * pB.sf;
            const vby = pB.dy * speed * pB.sf;
            const vRel = Math.hypot(vax - vbx, vay - vby);
            const eligible = collisionEligibleForReaction(vRel, speed, T, Ea);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = dx / dist;
            const ny = dy / dist;

            if (!eligible) {
              pA.failFlash = FAIL_FLASH_FRAMES;
              pB.failFlash = FAIL_FLASH_FRAMES;
              pA.dx = -nx + (Math.random() - 0.5) * 0.5;
              pA.dy = -ny + (Math.random() - 0.5) * 0.5;
              pB.dx = nx + (Math.random() - 0.5) * 0.5;
              pB.dy = ny + (Math.random() - 0.5) * 0.5;
              continue;
            }

            // Energetic enough — orientation / steric factor via Arrhenius-scaled probability
            const pSuccess = Math.min(0.92, pReact * 9);
            if (Math.random() < pSuccess) {
              pA.type = "P"; pA.flash = FLASH_FRAMES;
              pB.type = "P"; pB.flash = FLASH_FRAMES;
              reacted.add(pA.id); reacted.add(pB.id);
              pA.dx = -nx + (Math.random() - 0.5) * 0.8;
              pA.dy = -ny + (Math.random() - 0.5) * 0.8;
              pB.dx = nx + (Math.random() - 0.5) * 0.8;
              pB.dy = ny + (Math.random() - 0.5) * 0.8;
              const slot = burstSlotRef.current;
              burstSlotRef.current = (burstSlotRef.current + 1) % N_BURSTS;
              burstsRef.current.push({
                slot, frame: BURST_FRAMES,
                x: (pA.x + pB.x) / 2,
                y: (pA.y + pB.y) / 2,
                color: REACTANT_BURST_COLOR,
              });
            } else {
              pA.failFlash = Math.max(pA.failFlash, 8);
              pB.failFlash = Math.max(pB.failFlash, 8);
              pA.dx = -nx + (Math.random() - 0.5) * 0.45;
              pA.dy = -ny + (Math.random() - 0.5) * 0.45;
              pB.dx = nx + (Math.random() - 0.5) * 0.45;
              pB.dy = ny + (Math.random() - 0.5) * 0.45;
            }
          }
        }
      }

      burstsRef.current = advanceCollisionBurstRings(svg, burstsRef.current, {
        elementId: (slot) => `arb-${slot}`,
        particleRadius: RADIUS,
        burstFrames: BURST_FRAMES,
        burstRMax: BURST_R_MAX,
      });

      // ── 4. Update SVG elements imperatively ──────────────────────────
      for (const p of ps) {
        if (p.type === "C") {
          const el = svg.getElementById(`ac-${p.id}`) as SVGPathElement | null;
          el?.setAttribute("transform", `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`);
          continue;
        }
        const el = svg.getElementById(`arp-${p.id}`) as SVGCircleElement | null;
        if (!el) continue;
        el.setAttribute("cx", p.x.toFixed(1));
        el.setAttribute("cy", p.y.toFixed(1));
        if (p.flash > 0) {
          el.setAttribute("fill",    "#ffffff");
          el.setAttribute("r",       (RADIUS * 1.6).toFixed(1));
          el.setAttribute("opacity", "0.92");
        } else if (p.failFlash > 0) {
          el.setAttribute("fill",    p.type === "A" ? "#f59e0b" : "#3b82f6");
          el.setAttribute("r",       RADIUS.toString());
          el.setAttribute("opacity", "0.38");
        } else {
          el.setAttribute("fill",    p.type === "A" ? "#f59e0b" : "#3b82f6");
          el.setAttribute("r",       RADIUS.toString());
          el.setAttribute("opacity", "0.92");
        }
      }

      // Show/hide catalyst path slots
      const activeCatIds = new Set(ps.filter(p => p.type === "C").map(p => p.id));
      for (let i = 0; i < N_CATALYST; i++) {
        const cid = N_REACTANT + i;
        const el  = svg.getElementById(`ac-${cid}`) as SVGElement | null;
        el?.setAttribute("display", activeCatIds.has(cid) ? "" : "none");
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []); // all mutable state via refs

  // ── Flame dimensions (capped — flame stays below beaker) ──────────────────
  const normTRaw = Math.max(0, Math.min(1, (temperature - 250) / 450 + flameTutorialBoost));
  const flameH       = FLAME_MIN_H + normTRaw * (FLAME_MAX_H - FLAME_MIN_H);
  const flameW       = 11 + normTRaw * 16;
  const flameOpacity = 0.50 + normTRaw * 0.50;
  const flameTip     = FLAME_BASE_Y - flameH;
  const normT        = normTRaw;

  const catShape =
    catalystId === "v1" ? hexPath(5.5) : catalystId === "v2" ? starPath(6, 2.5) : hexPath(5.5);
  const activeCat = CATALYSTS.find(c => c.id === catalystId);

  return (
    <div className="flex flex-col h-full gap-1.5 rounded-xl border border-border bg-card p-3">

      {/* ── 1. Catalyst vials at top (pour downward into beaker) ── */}
      <div className={cn("shrink-0 rounded-xl p-0.5 -m-0.5 transition-shadow", ringCatalystRow && tutorialRingClass)}>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1 text-center">
          Catalyst
        </p>
        <div
          className={`flex items-end justify-center gap-5 transition-opacity duration-300 ${
            !isCatalystEnabled ? "opacity-35 pointer-events-none" : ""
          }`}
        >
          {/* None */}
          <button
            onClick={() => onCatalystChange("none")}
            disabled={!isCatalystEnabled}
            className={`text-[10px] rounded-lg px-2.5 py-1 font-medium transition-all ${
              catalystId === "none"
                ? "bg-slate-200 dark:bg-slate-700 text-foreground"
                : "text-muted-foreground bg-muted/40 hover:bg-muted/70"
            }`}
          >
            None
          </button>

          {CATALYSTS.filter(c => c.id !== "none").map((cat) => {
            const isActive = catalystId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCatalystChange(cat.id)}
                disabled={!isCatalystEnabled}
                title={cat.label}
                className="flex flex-col items-center gap-0.5"
                style={{
                  transform:  isActive ? "rotate(-15deg)" : "rotate(0deg)",
                  transition: "transform 0.45s ease",
                }}
              >
                <svg width="24" height="44" viewBox="0 0 28 56">
                  <rect x="9" y="0"  width="10" height="5"  rx="2" fill="#64748b" />
                  <rect x="6" y="5"  width="16" height="38" rx="3"
                        fill={cat.color} opacity={isActive ? 1 : 0.55} />
                  <rect x="8" y="7"  width="5"  height="18" rx="2"
                        fill="white" opacity="0.25" />
                  <rect x="6" y="40" width="16" height="6"  rx="3"
                        fill={cat.color} opacity={isActive ? 1 : 0.55} />
                  {isActive && (
                    <rect x="5" y="4" width="18" height="43" rx="4"
                          fill="none" stroke="white" strokeWidth="2" opacity="0.7" />
                  )}
                </svg>
                <span
                  className="text-[9px] font-semibold"
                  style={{ color: isActive ? cat.color : undefined }}
                >
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
        {!isCatalystEnabled && (
          <p className="text-[9px] text-muted-foreground/50 text-center mt-0.5">
            Continue the tutorial to unlock
          </p>
        )}
      </div>

      {/* ── 2. SVG: beaker + compact tripod + burner — ring hugs SVG only (not flex-1 dead space) ── */}
      <div className="flex-1 min-h-0 flex items-center justify-center min-w-0">
        <div
          className={cn(
            "w-fit max-w-full mx-auto rounded-lg",
            ringBeaker && TUTORIAL_RING_BEAKER,
            ringBeaker && "p-2 sm:p-2.5",
          )}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VW} ${VH}`}
            preserveAspectRatio="xMidYMid meet"
            className="block w-full max-w-[280px] h-[min(360px,42vh)] aspect-[240/295]"
            aria-label="Arrhenius lab beaker"
          >
          <defs>
            <linearGradient id="arFlameGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%"   stopColor={normT > 0.6 ? "#ef4444" : "#f97316"} />
              <stop offset="40%"  stopColor="#f97316" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="arLiquidGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#bfdbfe" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.28" />
            </linearGradient>
          </defs>

          {/* ── Ring stand + wire gauze (laboratory tripod) ── */}
          <line
            x1={LEG_L_TOP.x}
            y1={LEG_L_TOP.y}
            x2={LEG_L_FOOT.x}
            y2={LEG_L_FOOT.y}
            stroke="#64748b"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <line
            x1={LEG_R_TOP.x}
            y1={LEG_R_TOP.y}
            x2={LEG_R_FOOT.x}
            y2={LEG_R_FOOT.y}
            stroke="#64748b"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <line
            x1={LEG_BACK_TOP.x}
            y1={LEG_BACK_TOP.y}
            x2={LEG_BACK_FOOT.x}
            y2={LEG_BACK_FOOT.y}
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.85"
          />
          <ellipse
            cx={BURNER_CX}
            cy={GAUZE_CY}
            rx={RING_RX}
            ry={RING_RY}
            fill="none"
            stroke="#475569"
            strokeWidth="2.2"
          />
          <ellipse
            cx={BURNER_CX}
            cy={GAUZE_CY}
            rx={RING_RX - 4}
            ry={Math.max(1, RING_RY - 2)}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1"
            opacity="0.6"
          />
          {/* Wire mesh (schematic) */}
          <line
            x1={BURNER_CX - RING_RX + 10}
            y1={GAUZE_CY - 2}
            x2={BURNER_CX + RING_RX - 10}
            y2={GAUZE_CY + 2}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          <line
            x1={BURNER_CX - RING_RX + 12}
            y1={GAUZE_CY + 2}
            x2={BURNER_CX + RING_RX - 12}
            y2={GAUZE_CY - 2}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          {[0.25, 0.5, 0.75].map((f, i) => {
            const gx = BURNER_CX - RING_RX + 18 + f * (RING_RX * 2 - 36);
            return (
              <line
                key={i}
                x1={gx}
                y1={GAUZE_CY - 3}
                x2={gx}
                y2={GAUZE_CY + 3}
                stroke="#cbd5e1"
                strokeWidth="0.9"
              />
            );
          })}
          <line
            x1={12}
            y1={FOOT_Y + 1}
            x2={VW - 12}
            y2={FOOT_Y + 1}
            stroke="#64748b"
            strokeWidth="1.2"
            opacity="0.35"
          />

          {/* ── Bunsen burner ── */}
          <rect x={BURNER_CX - 6} y={BURNER_TUBE_TOP}
                width="12" height={BURNER_TUBE_BOT - BURNER_TUBE_TOP}
                rx="3" fill="#475569" />
          <rect x={BURNER_CX + 1} y={BURNER_TUBE_TOP + 12}
                width="9" height="4" rx="1.5" fill="#0f172a" opacity="0.55" />
          <rect x={BURNER_CX - 22} y={BURNER_TUBE_BOT}
                width="44" height="10" rx="3.5" fill="#334155" />
          <rect x={BURNER_CX - 27} y={BURNER_TUBE_BOT + 6}
                width="54" height="5"  rx="2.5" fill="#1e293b" opacity="0.5" />

          {/* ── Flame (height capped; horizontal scale 0.5 → ~1.2 with T) ── */}
          <g
            opacity={flameOpacity}
            style={{ transition: "opacity 0.35s ease" }}
            transform={`translate(${BURNER_CX},${FLAME_BASE_Y}) scale(${0.5 + normT * 0.7}) translate(${-BURNER_CX},${-FLAME_BASE_Y})`}
          >
            <path
              d={`M${BURNER_CX},${FLAME_BASE_Y}
                  C${BURNER_CX - flameW},${FLAME_BASE_Y - flameH * 0.38}
                   ${BURNER_CX - flameW * 0.5},${FLAME_BASE_Y - flameH}
                   ${BURNER_CX},${flameTip}
                  C${BURNER_CX + flameW * 0.5},${FLAME_BASE_Y - flameH}
                   ${BURNER_CX + flameW},${FLAME_BASE_Y - flameH * 0.38}
                   ${BURNER_CX},${FLAME_BASE_Y}Z`}
              fill="url(#arFlameGrad)"
            />
            <path
              d={`M${BURNER_CX},${FLAME_BASE_Y}
                  C${BURNER_CX - flameW * 0.3},${FLAME_BASE_Y - flameH * 0.5}
                   ${BURNER_CX - flameW * 0.14},${flameTip + flameH * 0.15}
                   ${BURNER_CX},${flameTip + 2}
                  C${BURNER_CX + flameW * 0.14},${flameTip + flameH * 0.15}
                   ${BURNER_CX + flameW * 0.3},${FLAME_BASE_Y - flameH * 0.5}
                   ${BURNER_CX},${FLAME_BASE_Y}Z`}
              fill="#fde68a"
              opacity="0.4"
            />
          </g>

          {/* ── Beaker liquid fill (behind particles) ── */}
          <rect x={BK.x + 2} y={BK.y + 2} width={BK.w - 4} height={BK.h - 4}
                fill="url(#arLiquidGrad)" />

          {/* ── Catalyst particles ── */}
          {Array.from({ length: N_CATALYST }, (_, i) => (
            <path
              key={N_REACTANT + i}
              id={`ac-${N_REACTANT + i}`}
              d={catShape}
              fill={activeCat?.color ?? "#94a3b8"}
              opacity="0.88"
              stroke="white" strokeWidth="0.5"
              transform="translate(-500,-500)"
              display={catalystId !== "none" ? "" : "none"}
            />
          ))}

          {/* ── Reactant / product circles ── */}
          {Array.from({ length: N_REACTANT }, (_, i) => (
            <circle
              key={i} id={`arp-${i}`}
              cx={PZ.minX + RADIUS} cy={PZ.minY + RADIUS}
              r={RADIUS} fill="#f59e0b" opacity="0.92"
            />
          ))}

          {/* ── Collision burst rings ── */}
          {Array.from({ length: N_BURSTS }, (_, i) => (
            <circle
              key={`burst-${i}`} id={`arb-${i}`}
              cx="0" cy="0" r="0"
              fill="none" stroke="white" strokeWidth="2" opacity="0"
            />
          ))}

          {/* ── Beaker outline (drawn last → on top of particles + flame) ── */}
          <rect x={BK.x} y={BK.y} width={BK.w} height={BK.h} rx="5"
                fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
          <rect x={RIM.x} y={RIM.y} width={RIM.w} height={RIM.h} rx="4"
                fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2.5" />
          {/* Pour spout */}
          <line x1={BK.x + BK.w + 2}  y1={RIM.y}
                x2={BK.x + BK.w + 10} y2={RIM.y - 7}
                stroke="hsl(var(--border))" strokeWidth="2.5" strokeLinecap="round" />
          {/* Graduation marks */}
          {[0.25, 0.5, 0.75].map((f, gi) => (
            <line key={gi}
              x1={BK.x + BK.w - 12} y1={BK.y + f * BK.h}
              x2={BK.x + BK.w + 2}  y2={BK.y + f * BK.h}
              stroke="hsl(var(--muted-foreground))" strokeWidth="1.5"
            />
          ))}
          </svg>
        </div>
      </div>

      {/* ── 3. Progress + legend ── */}
      <div className="shrink-0 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground px-0.5">
          <span className="font-medium text-foreground/80">Reaction progress</span>
          <span className="tabular-nums font-semibold text-foreground">
            {(productFraction * 100).toFixed(0)}% → product
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-[width] duration-200 ease-out"
            style={{ width: `${Math.min(100, productFraction * 100)}%` }}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            Reactant
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            Product
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
            Ineffective hit
          </span>
        </div>
      </div>

      {/* ── 4. Temperature slider (below burner) ── */}
      <div
        className={cn(
          "shrink-0 flex flex-col gap-0.5 px-1 py-0.5 rounded-xl -mx-0.5",
          ringTempSlider && tutorialRingClass,
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-center">
          Temperature
        </p>
        <input
          type="range"
          min={250} max={700} step={5}
          value={temperature}
          onChange={(e) => onTemperatureChange(Number(e.target.value))}
          disabled={temperatureLocked}
          className={cn(
            "w-full",
            temperatureLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          )}
          style={{ accentColor: "#f59e0b" }}
        />
        {temperatureLocked && (
          <p className="text-[9px] text-center text-muted-foreground/70">
            Unlocks after the catalyst steps
          </p>
        )}
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-base font-bold" style={{ color: "#f59e0b" }}>
            {temperature}
          </span>
          <span className="text-xs text-muted-foreground">K</span>
          <span className="text-[10px] text-muted-foreground ml-1">
            ({(temperature - 273).toFixed(0)} °C)
          </span>
        </div>
      </div>
    </div>
  );
}
