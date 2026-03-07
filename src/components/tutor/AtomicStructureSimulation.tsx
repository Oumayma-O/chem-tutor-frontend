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
} from "recharts";

// Electron shell configuration data
const SHELL_CONFIG: Record<number, { shells: number[]; name: string; symbol: string }> = {
  1: { shells: [1], name: "Hydrogen", symbol: "H" },
  2: { shells: [2], name: "Helium", symbol: "He" },
  3: { shells: [2, 1], name: "Lithium", symbol: "Li" },
  4: { shells: [2, 2], name: "Beryllium", symbol: "Be" },
  5: { shells: [2, 3], name: "Boron", symbol: "B" },
  6: { shells: [2, 4], name: "Carbon", symbol: "C" },
  7: { shells: [2, 5], name: "Nitrogen", symbol: "N" },
  8: { shells: [2, 6], name: "Oxygen", symbol: "O" },
  9: { shells: [2, 7], name: "Fluorine", symbol: "F" },
  10: { shells: [2, 8], name: "Neon", symbol: "Ne" },
  11: { shells: [2, 8, 1], name: "Sodium", symbol: "Na" },
  12: { shells: [2, 8, 2], name: "Magnesium", symbol: "Mg" },
  13: { shells: [2, 8, 3], name: "Aluminum", symbol: "Al" },
  14: { shells: [2, 8, 4], name: "Silicon", symbol: "Si" },
  15: { shells: [2, 8, 5], name: "Phosphorus", symbol: "P" },
  16: { shells: [2, 8, 6], name: "Sulfur", symbol: "S" },
  17: { shells: [2, 8, 7], name: "Chlorine", symbol: "Cl" },
  18: { shells: [2, 8, 8], name: "Argon", symbol: "Ar" },
  19: { shells: [2, 8, 8, 1], name: "Potassium", symbol: "K" },
  20: { shells: [2, 8, 8, 2], name: "Calcium", symbol: "Ca" },
};

interface AtomicStructureSimulationProps {
  topicLabel: string;
}

export function AtomicStructureSimulation({ topicLabel }: AtomicStructureSimulationProps) {
  const [atomicNumber, setAtomicNumber] = useState(6);

  const element = SHELL_CONFIG[atomicNumber];
  const protons = atomicNumber;
  const neutrons = Math.round(atomicNumber * 1.1); // approximate
  const electrons = atomicNumber;

  // Ionization energy trend data (approximate first IE in eV)
  const ieData = useMemo(() => {
    const values: Record<number, number> = {
      1: 13.6, 2: 24.6, 3: 5.4, 4: 9.3, 5: 8.3, 6: 11.3,
      7: 14.5, 8: 13.6, 9: 17.4, 10: 21.6, 11: 5.1, 12: 7.6,
      13: 6.0, 14: 8.2, 15: 10.5, 16: 10.4, 17: 13.0, 18: 15.8,
      19: 4.3, 20: 6.1,
    };
    return Object.entries(values).map(([z, ie]) => ({
      z: Number(z),
      ie,
      symbol: SHELL_CONFIG[Number(z)]?.symbol || "",
    }));
  }, []);

  // Shell radii for SVG
  const shellRadii = [30, 55, 80, 105];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Atom model visualization */}
      <div
        data-guide-id="sim-beaker"
        className="bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:shadow-md"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4 text-center">
          Bohr Model — {element.name} ({element.symbol})
        </h3>
        <div className="flex justify-center">
          <svg viewBox="0 0 260 260" className="w-52 h-52">
            {/* Shells */}
            {element.shells.map((_, i) => (
              <circle
                key={`shell-${i}`}
                cx="130" cy="130"
                r={shellRadii[i]}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            ))}
            {/* Nucleus */}
            <circle cx="130" cy="130" r="16" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />
            <text x="130" y="134" textAnchor="middle" fontSize="10" fontWeight="bold" fill="hsl(var(--primary))">
              {protons}p
            </text>
            {/* Electrons on shells */}
            {element.shells.map((count, shellIdx) => {
              const r = shellRadii[shellIdx];
              return Array.from({ length: count }).map((_, eIdx) => {
                const angle = (2 * Math.PI * eIdx) / count - Math.PI / 2;
                const ex = 130 + r * Math.cos(angle);
                const ey = 130 + r * Math.sin(angle);
                return (
                  <circle
                    key={`e-${shellIdx}-${eIdx}`}
                    cx={ex} cy={ey} r="5"
                    fill="hsl(var(--primary))"
                    className="transition-all duration-300"
                  />
                );
              });
            })}
          </svg>
        </div>
        <div className="text-center mt-3 space-y-1">
          <p className="text-xs text-muted-foreground">
            {protons} protons · {neutrons} neutrons · {electrons} electrons
          </p>
          <p className="text-xs text-muted-foreground">
            Config: {element.shells.join("-")}
          </p>
        </div>
      </div>

      {/* Ionization energy graph */}
      <div
        data-guide-id="sim-graph"
        className="bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:shadow-md"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4 text-center">
          First Ionization Energy Trend
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={ieData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="z"
              label={{ value: "Atomic Number (Z)", position: "bottom", offset: 5, fontSize: 11 }}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              label={{ value: "IE (eV)", angle: -90, position: "insideLeft", offset: 0, fontSize: 11 }}
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              formatter={(value: number) => [`${value} eV`, "IE₁"]}
              labelFormatter={(z) => {
                const el = SHELL_CONFIG[Number(z)];
                return el ? `${el.name} (Z=${z})` : `Z=${z}`;
              }}
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="ie"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={(props: any) => {
                const isActive = props.payload.z === atomicNumber;
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={isActive ? 6 : 3}
                    fill={isActive ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                    stroke={isActive ? "hsl(var(--accent))" : "none"}
                    strokeWidth={2}
                  />
                );
              }}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Controls + key concepts */}
      <div className="space-y-6">
        <div
          data-guide-id="sim-controls"
          className="bg-card border border-border rounded-xl p-6 space-y-5 transition-all duration-300 hover:shadow-md"
        >
          <h3 className="text-sm font-semibold text-foreground">Select Element</h3>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Atomic Number (Z)</span>
              <span className="font-mono font-semibold text-foreground">
                {atomicNumber} — {element.symbol}
              </span>
            </div>
            <Slider
              value={[atomicNumber]}
              onValueChange={([v]) => setAtomicNumber(v)}
              min={1}
              max={20}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        <div
          data-guide-id="sim-equations"
          className="bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:shadow-md"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Key Concepts
          </h3>
          <div className="space-y-2.5">
            <div className="px-3 py-2 bg-secondary/50 rounded-md">
              <span className="text-xs text-muted-foreground">Atomic Number</span>
              <p className="text-sm font-medium text-foreground">Z = number of protons</p>
            </div>
            <div className="px-3 py-2 bg-secondary/50 rounded-md">
              <span className="text-xs text-muted-foreground">Mass Number</span>
              <p className="text-sm font-medium text-foreground">A = protons + neutrons</p>
            </div>
            <div className="px-3 py-2 bg-secondary/50 rounded-md">
              <span className="text-xs text-muted-foreground">Electron Shells</span>
              <p className="text-sm font-medium text-foreground">Max: 2, 8, 8, 2 (first 20)</p>
            </div>
            <div className="px-3 py-2 bg-secondary/50 rounded-md">
              <span className="text-xs text-muted-foreground">Periodic Trend</span>
              <p className="text-sm font-medium text-foreground">IE ↑ across period, ↓ down group</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
