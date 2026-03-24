/**
 * Shared Particulate Beaker — used by Zero-Order AND First-Order sims.
 *
 * ZERO-ORDER  (showCatalyst=true, default)
 *   Surface-catalyzed model:
 *     Particle → snaps to catalyst plate → amber hold → B → bounce back up.
 *   The catalyst plate, active-site dots, and surface glow are all rendered.
 *   Caption: "surface-limited · constant rate"
 *
 * FIRST-ORDER (showCatalyst=false)
 *   Homogeneous / probabilistic model:
 *     Particle → amber flash in-place → B → continues Brownian motion.
 *   No catalyst plate rendered; particles use the full beaker height.
 *   Caption: "homogeneous · probabilistic"
 *
 * In both modes conversions are driven by the `fractionA` prop.  The host
 * hook (useKinetics / useFirstOrder) supplies the correct exponential or
 * linear decay, so the visual naturally mirrors the underlying chemistry.
 */
import { useEffect, useRef, useLayoutEffect } from "react";
import {
  advanceCollisionBurstRings,
  COLLISION_BURST_DEFAULTS,
  type SvgCollisionBurst,
} from "@/components/simulations/shared/collisionBurstSvg";

// ── Geometry ───────────────────────────────────────────────────────────────
const N    = 36;
const R    = 5;
const VW   = 200;
const VH   = 220;
const BODY = { x: 18, y: 32, w: 164, h: 168 };

// Catalyst surface (zero-order only)
const SURF_H = 11;
const SURF_Y = BODY.y + BODY.h - SURF_H;

// Particle zone when catalyst is shown (above the plate)
const PZ = {
  minX: BODY.x + R + 3,
  maxX: BODY.x + BODY.w - R - 3,
  minY: BODY.y + R + 4,
  maxY: SURF_Y - R,               // ceiling just above catalyst
};

// Particle zone bottom when NO catalyst (full beaker)
const FULL_BOTTOM = BODY.y + BODY.h - R - 2;

// Active sites (zero-order only)
const N_SITES = 7;
const SITE_X  = Array.from({ length: N_SITES }, (_, i) =>
  BODY.x + 14 + (i * (BODY.w - 28)) / (N_SITES - 1)
);
const SITE_CY = SURF_Y + SURF_H / 2;
const N_FLASHES = N_SITES;

// Surface glow targets
const GLOW_PLAYING = 0.17;
const GLOW_PAUSED  = 0.0;

// Reaction animation
const REACTION_FRAMES = 6;           // ~200 ms at 30 fps
const REACTION_COLOR  = "#fbbf24";   // amber intermediate
const COLLISION_FLASH_FRAMES = 14;

const N_BURSTS = COLLISION_BURST_DEFAULTS.nBursts;
const BURST_FRAMES = COLLISION_BURST_DEFAULTS.burstFrames;
const BURST_R_MAX  = COLLISION_BURST_DEFAULTS.burstRMax;
type Burst = SvgCollisionBurst;

// ── Seeded LCG ─────────────────────────────────────────────────────────────
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}

// ── Stable initial positions ───────────────────────────────────────────────
interface Particle { x: number; y: number; vx: number; vy: number }

