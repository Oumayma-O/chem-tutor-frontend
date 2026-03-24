/**
 * Simplified energy distribution sketch: not a literal Maxwell–Boltzmann fit,
 * but shows “more molecules past Eₐ when T rises” for pedagogy.
 */
import { UNIVERSAL_R } from "./content";

interface Props {
  temperature: number;
  effectiveEaJ: number;
}

export function MaxwellBoltzmannStrip({ temperature, effectiveEaJ }: Props) {
  const W = 280;
  const H = 72;
  const pad = 8;
  const plotW = W - pad * 2;
  const plotH = H - 22;
  const xEa = pad + plotW * 0.52;
  const sigma = 0.14 + (450 / Math.max(temperature, 250)) * 0.06;

  const gauss = (x: number) =>
    Math.exp(-((x - 0.28) ** 2) / (2 * sigma * sigma));

  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = pad + (i / 40) * plotW;
    const nx = (x - pad) / plotW;
    const y = pad + plotH * (1 - 0.08 - 0.82 * gauss(nx));
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }

  const fillPath = `${pts.join(" ")} L${pad + plotW},${pad + plotH} L${pad},${pad + plotH} Z`;

  return (
    <div className="rounded-lg border border-border bg-card/80 px-2 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        Energy distribution (schematic)
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[72px]" aria-hidden>
        <path d={fillPath} fill="url(#mbFill)" opacity="0.35" />
        <path d={pts.join(" ")} fill="none" stroke="#64748b" strokeWidth="1.5" />
        <line
          x1={xEa}
          y1={pad}
          x2={xEa}
          y2={pad + plotH}
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <text x={xEa + 4} y={pad + 11} fontSize="9" fill="#f59e0b" fontWeight="600">
          Eₐ
        </text>
        <text x={pad} y={H - 4} fontSize="8" fill="hsl(var(--muted-foreground))">
          Relative collision energy →
        </text>
        <defs>
          <linearGradient id="mbFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.2" />
            <stop offset={`${52 + (temperature - 250) / 450 * 12}%`} stopColor="#f59e0b" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.45" />
          </linearGradient>
        </defs>
      </svg>
      <p className="text-[9px] text-muted-foreground leading-snug mt-0.5">
        T = {temperature} K · Eₐ/(RT) ≈ {(effectiveEaJ / (UNIVERSAL_R * temperature)).toFixed(1)} (higher T
        shifts/reweights the curve toward more energetic collisions).
      </p>
    </div>
  );
}
