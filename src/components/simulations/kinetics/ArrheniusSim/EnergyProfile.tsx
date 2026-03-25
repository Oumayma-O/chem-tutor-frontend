import { useEffect, useMemo, useState } from "react";
import type { ReactionConfig } from "./content";
import { cn } from "@/lib/utils";

interface Props {
  reaction: ReactionConfig;
  effectiveEa: number;
  catalystActive: boolean;
  temperature: number;
  /** 0 = reactants, 1 = products — dot moves along the profile curve. */
  reactionProgress?: number;
  pulseEaHighlight?: boolean;
  pulseDeltaHHighlight?: boolean;
  pulseKineticLine?: boolean;
  animateCatalysedPath?: boolean;
}

type Pt = { x: number; y: number };

/** Cubic Bézier P(t); control points match SVG `C` segments in the profile path. */
function cubicBezier(
  t: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): Pt {
  const u = 1 - t;
  return {
    x:
      u * u * u * x0 +
      3 * u * u * t * x1 +
      3 * u * t * t * x2 +
      t * t * t * x3,
    y:
      u * u * u * y0 +
      3 * u * u * t * y1 +
      3 * u * t * t * y2 +
      t * t * t * y3,
  };
}

/**
 * Transition-state x matches the first cubic’s endpoint (`… 200 peakY 200 peakY`).
 * (Sampling min-y on the ascent would shift x when peak Y changes with catalyst.)
 */
const TRANSITION_STATE_X = 200;

/** Path meets the flat product shelf at x = 320; ΔH bracket sits just inside the plateau. */
const DH_BRACKET_X = 328;

/** Left gutter: axis spine, tick labels (no overlap), then plot + grid. */
const AXIS_X = 38;
const TICK_LABEL_X = 33;
const GRID_X1 = 44;

/** Samples matching the SVG path: flat → hump → flat (same control points as `uncatalysedPath`). */
function buildProfileSamples(peakY: number, reactantsY: number, productsY: number): Pt[] {
  const pts: Pt[] = [];
  for (let x = 0; x <= 80; x += 5) pts.push({ x, y: reactantsY });
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    pts.push(cubicBezier(t, 80, reactantsY, 140, reactantsY, 200, peakY, 200, peakY));
  }
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    pts.push(cubicBezier(t, 200, peakY, 200, peakY, 260, peakY, 320, productsY));
  }
  for (let x = 325; x <= 400; x += 5) pts.push({ x, y: productsY });
  return pts;
}

function pointOnProfile(samples: Pt[], p: number): Pt {
  const u = Math.max(0, Math.min(1, p));
  if (samples.length === 0) return { x: 0, y: 140 };
  const f = u * (samples.length - 1);
  const i0 = Math.floor(f);
  const i1 = Math.min(samples.length - 1, i0 + 1);
  const t = f - i0;
  const a = samples[i0];
  const b = samples[i1];
  return { x: a.x * (1 - t) + b.x * t, y: a.y * (1 - t) + b.y * t };
}

/** Linear energy (kJ/mol) vs SVG y: higher on screen ⇒ higher E (smaller y). */
function buildEnergyScale(reaction: ReactionConfig) {
  const eaKj = reaction.Ea / 1000;
  const dH = reaction.deltaH;
  const yTop = 20;
  const yBottom = 218;
  let EHigh = Math.max(eaKj + 15, 55);
  let ELow = Math.min(dH - 20, -35, dH - 5);
  if (ELow >= EHigh - 30) ELow = EHigh - 60;
  return { yTop, yBottom, EHigh, ELow };
}

function energyAtY(y: number, yTop: number, yBottom: number, EHigh: number, ELow: number): number {
  const f = (y - yTop) / (yBottom - yTop);
  return EHigh + f * (ELow - EHigh);
}

function formatEnergyLabel(E: number): string {
  const rounded = Math.abs(E) >= 10 ? Math.round(E) : Math.round(E * 10) / 10;
  return `${rounded}`;
}

