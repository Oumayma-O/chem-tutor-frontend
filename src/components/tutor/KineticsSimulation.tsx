import { useState, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceDot,
} from "recharts";

interface KineticsSimulationProps {
  reactionOrder: 0 | 1 | 2;
  orderLabel: string;
}

export function KineticsSimulation({ reactionOrder, orderLabel }: KineticsSimulationProps) {
  const [initConc, setInitConc] = useState(0.8);
  const [rateK, setRateK] = useState(0.02);
  const maxTime = 40;

  const data = useMemo(() => {
    const points = [];
    for (let t = 0; t <= maxTime; t += 0.5) {
      let conc: number;
      if (reactionOrder === 0) {
        conc = initConc - rateK * t;
      } else if (reactionOrder === 1) {
        conc = initConc * Math.exp(-rateK * t);
      } else {
        conc = 1 / (1 / initConc + rateK * t);
      }
      conc = Math.max(0, conc);
      points.push({ time: t, concentration: parseFloat(conc.toFixed(4)) });
      if (conc <= 0) break;
    }
    return points;
  }, [initConc, rateK, reactionOrder]);

  const halfLife = useMemo(() => {
    if (reactionOrder === 0) return initConc / (2 * rateK);
    if (reactionOrder === 1) return 0.693 / rateK;
    return 1 / (rateK * initConc);
  }, [initConc, rateK, reactionOrder]);

  const halfLifeConc = initConc / 2;

  const equations: Record<number, { rate: string; integrated: string; halfLife: string }> = {
    0: {
      rate: "Rate = k",
      integrated: "[A]ₜ = [A]₀ − kt",
      halfLife: "t₁/₂ = [A]₀ / 2k",
    },
    1: {
      rate: "Rate = k[A]",
      integrated: "ln[A]ₜ = ln[A]₀ − kt",
      halfLife: "t₁/₂ = 0.693 / k",
    },
    2: {
      rate: "Rate = k[A]²",
      integrated: "1/[A]ₜ = 1/[A]₀ + kt",
      halfLife: "t₁/₂ = 1 / (k[A]₀)",
    },
  };

  const eq = equations[reactionOrder];

  // Molecule dots for beaker visualization
  const totalDots = 48;
  const currentConc = data.length > 0 ? data[Math.min(10, data.length - 1)].concentration : initConc;
  const activeDots = Math.round((currentConc / initConc) * totalDots);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Beaker visualization */}
      <div
        data-guide-id="sim-beaker"
        className="bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:shadow-md"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4 text-center">Beaker</h3>
        <div className="flex justify-center">
          <svg viewBox="0 0 180 220" className="w-40 h-52">
            {/* Beaker body */}
            <rect x="30" y="20" width="120" height="180" rx="6" fill="none" stroke="hsl(var(--primary) / 0.3)" strokeWidth="2.5" />
            <rect x="20" y="10" width="140" height="15" rx="3" fill="none" stroke="hsl(var(--primary) / 0.3)" strokeWidth="2" />
            {/* Liquid level */}
            <rect
              x="32" y={200 - (initConc / 1.0) * 160}
              width="116"
              height={(initConc / 1.0) * 160}
              rx="4"
              fill="hsl(var(--primary) / 0.12)"
              className="transition-all duration-500"
            />
            {/* Molecule dots */}
            {Array.from({ length: totalDots }).map((_, i) => {
              const col = i % 6;
              const row = Math.floor(i / 6);
              const cx = 48 + col * 18;
              const cy = 50 + row * 20;
              const isActive = i < activeDots;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="6"
                  fill={isActive ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.08)"}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-2">
          [A]₀ = {initConc.toFixed(2)} M
        </p>
      </div>

      {/* Concentration vs Time graph */}
      <div
        data-guide-id="sim-graph"
        className="bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:shadow-md"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4 text-center">
          Concentration vs Time
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              label={{ value: "Time (s)", position: "bottom", offset: 5, fontSize: 11 }}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              domain={[0, Math.ceil(initConc * 10) / 10 + 0.1]}
              label={{ value: "[A] (M)", angle: -90, position: "insideLeft", offset: 0, fontSize: 11 }}
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(3)} M`, "[A]"]}
              labelFormatter={(label) => `t = ${label} s`}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="concentration"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={false}
              animationDuration={800}
            />
            {halfLife <= maxTime && (
              <ReferenceDot
                x={parseFloat(halfLife.toFixed(1))}
                y={halfLifeConc}
                r={6}
                fill="hsl(var(--accent))"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        <p className="text-center text-[10px] text-muted-foreground mt-1">
          t₁/₂ = {halfLife.toFixed(1)} s {halfLife <= maxTime && "●"}
        </p>
      </div>

      {/* Controls + Equations */}
      <div className="space-y-6">
        {/* Sliders */}
        <div
          data-guide-id="sim-controls"
          className="bg-card border border-border rounded-xl p-6 space-y-5 transition-all duration-300 hover:shadow-md"
        >
          <h3 className="text-sm font-semibold text-foreground">Adjust Parameters</h3>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>[A]₀ (Initial Concentration)</span>
              <span className="font-mono font-semibold text-foreground">{initConc.toFixed(2)} M</span>
            </div>
            <Slider
              value={[initConc]}
              onValueChange={([v]) => setInitConc(v)}
              min={0.1}
              max={1.0}
              step={0.05}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>k (Rate Constant)</span>
              <span className="font-mono font-semibold text-foreground">{rateK.toFixed(3)} M/s</span>
            </div>
            <Slider
              value={[rateK]}
              onValueChange={([v]) => setRateK(v)}
              min={0.005}
              max={0.1}
              step={0.005}
              className="w-full"
            />
          </div>
        </div>

        {/* Key Equations */}
        <div
          data-guide-id="sim-equations"
          className="bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:shadow-md"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {orderLabel} Equations
          </h3>
          <div className="space-y-2.5">
            <div className="px-3 py-2 bg-secondary/50 rounded-md">
              <span className="text-xs text-muted-foreground">Rate Law</span>
              <p className="equation text-sm font-medium text-foreground">{eq.rate}</p>
            </div>
            <div className="px-3 py-2 bg-secondary/50 rounded-md">
              <span className="text-xs text-muted-foreground">Integrated</span>
              <p className="equation text-sm font-medium text-foreground">{eq.integrated}</p>
            </div>
            <div className="px-3 py-2 bg-secondary/50 rounded-md">
              <span className="text-xs text-muted-foreground">Half-Life</span>
              <p className="equation text-sm font-medium text-foreground">{eq.halfLife}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