const INITIAL: Particle[] = (() => {
  const rng = lcg(0xfeed42);
  return Array.from({ length: N }, () => {
    const speed = 0.38 + rng() * 0.48;
    const angle = rng() * Math.PI * 2;
    return {
      x:  PZ.minX + rng() * (PZ.maxX - PZ.minX),
      y:  PZ.minY + rng() * (PZ.maxY - PZ.minY),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  });
})();

interface ReactEntry { idx: number; timer: number; siteIdx: number }

// ── Component ──────────────────────────────────────────────────────────────
interface Props {
  fractionA:      number;
  playing:        boolean;
  reactantColor:  string;
  productColor:   string;
  reactantLabel:  string;
  productLabel:   string;
  /** true = catalyst plate + surface physics (zero-order).
   *  false (default) = homogeneous in-place flash (first-order). */
  showCatalyst?:  boolean;
  /** Expanding ring + brief white flash (same helper as SecondOrderBeaker) — Comparison second-order beaker. */
  collisionBurstRings?: boolean;
}

export function ParticulateBeaker({
  fractionA,
  playing,
  reactantColor,
  productColor,
  reactantLabel,
  productLabel,
  showCatalyst = false,
  collisionBurstRings = false,
}: Props) {
  // DOM refs
  const svgRef         = useRef<SVGSVGElement | null>(null);
  const circleRefs    = useRef<(SVGCircleElement | null)[]>(new Array(N).fill(null));
  const siteRefs      = useRef<(SVGCircleElement | null)[]>(new Array(N_SITES).fill(null));
  const flashRefs     = useRef<(SVGCircleElement | null)[]>(new Array(N_FLASHES).fill(null));
  const surfaceGlowEl = useRef<SVGRectElement | null>(null);

  // Physics
  const posRef = useRef<Particle[]>(INITIAL.map(p => ({ ...p })));
  const rafRef = useRef<number>(0);

  // Prop mirrors — updated every render so RAF always reads fresh values
  const colorsRef       = useRef({ reactantColor, productColor });
  const playingRef      = useRef(playing);
  const showCatalystRef = useRef(showCatalyst);
  useLayoutEffect(() => {
    colorsRef.current       = { reactantColor, productColor };
    playingRef.current      = playing;
    showCatalystRef.current = showCatalyst;
  });

  // ── Conversion tracking ────────────────────────────────────────────────
  const dynamicConvertedSet   = useRef<Set<number>>(new Set());
  const dynamicConvertedOrder = useRef<number[]>([]);
  const reactingQueue         = useRef<ReactEntry[]>([]);
  const reactingSet           = useRef<Set<number>>(new Set());

  const ejectingSet = useRef<Set<number>>(new Set());
  interface EjectEntry { idx: number; frames: number }
  const ejectQueue  = useRef<EjectEntry[]>([]);

  // Animation state
  const flashOpacity  = useRef<number[]>(new Array(N_FLASHES).fill(0));
  const flashSlot     = useRef(0);
  const siteGlow      = useRef<number[]>(new Array(N_SITES).fill(0));
  const surfaceGlowOp = useRef(0);
  const flashRng      = useRef(lcg(0xdeadbeef));
  const prevNARef     = useRef<number | null>(null);

  const busySites = useRef<Set<number>>(new Set());

  const burstsRef            = useRef<Burst[]>([]);
  const burstSlotRef         = useRef(0);
  const collisionBurstRef    = useRef(collisionBurstRings);
  const postReactFlashRef    = useRef<number[]>(new Array(N).fill(0));
  useLayoutEffect(() => {
    collisionBurstRef.current = collisionBurstRings;
  }, [collisionBurstRings]);

  // ── Initial positions before first paint ──────────────────────────────
  useLayoutEffect(() => {
    posRef.current.forEach((p, i) => {
      const el = circleRefs.current[i];
      if (el) {
        el.setAttribute("cx", p.x.toFixed(1));
        el.setAttribute("cy", p.y.toFixed(1));
      }
    });
  }, []);

  // ── RAF loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    let last = 0;
    const FRAME_MS = 33;

    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (now - last < FRAME_MS) return;
      last = now;

      const isPlaying  = playingRef.current;
      const withSurf   = showCatalystRef.current;
      const bottomWall = withSurf ? PZ.maxY : FULL_BOTTOM;
      const burstFx    = collisionBurstRef.current;

      // ── 1. Process reacting queue ─────────────────────────────────────
      reactingQueue.current = reactingQueue.current.filter(entry => {
        entry.timer--;

        const pEl = circleRefs.current[entry.idx];
        const t   = entry.timer / REACTION_FRAMES;            // 1 → 0
        pEl?.setAttribute("r", (R + t * 2).toFixed(1));       // shrinking pulse

        if (withSurf) {
          // Hold particle pressed against the catalyst plate
          const p  = posRef.current[entry.idx];
          p.y      = PZ.maxY;
          const wx = Math.sin(now * 0.025 + entry.idx) * 0.4;
          pEl?.setAttribute("cx", (p.x + wx).toFixed(2));
          pEl?.setAttribute("cy", PZ.maxY.toFixed(1));
        }
        // !withSurf: particle keeps moving freely while the amber timer counts down

        if (entry.timer <= 0) {
          // ── Reaction complete ─────────────────────────────────────
          dynamicConvertedSet.current.add(entry.idx);
          dynamicConvertedOrder.current.push(entry.idx);
          reactingSet.current.delete(entry.idx);

          if (withSurf) {
            busySites.current.delete(entry.siteIdx);

            // Kick upward (desorption)
            const p = posRef.current[entry.idx];
            p.y  = PZ.maxY - R;
            p.vy = -1.5;
            ejectingSet.current.add(entry.idx);
            ejectQueue.current.push({ idx: entry.idx, frames: 14 });

            // Surface flash at this site
            siteGlow.current[entry.siteIdx] = 1.0;
            const slot = flashSlot.current;
            flashSlot.current = (flashSlot.current + 1) % N_FLASHES;
            flashOpacity.current[slot] = 1.0;
            const fEl = flashRefs.current[slot];
            if (fEl) {
              fEl.setAttribute("cx",      SITE_X[entry.siteIdx].toFixed(1));
              fEl.setAttribute("cy",      SITE_CY.toFixed(1));
              fEl.setAttribute("opacity", "1");
            }
          }
          // !withSurf: particle just continues Brownian motion as product (no bounce)

          // Colour → product (or white flash phase for collisionBurstRings)
          if (pEl) {
            if (burstFx && !withSurf) {
              postReactFlashRef.current[entry.idx] = COLLISION_FLASH_FRAMES;
              pEl.setAttribute("fill", "#ffffff");
              pEl.setAttribute("r", (R * 1.55).toFixed(1));
            } else {
              pEl.setAttribute("fill", colorsRef.current.productColor);
              pEl.setAttribute("r", R.toFixed(1));
            }
          }
          return false;
        }
        return true;
      });

      // Post-reaction white flash — after queue so new flashes start fresh this frame
      const postFlash = postReactFlashRef.current;
      for (let i = 0; i < N; i++) {
        if (postFlash[i] <= 0) continue;
        postFlash[i]--;
        const el = circleRefs.current[i];
        if (!el) continue;
        if (postFlash[i] > 0) {
          el.setAttribute("fill", "#ffffff");
          el.setAttribute("r", (R * 1.55).toFixed(1));
        } else {
          const { reactantColor: rC, productColor: pC } = colorsRef.current;
          el.setAttribute("fill", dynamicConvertedSet.current.has(i) ? pC : rC);
          el.setAttribute("r", R.toFixed(1));
        }
      }

      // ── 2. Eject motion (zero-order only, runs even when paused) ──────
      ejectQueue.current = ejectQueue.current.filter(e => {
        e.frames--;
        const p  = posRef.current[e.idx];
        const el = circleRefs.current[e.idx];
        p.x += p.vx;  p.y += p.vy;
        if (p.x < PZ.minX) { p.vx =  Math.abs(p.vx); p.x = PZ.minX; }
        if (p.x > PZ.maxX) { p.vx = -Math.abs(p.vx); p.x = PZ.maxX; }
        if (p.y < PZ.minY) { p.vy =  Math.abs(p.vy); p.y = PZ.minY; }
        if (p.y > PZ.maxY) { p.vy = -Math.abs(p.vy); p.y = PZ.maxY; }
        if (el) {
          el.setAttribute("cx", p.x.toFixed(1));
          el.setAttribute("cy", p.y.toFixed(1));
        }
        if (e.frames <= 0) {
          ejectingSet.current.delete(e.idx);
          if (!isPlaying) {
            // Scatter so paused B-particles don't line up at the same height
            p.x  = PZ.minX + flashRng.current() * (PZ.maxX - PZ.minX);
            p.y  = PZ.minY + flashRng.current() * (PZ.maxY - PZ.minY);
            const sp = 0.38 + flashRng.current() * 0.48;
            const an = flashRng.current() * Math.PI * 2;
            p.vx = Math.cos(an) * sp;
            p.vy = Math.sin(an) * sp;
            if (el) {
              el.setAttribute("cx", p.x.toFixed(1));
              el.setAttribute("cy", p.y.toFixed(1));
            }
          }
          return false;
        }
        return true;
      });

      // ── 3. Particle motion ────────────────────────────────────────────
      posRef.current.forEach((p, i) => {
        if (reactingSet.current.has(i) && withSurf) return; // surface-held
        if (ejectingSet.current.has(i)) return;             // bouncing

        const el = circleRefs.current[i];
        if (!el) return;

        if (isPlaying) {
          p.x += p.vx;  p.y += p.vy;
          if (p.x < PZ.minX)    { p.vx =  Math.abs(p.vx); p.x = PZ.minX; }
          if (p.x > PZ.maxX)    { p.vx = -Math.abs(p.vx); p.x = PZ.maxX; }
          if (p.y < PZ.minY)    { p.vy =  Math.abs(p.vy); p.y = PZ.minY; }
          if (p.y > bottomWall) { p.vy = -Math.abs(p.vy); p.y = bottomWall; }
          el.setAttribute("cx", p.x.toFixed(1));
          el.setAttribute("cy", p.y.toFixed(1));
        } else {
          // Micro-jitter
          const jx = Math.sin(now * 0.003 + i * 2.618) * 0.42;
          const jy = Math.cos(now * 0.004 + i * 1.618) * 0.42;
          el.setAttribute("cx", (p.x + jx).toFixed(2));
          el.setAttribute("cy", (p.y + jy).toFixed(2));
        }
      });

      // ── 4. Surface warm glow (zero-order only) ────────────────────────
      if (withSurf) {
        const glowTarget = isPlaying ? GLOW_PLAYING : GLOW_PAUSED;
        const gCurr      = surfaceGlowOp.current;
        if (Math.abs(gCurr - glowTarget) > 0.001) {
          surfaceGlowOp.current += (glowTarget - gCurr) * 0.07;
          surfaceGlowEl.current?.setAttribute("opacity", surfaceGlowOp.current.toFixed(3));
        }

        // ── 5. Active-site dots ───────────────────────────────────────────
        siteGlow.current.forEach((g, i) => {
          const el     = siteRefs.current[i];
          if (!el) return;
          const isBusy = busySites.current.has(i);
          if (isBusy) {
            const pulse = (Math.sin(now * 0.008 + i * 1.1) + 1) / 2;
            el.setAttribute("r",       (4   + pulse * 2).toFixed(1));
            el.setAttribute("opacity", (0.7 + pulse * 0.3).toFixed(2));
            siteGlow.current[i] = 0;
          } else if (g > 0) {
            const next = Math.max(0, g - 0.07);
            siteGlow.current[i] = next;
            el.setAttribute("r",       (3   + next * 3.5).toFixed(1));
            el.setAttribute("opacity", (0.45 + next * 0.55).toFixed(2));
          } else if (isPlaying) {
            const b = (Math.sin(now * 0.0027 + i * 0.9) + 1) / 2;
            el.setAttribute("r",       (2.8 + b * 1.6).toFixed(1));
            el.setAttribute("opacity", (0.38 + b * 0.24).toFixed(2));
          } else {
            el.setAttribute("r",       "2.8");
            el.setAttribute("opacity", "0.38");
          }
        });

        // ── 6. Flash ring decay ───────────────────────────────────────────
        flashOpacity.current.forEach((op, i) => {
          if (op <= 0) return;
          const next = Math.max(0, op - 0.075);
          flashOpacity.current[i] = next;
          flashRefs.current[i]?.setAttribute("opacity", next.toFixed(2));
        });
      }

      const svg = svgRef.current;
      if (svg && burstFx && burstsRef.current.length) {
        burstsRef.current = advanceCollisionBurstRings(svg, burstsRef.current, {
          elementId: (slot) => `pb-burst-${slot}`,
          particleRadius: R,
          burstFrames: BURST_FRAMES,
          burstRMax: BURST_R_MAX,
        });
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Sync colours when fractionA changes ───────────────────────────────
  useEffect(() => {
    const nA = Math.round(fractionA * N);
    const nB = N - nA;
    const { reactantColor: rC, productColor: pC } = colorsRef.current;
    const withSurf = showCatalystRef.current;

    const effectiveB = dynamicConvertedSet.current.size + reactingSet.current.size;

    if (prevNARef.current === null) {
      // First render — initialise B-particles from sorted initial positions
      if (nB > 0) {
        const sorted = Array.from({ length: N }, (_, i) => i)
          .sort((a, b) => INITIAL[b].y - INITIAL[a].y);
        for (let c = 0; c < nB; c++) {
          dynamicConvertedSet.current.add(sorted[c]);
          dynamicConvertedOrder.current.push(sorted[c]);
        }
      }

    } else if (nB > effectiveB) {
      // ── FORWARD — new conversion(s) needed ─────────────────────────
      const toConvert = nB - effectiveB;

      const aList = Array.from({ length: N }, (_, i) => i)
        .filter(i =>
          !dynamicConvertedSet.current.has(i) &&
          !reactingSet.current.has(i) &&
          !ejectingSet.current.has(i)
        );
      // Random shuffle
      for (let k = aList.length - 1; k > 0; k--) {
        const j = Math.floor(flashRng.current() * (k + 1));
        [aList[k], aList[j]] = [aList[j], aList[k]];
      }

      for (let c = 0; c < Math.min(toConvert, aList.length); c++) {
        const pid = aList[c];
        const p   = posRef.current[pid];
        const pEl = circleRefs.current[pid];

        let siteIdx = 0;
        if (withSurf) {
          // Catalyst: snap to surface and assign an active site
          const freeSites = Array.from({ length: N_SITES }, (_, si) => si)
            .filter(si => !busySites.current.has(si));
          siteIdx = freeSites.length > 0
            ? freeSites[Math.floor(flashRng.current() * freeSites.length)]
            : Math.floor(flashRng.current() * N_SITES);
          busySites.current.add(siteIdx);

          p.y  = PZ.maxY;
          p.vy = 0;
          pEl?.setAttribute("cy", PZ.maxY.toFixed(1));
        }
        // !withSurf: particle flashes amber in-place, no surface snap
        if (!withSurf && collisionBurstRef.current && aList.length >= 2) {
          const partner = aList.find((id) => id !== pid) ?? aList[0];
          const q = posRef.current[partner];
          const mx = (p.x + q.x) / 2;
          const my = (p.y + q.y) / 2;
          const slot = burstSlotRef.current;
          burstSlotRef.current = (burstSlotRef.current + 1) % N_BURSTS;
          burstsRef.current.push({
            slot,
            x: mx,
            y: my,
            frame: BURST_FRAMES,
            color: colorsRef.current.reactantColor,
          });
        }

        if (pEl) {
          pEl.setAttribute("fill", REACTION_COLOR);
          pEl.setAttribute("r",    (R + 2).toFixed(1));
        }
        reactingSet.current.add(pid);
        reactingQueue.current.push({ idx: pid, timer: REACTION_FRAMES, siteIdx });
      }

    } else if (nB < effectiveB) {
      // ── BACKWARD — restore particle(s) to type-A ───────────────────
      let toRestore = effectiveB - nB;

      // 1. Cancel mid-reaction particles first (LIFO)
      while (toRestore > 0 && reactingQueue.current.length > 0) {
        const entry = reactingQueue.current.pop()!;
        reactingSet.current.delete(entry.idx);

        const p   = posRef.current[entry.idx];
        const pEl = circleRefs.current[entry.idx];
        if (pEl) {
          pEl.setAttribute("fill", rC);
          pEl.setAttribute("r",    R.toFixed(1));
        }
        postReactFlashRef.current[entry.idx] = 0;

        if (withSurf) {
          busySites.current.delete(entry.siteIdx);
          p.y  = PZ.maxY - R;
          p.vy = -1.5;
          ejectingSet.current.add(entry.idx);
          ejectQueue.current.push({ idx: entry.idx, frames: 14 });
        }
        // !withSurf: particle just stays where it was, color restored

        toRestore--;
      }

      // 2. Restore completed B-particles (LIFO)
      while (toRestore > 0 && dynamicConvertedOrder.current.length > 0) {
        const pid = dynamicConvertedOrder.current.pop()!;
        dynamicConvertedSet.current.delete(pid);
        postReactFlashRef.current[pid] = 0;
        circleRefs.current[pid]?.setAttribute("fill", rC);
        toRestore--;
      }
    }

    // Apply colour to all non-reacting particles
    circleRefs.current.forEach((el, i) => {
      if (!el || reactingSet.current.has(i)) return;
      if (postReactFlashRef.current[i] > 0) return;
      el.setAttribute("fill", dynamicConvertedSet.current.has(i) ? pC : rC);
    });

    prevNARef.current = nA;
  }, [fractionA, reactantColor, productColor]);

  return (
    <div className="flex min-h-0 h-full w-full flex-col gap-1">
      {/* Fixed aspect matches viewBox so every instance (e.g. Comparison sim) sizes identically */}
      <div className="flex w-full flex-1 min-h-0 items-center justify-center">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full max-w-[300px] md:max-w-none aspect-[200/220] max-h-full shrink-0 md:max-h-[min(290px,100%)] mx-auto md:flex-1 md:min-h-0"
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: "visible" }}
        >
        <defs>
          {showCatalyst && (
            <linearGradient id="catalystGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#94a3b8" />
              <stop offset="50%"  stopColor="#64748b" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          )}
          <linearGradient id="beakerFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="hsl(var(--card))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--card))" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Beaker interior */}
        <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx="5"
          fill="url(#beakerFill)" />

        {/* ── Catalyst elements (zero-order only) ── */}
        {showCatalyst && (<>
          <rect x={BODY.x + 2} y={SURF_Y} width={BODY.w - 4} height={SURF_H} rx="3"
            fill="url(#catalystGrad)" />
          <rect x={BODY.x + 6} y={SURF_Y + 2} width={BODY.w - 20} height="1.5" rx="1"
            fill="white" opacity="0.22" />
          <rect ref={surfaceGlowEl}
            x={BODY.x + 2} y={SURF_Y} width={BODY.w - 4} height={SURF_H} rx="3"
            fill="#f59e0b" opacity="0" />

          {Array.from({ length: N_FLASHES }, (_, i) => (
            <circle key={`flash-${i}`}
              ref={(el) => { flashRefs.current[i] = el; }}
              cx={SITE_X[0]} cy={SITE_CY} r={11}
              fill="white" opacity="0" />
          ))}

          {SITE_X.map((sx, i) => (
            <circle key={`site-${i}`}
              ref={(el) => { siteRefs.current[i] = el; }}
              cx={sx} cy={SITE_CY} r="2.8"
              fill="white" opacity="0.38" />
          ))}

          <text x={BODY.x + BODY.w / 2} y={SURF_Y - 5}
            textAnchor="middle" fontSize="6.5"
            fill="hsl(var(--muted-foreground))"
            fontFamily="ui-monospace, monospace" opacity="0.7">
            catalyst surface
          </text>
        </>)}

        {/* Particles */}
        {INITIAL.map((_, i) => (
          <circle key={i}
            ref={(el) => { circleRefs.current[i] = el; }}
            cx="0" cy="0" r={R}
            fill={reactantColor}
            opacity={0.9} />
        ))}

        {collisionBurstRings &&
          Array.from({ length: N_BURSTS }, (_, i) => (
            <circle
              key={`pb-burst-${i}`}
              id={`pb-burst-${i}`}
              cx={0}
              cy={0}
              r={0}
              fill="none"
              stroke="white"
              strokeWidth={2}
              opacity={0}
            />
          ))}

        {/* Beaker outline */}
        <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx="5"
          fill="none" stroke="hsl(var(--border))" strokeWidth="3" />

        {/* Rim cap */}
        <rect x={BODY.x - 6} y={BODY.y - 16} width={BODY.w + 12} height="16" rx="3"
          fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2.5" />

        {/* Graduation marks */}
        {[0.25, 0.5, 0.75].map((f, gi) => (
          <line key={gi}
            x1={BODY.x + BODY.w - 14} y1={BODY.y + f * BODY.h}
            x2={BODY.x + BODY.w + 2}  y2={BODY.y + f * BODY.h}
            stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />
        ))}
        </svg>
      </div>

      {/* Legend + caption */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: reactantColor }} />
            {reactantLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: productColor }} />
            {productLabel}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 text-center leading-tight">
          {showCatalyst
            ? "surface-limited · constant rate"
            : collisionBurstRings
              ? "homogeneous · burst + ring on hit"
              : "homogeneous · probabilistic"}
        </p>
      </div>
    </div>
  );
}