export function EnergyProfile({
  reaction,
  effectiveEa,
  catalystActive,
  temperature,
  reactionProgress = 0,
  pulseEaHighlight = false,
  pulseDeltaHHighlight = false,
  pulseKineticLine = false,
  animateCatalysedPath = false,
}: Props) {
  const reactantsY = 140;
  const productsY = 175;
  const peakYUncatalysed = 40;

  const reductionFraction = 1 - effectiveEa / Math.max(reaction.Ea, 1);
  const catPeakY = peakYUncatalysed + reductionFraction * (reactantsY - peakYUncatalysed);

  const tsX = TRANSITION_STATE_X;
  const dhX = DH_BRACKET_X;

  const energyScale = useMemo(() => buildEnergyScale(reaction), [reaction]);
  const yGridLines = useMemo(() => {
    const { yTop, yBottom, EHigh, ELow } = energyScale;
    const n = 4;
    const lines: { y: number; label: string }[] = [];
    for (let i = 1; i <= n; i++) {
      const y = yTop + (i / (n + 1)) * (yBottom - yTop);
      const E = energyAtY(y, yTop, yBottom, EHigh, ELow);
      lines.push({ y, label: `${formatEnergyLabel(E)}` });
    }
    return lines;
  }, [energyScale]);

  const [catPathRevealed, setCatPathRevealed] = useState(false);
  useEffect(() => {
    if (!catalystActive) {
      setCatPathRevealed(false);
      return;
    }
    if (!animateCatalysedPath) {
      setCatPathRevealed(true);
      return;
    }
    setCatPathRevealed(false);
    const id = requestAnimationFrame(() => setCatPathRevealed(true));
    return () => cancelAnimationFrame(id);
  }, [catalystActive, animateCatalysedPath, effectiveEa]);

  const keY = 200 - ((temperature - 250) / 450) * 170;

  const peakForProgress = catalystActive ? catPeakY : peakYUncatalysed;
  const progressSamples = useMemo(
    () => buildProfileSamples(peakForProgress, reactantsY, productsY),
    [peakForProgress, reactantsY, productsY],
  );
  const progressDot = useMemo(
    () => pointOnProfile(progressSamples, reactionProgress),
    [progressSamples, reactionProgress],
  );

  const uncatalysedPath = [
    `M 0 ${reactantsY}`,
    `L 80 ${reactantsY}`,
    `C 140 ${reactantsY} 200 ${peakYUncatalysed} 200 ${peakYUncatalysed}`,
    `C 200 ${peakYUncatalysed} 260 ${peakYUncatalysed} 320 ${productsY}`,
    `L 400 ${productsY}`,
  ].join(" ");

  const catalysedPath = [
    `M 0 ${reactantsY}`,
    `L 80 ${reactantsY}`,
    `C 140 ${reactantsY} 200 ${catPeakY} 200 ${catPeakY}`,
    `C 200 ${catPeakY} 260 ${catPeakY} 320 ${productsY}`,
    `L 400 ${productsY}`,
  ].join(" ");

  return (
    <svg viewBox="0 0 400 240" className="w-full h-full" style={{ overflow: "visible" }}>
      <line
        x1={AXIS_X}
        y1="10"
        x2={AXIS_X}
        y2="230"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1"
        opacity="0.4"
      />

      <g opacity={0.45}>
        {yGridLines.map(({ y, label }) => (
          <g key={y}>
            <line
              x1={AXIS_X - 4}
              y1={y}
              x2={AXIS_X}
              y2={y}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="0.9"
              opacity={0.55}
            />
            <line
              x1={GRID_X1}
              y1={y}
              x2="395"
              y2={y}
              stroke="hsl(var(--border))"
              strokeWidth="0.75"
              strokeDasharray="2 4"
            />
            <text
              x={TICK_LABEL_X}
              y={y}
              textAnchor="end"
              dominantBaseline="central"
              fontSize="6.5"
              fill="hsl(var(--muted-foreground))"
              fontFamily="ui-monospace, monospace"
            >
              {label}
            </text>
          </g>
        ))}
      </g>
      <text x="4" y="14" fontSize="6" fill="hsl(var(--muted-foreground))" opacity="0.75">
        kJ/mol
      </text>

      <text x="200" y="238" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" opacity="0.7">
        Reaction Progress →
      </text>
      <text
        x="6"
        y="128"
        textAnchor="middle"
        fontSize="8"
        fill="hsl(var(--muted-foreground))"
        opacity="0.7"
        transform="rotate(-90, 6, 128)"
      >
        Potential Energy
      </text>

      <path
        d={uncatalysedPath}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {catalystActive && (
        <path
          d={catalysedPath}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeDasharray="6 3"
          strokeLinejoin="round"
          opacity={catPathRevealed ? 0.95 : 0}
          style={{ transition: "opacity 1.05s ease-out" }}
        />
      )}

      <line
        x1={GRID_X1}
        y1={keY}
        x2="380"
        y2={keY}
        stroke="#ef4444"
        strokeWidth={pulseKineticLine ? 2.2 : 1.5}
        strokeDasharray="8 4"
        opacity="0.85"
        className={cn(pulseKineticLine && "animate-pulse")}
      />
      <text
        x={GRID_X1 + 4}
        y={keY - 4}
        fontSize="7.5"
        fill="#ef4444"
        opacity="0.9"
        className={cn(pulseKineticLine && "animate-pulse")}
      >
        Avg. KE
      </text>

      <text
        x={tsX}
        y={peakYUncatalysed - 7}
        textAnchor="middle"
        fontSize="7.5"
        fill="hsl(var(--muted-foreground))"
        opacity="0.8"
        className={cn(pulseEaHighlight && "animate-pulse")}
      >
        Transition State
      </text>
      <circle
        cx={tsX}
        cy={peakYUncatalysed}
        r="3.5"
        fill="#f59e0b"
        opacity="0.9"
        className={cn(pulseEaHighlight && "animate-pulse")}
      />

      <line
        x1={tsX}
        y1={reactantsY}
        x2={tsX}
        y2={peakYUncatalysed}
        stroke="#f59e0b"
        strokeWidth="1"
        strokeDasharray="3 2"
        opacity="0.7"
        className={cn(pulseEaHighlight && "animate-pulse")}
      />
      <line
        x1={tsX - 4}
        y1={reactantsY}
        x2={tsX + 4}
        y2={reactantsY}
        stroke="#f59e0b"
        strokeWidth="1"
        className={cn(pulseEaHighlight && "animate-pulse")}
      />
      <line
        x1={tsX - 4}
        y1={peakYUncatalysed}
        x2={tsX + 4}
        y2={peakYUncatalysed}
        stroke="#f59e0b"
        strokeWidth="1"
        className={cn(pulseEaHighlight && "animate-pulse")}
      />
      <text
        x={tsX + 6}
        y={(reactantsY + peakYUncatalysed) / 2 + 3}
        fontSize="9"
        fill="#f59e0b"
        fontWeight="600"
        className={cn(pulseEaHighlight && "animate-pulse")}
      >
        Eₐ
      </text>

      {catalystActive && (
        <>
          <line
            x1={tsX}
            y1={reactantsY}
            x2={tsX}
            y2={catPeakY}
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="3 2"
            opacity="0.7"
          />
          <line
            x1={tsX - 4}
            y1={reactantsY}
            x2={tsX + 4}
            y2={reactantsY}
            stroke="#10b981"
            strokeWidth="1"
          />
          <line
            x1={tsX - 4}
            y1={catPeakY}
            x2={tsX + 4}
            y2={catPeakY}
            stroke="#10b981"
            strokeWidth="1"
          />
          <text
            x={tsX - 6}
            y={(reactantsY + catPeakY) / 2 + 3}
            fontSize="8"
            fill="#10b981"
            fontWeight="600"
            textAnchor="end"
          >
            Eₐ′
          </text>
        </>
      )}

      <line
        x1={dhX}
        y1={reactantsY}
        x2={dhX}
        y2={productsY}
        stroke="#94a3b8"
        strokeWidth="1"
        strokeDasharray="3 2"
        opacity="0.6"
        className={cn(pulseDeltaHHighlight && "animate-pulse")}
      />
      <line
        x1={dhX - 4}
        y1={reactantsY}
        x2={dhX + 4}
        y2={reactantsY}
        stroke="#94a3b8"
        strokeWidth="1"
        className={cn(pulseDeltaHHighlight && "animate-pulse")}
      />
      <line
        x1={dhX - 4}
        y1={productsY}
        x2={dhX + 4}
        y2={productsY}
        stroke="#94a3b8"
        strokeWidth="1"
        className={cn(pulseDeltaHHighlight && "animate-pulse")}
      />
      <text
        x={dhX + 6}
        y={(reactantsY + productsY) / 2 + 3}
        fontSize="8"
        fill="#94a3b8"
        fontWeight="600"
        className={cn(pulseDeltaHHighlight && "animate-pulse")}
      >
        ΔH
      </text>

      <text x="40" y={reactantsY - 6} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" fontWeight="600">
        Reactants
      </text>
      <text x="360" y={productsY - 6} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" fontWeight="600">
        Products
      </text>

      {catalystActive && (
        <g>
          <line x1={GRID_X1 + 4} y1="14" x2={GRID_X1 + 24} y2="14" stroke="#f59e0b" strokeWidth="2" />
          <text x={GRID_X1 + 27} y="17.5" fontSize="7.5" fill="#f59e0b">
            uncatalysed
          </text>
          <line
            x1={GRID_X1 + 4}
            y1="24"
            x2={GRID_X1 + 24}
            y2="24"
            stroke="#10b981"
            strokeWidth="1.8"
            strokeDasharray="5 2"
          />
          <text x={GRID_X1 + 27} y="27.5" fontSize="7.5" fill="#10b981">
            catalysed
          </text>
        </g>
      )}

      <g style={{ pointerEvents: "none" }}>
        <circle cx={progressDot.x} cy={progressDot.y} r="9" fill="#3b82f6" opacity="0.2" />
        <circle cx={progressDot.x} cy={progressDot.y} r="5.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2.2" />
      </g>
    </svg>
  );
}
