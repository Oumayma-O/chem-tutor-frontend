/**
 * Surface-Catalyzed Zero-Order Kinetics — Particulate Beaker
 *
 * REACTION LIFECYCLE (per particle):
 * ───────────────────────────────────────────────────────────────────────────
 *  1. DRIFTING   – Brownian motion (or micro-jitter when paused).
 *  2. CONTACT    – fractionA drops → nearest A-particle snapped to surface.
 *  3. REACTING   – held at surface for REACTION_FRAMES (~200 ms).
 *                  Particle turns amber, pulses slightly, surface glows.
 *  4. DESORPTION – timer reaches 0 → color flips to B, particle kicked
 *                  upward and released back into the solution.
 *  5. PRODUCT    – particle continues Brownian motion as type-B.
 *
 * TWO MODES (driven by `playing` prop)
 * ───────────────────────────────────────────────────────────────────────────
 *  PAUSED  – stored positions frozen; ±0.42 px sine micro-jitter on display.
 *            Surface dim. Conversions triggered by time-scrubber are
 *            INSTANT (no delay — particle isn't visibly moving anyway).
 *  PLAYING – full Brownian motion; surface amber glow lerps in; site dots
 *            breathe; REACTION_FRAMES delay before B colour flip.
 *
 * Reversal (backward scrub):
 *   Queued-but-not-yet-completed reactions are cancelled first (particle
 *   restored to A, released upward). Completed B-particles are then
 *   restored LIFO from dynamicConvertedOrder.
 *
 * All per-frame DOM writes are imperative (setAttribute). React never
 * touches particle positions after the initial layout effect.
 */
import { useEffect, useRef, useLayoutEffect } from "react";

// ── Geometry ───────────────────────────────────────────────────────────────
const N      = 36;
const R      = 5;
const VW     = 200;
const VH     = 220;
const BODY   = { x: 18, y: 32, w: 164, h: 168 };

const SURF_H = 11;
const SURF_Y = BODY.y + BODY.h - SURF_H;

const PZ = {
  minX: BODY.x + R + 3,
  maxX: BODY.x + BODY.w - R - 3,
  minY: BODY.y + R + 4,
  maxY: SURF_Y - R,
};

// Active sites
const N_SITES = 7;
const SITE_X  = Array.from({ length: N_SITES }, (_, i) =>
  BODY.x + 14 + (i * (BODY.w - 28)) / (N_SITES - 1)
);
const SITE_CY = SURF_Y + SURF_H / 2;

// Flash pool
const N_FLASHES       = N_SITES;

// Surface glow
const GLOW_PLAYING = 0.17;
const GLOW_PAUSED  = 0.0;

// Reaction animation
const REACTION_FRAMES = 6;              // ~200 ms at 30 fps
const REACTION_COLOR  = "#fbbf24";      // amber "in-reaction" intermediate

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

// Reaction-queue entry
interface ReactEntry { idx: number; timer: number; siteIdx: number }

// ── Component ──────────────────────────────────────────────────────────────
interface Props {
  fractionA:     number;
  playing:       boolean;
  reactantColor: string;
  productColor:  string;
  reactantLabel: string;
  productLabel:  string;
}

export function ParticulateBeaker({
  fractionA,
  playing,
  reactantColor,
  productColor,
  reactantLabel,
  productLabel,
}: Props) {
  // DOM refs
  const circleRefs    = useRef<(SVGCircleElement | null)[]>(new Array(N).fill(null));
  const siteRefs      = useRef<(SVGCircleElement | null)[]>(new Array(N_SITES).fill(null));
  const flashRefs     = useRef<(SVGCircleElement | null)[]>(new Array(N_FLASHES).fill(null));
  const surfaceGlowEl = useRef<SVGRectElement | null>(null);

  // Physics
  const posRef = useRef<Particle[]>(INITIAL.map(p => ({ ...p })));
  const rafRef = useRef<number>(0);

  // Prop mirrors (read inside RAF/effects without stale closure)
  const colorsRef  = useRef({ reactantColor, productColor });
  const playingRef = useRef(playing);
  useLayoutEffect(() => {
    colorsRef.current  = { reactantColor, productColor };
    playingRef.current = playing;
  });

  // ── Conversion tracking ────────────────────────────────────────────────
  // dynamicConvertedSet / dynamicConvertedOrder: completed B-particles.
  // reactingQueue / reactingSet: mid-reaction (counted as "B" for fractionA
  //   bookkeeping so we don't double-queue them, but not yet colour-flipped).
  const dynamicConvertedSet   = useRef<Set<number>>(new Set());
  const dynamicConvertedOrder = useRef<number[]>([]);
  const reactingQueue         = useRef<ReactEntry[]>([]);
  const reactingSet           = useRef<Set<number>>(new Set());

  // ejectQueue: particles that just completed reaction and must move upward
  // for EJECT_FRAMES ticks — runs even when !isPlaying so scrubbing shows the bounce.
  const ejectingSet  = useRef<Set<number>>(new Set());
  interface EjectEntry { idx: number; frames: number }
  const ejectQueue   = useRef<EjectEntry[]>([]);

  // Animation state
  const flashOpacity  = useRef<number[]>(new Array(N_FLASHES).fill(0));
  const flashSlot     = useRef(0);
  const siteGlow      = useRef<number[]>(new Array(N_SITES).fill(0));
  const surfaceGlowOp = useRef(0);
  const flashRng      = useRef(lcg(0xdeadbeef));
  const prevNARef     = useRef<number | null>(null);

  // Tracks which active-site indices are currently occupied by a mid-reaction
  // particle.  A site stays "busy" from the moment a particle lands on it until
  // the reaction completes and the product desorbs.  Freed sites are re-used by
  // future conversions.  This makes saturation visible: students see a fixed pool
  // of sites lighting up and going dark at a constant rate = k.
  const busySites = useRef<Set<number>>(new Set());

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

      const isPlaying = playingRef.current;

      // ── 1. Process reacting queue (runs regardless of playing state) ──
      //
      // Each queued particle is HELD at the surface and shows an amber
      // pulse. When its timer expires the reaction completes: colour→B,
      // particle kicked upward, surface flashes.
      reactingQueue.current = reactingQueue.current.filter(entry => {
        entry.timer--;

        const pEl = circleRefs.current[entry.idx];
        if (pEl) {
          // Shrinking pulse: radius 7→5 as timer 6→0
          const t = entry.timer / REACTION_FRAMES;         // 1→0
          pEl.setAttribute("r", (R + t * 2).toFixed(1));
        }
        // Hold particle at surface contact point
        const p = posRef.current[entry.idx];
        p.y  = PZ.maxY;
        const wx = Math.sin(now * 0.025 + entry.idx) * 0.4; // tiny surface wiggle
        pEl?.setAttribute("cx", (p.x + wx).toFixed(2));
        pEl?.setAttribute("cy", PZ.maxY.toFixed(1));

        if (entry.timer <= 0) {
          // ── Reaction complete ─────────────────────────────────────
          dynamicConvertedSet.current.add(entry.idx);
          dynamicConvertedOrder.current.push(entry.idx);
          reactingSet.current.delete(entry.idx);
          busySites.current.delete(entry.siteIdx);  // site is free again

          // Kick upward (desorption).
          p.y  = PZ.maxY - R;
          p.vy = -1.5;
          // Hand off to ejectQueue so the bounce runs even when !isPlaying.
          ejectingSet.current.add(entry.idx);
          ejectQueue.current.push({ idx: entry.idx, frames: 14 });

          // Colour → B, restore normal radius
          if (pEl) {
            pEl.setAttribute("fill", colorsRef.current.productColor);
            pEl.setAttribute("r",    R.toFixed(1));
          }

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

          return false; // remove from queue
        }
        return true;
      });

      // ── 2. Eject motion (runs even when !isPlaying) ───────────────────
      // Particles that just desorbed bounce upward for a fixed number of frames
      // independent of the Brownian motion toggle — ensures the bounce is visible
      // both during auto-play and when the user manually scrubs through time.
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
          // When paused, the main motion loop won't move this particle further.
          // Scatter it to a random location so B-particles don't all freeze at
          // the same height and form a visible horizontal line.
          if (!isPlaying) {
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
        // Reacting and recently-ejected particles are handled above
        if (reactingSet.current.has(i) || ejectingSet.current.has(i)) return;

        const el = circleRefs.current[i];
        if (!el) return;

        if (isPlaying) {
          p.x += p.vx;  p.y += p.vy;
          if (p.x < PZ.minX) { p.vx =  Math.abs(p.vx); p.x = PZ.minX; }
          if (p.x > PZ.maxX) { p.vx = -Math.abs(p.vx); p.x = PZ.maxX; }
          if (p.y < PZ.minY) { p.vy =  Math.abs(p.vy); p.y = PZ.minY; }
          if (p.y > PZ.maxY) { p.vy = -Math.abs(p.vy); p.y = PZ.maxY; }
          el.setAttribute("cx", p.x.toFixed(1));
          el.setAttribute("cy", p.y.toFixed(1));
        } else {
          // Micro-jitter: sine-wave display offset, stored position unchanged.
          // Golden-ratio phases ensure no two particles sync.
          const jx = Math.sin(now * 0.003 + i * 2.618) * 0.42;
          const jy = Math.cos(now * 0.004 + i * 1.618) * 0.42;
          el.setAttribute("cx", (p.x + jx).toFixed(2));
          el.setAttribute("cy", (p.y + jy).toFixed(2));
        }
      });

      // ── 4. Surface warm glow ──────────────────────────────────────────
      const glowTarget = isPlaying ? GLOW_PLAYING : GLOW_PAUSED;
      const gCurr      = surfaceGlowOp.current;
      if (Math.abs(gCurr - glowTarget) > 0.001) {
        surfaceGlowOp.current += (glowTarget - gCurr) * 0.07;
        surfaceGlowEl.current?.setAttribute("opacity", surfaceGlowOp.current.toFixed(3));
      }

      // ── 5. Active-site dots ───────────────────────────────────────────
      // Three visual states per site:
      //   BUSY   – a particle is currently reacting here: steady amber-white
      //            pulsing glow (persists for the full REACTION_FRAMES duration)
      //   FLASH  – completion burst fading out (siteGlow[i] > 0, not busy)
      //   FREE   – breathing idle when playing, static when paused
      siteGlow.current.forEach((g, i) => {
        const el     = siteRefs.current[i];
        if (!el) return;
        const isBusy = busySites.current.has(i);

        if (isBusy) {
          // Steady slow pulse: radius 4–6, opacity 0.7–1.0
          const pulse = (Math.sin(now * 0.008 + i * 1.1) + 1) / 2;
          el.setAttribute("r",       (4   + pulse * 2).toFixed(1));
          el.setAttribute("opacity", (0.7 + pulse * 0.3).toFixed(2));
          siteGlow.current[i] = 0; // suppress completion flash until site frees
        } else if (g > 0) {
          // Completion burst decaying
          const next = Math.max(0, g - 0.07);
          siteGlow.current[i] = next;
          el.setAttribute("r",       (3   + next * 3.5).toFixed(1));
          el.setAttribute("opacity", (0.45 + next * 0.55).toFixed(2));
        } else if (isPlaying) {
          // Gentle breathing idle
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
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Sync colours when fractionA changes ───────────────────────────────
  useEffect(() => {
    const nA = Math.round(fractionA * N);
    const nB = N - nA;                  // how many type-B we need in total
    const { reactantColor: rC, productColor: pC } = colorsRef.current;

    // "effective" B count = completed + mid-reaction (both reserved)
    const effectiveB = dynamicConvertedSet.current.size + reactingSet.current.size;

    if (prevNARef.current === null) {
      // ── FIRST RENDER — initialise using INITIAL positions ─────────────
      if (nB > 0) {
        const sorted = Array.from({ length: N }, (_, i) => i)
          .sort((a, b) => INITIAL[b].y - INITIAL[a].y);
        for (let c = 0; c < nB; c++) {
          dynamicConvertedSet.current.add(sorted[c]);
          dynamicConvertedOrder.current.push(sorted[c]);
        }
      }

    } else if (nB > effectiveB) {
      // ── FORWARD — new conversion(s) needed ────────────────────────────
      const toConvert = nB - effectiveB;

      // Pick eligible A-particles: not yet converted, not mid-reaction,
      // not mid-eject (a cancelled backward-scrub particle bouncing upward
      // as type-A is still in ejectingSet and must not be re-queued).
      // Selection is random so every particle has an equal chance regardless
      // of its position — correct for a well-mixed solution.
      const aList = Array.from({ length: N }, (_, i) => i)
        .filter(i =>
          !dynamicConvertedSet.current.has(i) &&
          !reactingSet.current.has(i) &&
          !ejectingSet.current.has(i)
        );
      // Shuffle so selection is random, not biased by index or position
      for (let k = aList.length - 1; k > 0; k--) {
        const j = Math.floor(flashRng.current() * (k + 1));
        [aList[k], aList[j]] = [aList[j], aList[k]];
      }

      for (let c = 0; c < Math.min(toConvert, aList.length); c++) {
        const pid      = aList[c];
        const p        = posRef.current[pid];
        const pEl      = circleRefs.current[pid];
        // Pick a free site; if all N_SITES are somehow occupied fall back randomly.
        const freeSites = Array.from({ length: N_SITES }, (_, si) => si)
          .filter(si => !busySites.current.has(si));
        const siteIdx = freeSites.length > 0
          ? freeSites[Math.floor(flashRng.current() * freeSites.length)]
          : Math.floor(flashRng.current() * N_SITES);
        busySites.current.add(siteIdx);

        // Same animation for both auto-play and manual scrubbing.
        // The reactingQueue always runs (it's in the RAF unconditionally), and
        // ejectQueue drives the upward bounce even when isPlaying=false — so the
        // "contact → amber → B → bounce" sequence plays regardless of play state.
        p.y  = PZ.maxY;
        p.vy = 0;  // held until timer expires; ejectQueue takes over after
        pEl?.setAttribute("cy", PZ.maxY.toFixed(1));
        if (pEl) {
          pEl.setAttribute("fill", REACTION_COLOR);
          pEl.setAttribute("r",    (R + 2).toFixed(1));
        }
        reactingSet.current.add(pid);
        reactingQueue.current.push({ idx: pid, timer: REACTION_FRAMES, siteIdx });
      }

    } else if (nB < effectiveB) {
      // ── BACKWARD — restore particle(s) to type-A ─────────────────────
      let toRestore = effectiveB - nB;

      // 1. Cancel mid-reaction particles first (LIFO from queue end)
      while (toRestore > 0 && reactingQueue.current.length > 0) {
        const entry = reactingQueue.current.pop()!;
        reactingSet.current.delete(entry.idx);
        busySites.current.delete(entry.siteIdx);

        const p   = posRef.current[entry.idx];
        p.y  = PZ.maxY - R;
        p.vy = -1.5;
        ejectingSet.current.add(entry.idx);
        ejectQueue.current.push({ idx: entry.idx, frames: 14 });

        const pEl = circleRefs.current[entry.idx];
        if (pEl) {
          pEl.setAttribute("fill", rC);
          pEl.setAttribute("r",    R.toFixed(1));
        }
        toRestore--;
      }

      // 2. Then restore completed B-particles (LIFO)
      while (toRestore > 0 && dynamicConvertedOrder.current.length > 0) {
        const pid = dynamicConvertedOrder.current.pop()!;
        dynamicConvertedSet.current.delete(pid);
        circleRefs.current[pid]?.setAttribute("fill", rC);
        toRestore--;
      }
    }

    // Apply colour to every particle not currently mid-reaction
    // (mid-reaction particles keep their amber colour managed by the queue)
    circleRefs.current.forEach((el, i) => {
      if (!el || reactingSet.current.has(i)) return;
      el.setAttribute("fill",
        dynamicConvertedSet.current.has(i) ? pC : rC
      );
    });

    prevNARef.current = nA;
  }, [fractionA, reactantColor, productColor]);

  return (
    <div className="flex flex-col h-full gap-1">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full h-auto max-w-[300px] max-h-[260px] mx-auto md:max-w-none md:max-h-[290px] xl:max-h-none md:flex-1 md:min-h-0"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="catalystGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#94a3b8" />
            <stop offset="50%"  stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="beakerFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="hsl(var(--card))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--card))" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Beaker interior */}
        <rect x={BODY.x} y={BODY.y} width={BODY.w} height={BODY.h} rx="5"
          fill="url(#beakerFill)" />

        {/* Catalyst plate */}
        <rect x={BODY.x + 2} y={SURF_Y} width={BODY.w - 4} height={SURF_H} rx="3"
          fill="url(#catalystGrad)" />
        {/* Metallic highlight */}
        <rect x={BODY.x + 6} y={SURF_Y + 2} width={BODY.w - 20} height="1.5" rx="1"
          fill="white" opacity="0.22" />
        {/* Warm glow overlay — lerped by RAF when playing */}
        <rect ref={surfaceGlowEl}
          x={BODY.x + 2} y={SURF_Y} width={BODY.w - 4} height={SURF_H} rx="3"
          fill="#f59e0b" opacity="0" />

        {/* Flash rings (below particles) */}
        {Array.from({ length: N_FLASHES }, (_, i) => (
          <circle key={`flash-${i}`}
            ref={(el) => { flashRefs.current[i] = el; }}
            cx={SITE_X[0]} cy={SITE_CY} r={11}
            fill="white" opacity="0" />
        ))}

        {/* Active-site dots */}
        {SITE_X.map((sx, i) => (
          <circle key={`site-${i}`}
            ref={(el) => { siteRefs.current[i] = el; }}
            cx={sx} cy={SITE_CY} r="2.8"
            fill="white" opacity="0.38" />
        ))}

        {/* "catalyst surface" label */}
        <text x={BODY.x + BODY.w / 2} y={SURF_Y - 5}
          textAnchor="middle" fontSize="6.5"
          fill="hsl(var(--muted-foreground))"
          fontFamily="ui-monospace, monospace" opacity="0.7">
          catalyst surface
        </text>

        {/* Particles */}
        {INITIAL.map((_, i) => (
          <circle key={i}
            ref={(el) => { circleRefs.current[i] = el; }}
            cx="0" cy="0" r={R}
            fill={reactantColor}
            opacity={0.9} />
        ))}

        {/* Beaker outline — clips particle overflow at walls */}
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
          surface-limited · constant rate
        </p>
      </div>
    </div>
  );
}
