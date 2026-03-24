import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { UNIVERSAL_R } from "./content";

interface Props {
  lineSeries: { invT: number; lnK: number }[];
  currentInvT: number;
  currentLnK: number;
  /** Animate the current (T, ln k) point along the line (late tutorial). */
  animateActiveDot?: boolean;
  /** Draw a chord between two line points to emphasize slope ≈ −Eₐ/R. */
  showSlopeTriangle?: boolean;
  effectiveEaJ?: number;
  /** Optional second “two-point” markers (1/T, ln k) for tutorial step. */
  twoPointInvT1?: number;
  twoPointLnK1?: number;
  twoPointInvT2?: number;
  twoPointLnK2?: number;
}

/** Format a number in scientific notation with Unicode superscripts, e.g. 1.4×10⁻³ */
function toSciNotation(value: number): string {
  if (value === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const coef = value / Math.pow(10, exp);

  const superscripts: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻",
  };
  const expStr = String(exp)
    .split("")
    .map((ch) => superscripts[ch] ?? ch)
    .join("");

  return `${coef.toFixed(1)}×10${expStr}`;
}

export function ArrheniusGraph({
  lineSeries,
  currentInvT,
  currentLnK,
  animateActiveDot = false,
  showSlopeTriangle = false,
  effectiveEaJ = 1e5,
  twoPointInvT1,
  twoPointLnK1,
  twoPointInvT2,
  twoPointLnK2,
}: Props) {
  const mutedFg = "hsl(var(--muted-foreground))";

  const iLo = Math.max(3, Math.floor(lineSeries.length * 0.15));
  const iHi = Math.min(lineSeries.length - 4, Math.floor(lineSeries.length * 0.55));
  const segLow = lineSeries[iLo];
  const segHigh = lineSeries[iHi];
  const slopeApprox =
    segLow && segHigh
      ? (segHigh.lnK - segLow.lnK) / (segHigh.invT - segLow.invT + 1e-30)
      : 0;
  const slopeTheory = -effectiveEaJ / UNIVERSAL_R;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="min-h-[160px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={lineSeries}
        margin={{ top: 10, right: 20, bottom: 35, left: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={mutedFg} opacity={0.15} />

        <XAxis
          dataKey="invT"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={toSciNotation}
          tick={{ fontSize: 9, fill: mutedFg }}
          label={{
            value: "1/T (K⁻¹)",
            position: "insideBottom",
            offset: -22,
            fontSize: 10,
            fill: mutedFg,
          }}
          tickCount={5}
          reversed
        />

        <YAxis
          dataKey="lnK"
          type="number"
          domain={["auto", "auto"]}
          tick={{ fontSize: 9, fill: mutedFg }}
          label={{
            value: "ln(k)",
            angle: -90,
            position: "insideLeft",
            offset: 10,
            fontSize: 10,
            fill: mutedFg,
          }}
          tickCount={5}
          width={45}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: "11px",
          }}
          formatter={(value: number) => [value.toFixed(2), "ln(k)"]}
          labelFormatter={(label: number) => `1/T = ${toSciNotation(label)}`}
        />

        <Line
          type="monotone"
          dataKey="lnK"
          stroke="#f59e0b"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: "#f59e0b" }}
          isAnimationActive={false}
        />

        {showSlopeTriangle && segLow && segHigh && (
          <>
            <ReferenceLine
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              segment={[
                { x: segLow.invT, y: segLow.lnK },
                { x: segHigh.invT, y: segHigh.lnK },
              ]}
            />
            <ReferenceDot x={segLow.invT} y={segLow.lnK} r={3} fill="#3b82f6" stroke="#fff" strokeWidth={1} />
            <ReferenceDot x={segHigh.invT} y={segHigh.lnK} r={3} fill="#3b82f6" stroke="#fff" strokeWidth={1} />
          </>
        )}

        {twoPointInvT1 != null &&
          twoPointLnK1 != null &&
          twoPointInvT2 != null &&
          twoPointLnK2 != null && (
            <>
              <ReferenceDot
                x={twoPointInvT1}
                y={twoPointLnK1}
                r={5}
                fill="#10b981"
                stroke="#fff"
                strokeWidth={1.5}
              />
              <ReferenceDot
                x={twoPointInvT2}
                y={twoPointLnK2}
                r={5}
                fill="#8b5cf6"
                stroke="#fff"
                strokeWidth={1.5}
              />
              <ReferenceLine
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="3 3"
                segment={[
                  { x: twoPointInvT1, y: twoPointLnK1 },
                  { x: twoPointInvT2, y: twoPointLnK2 },
                ]}
              />
            </>
          )}

        <ReferenceDot
          x={currentInvT}
          y={currentLnK}
          r={animateActiveDot ? 10 : 8}
          fill="#2563eb"
          stroke="#ffffff"
          strokeWidth={animateActiveDot ? 3 : 2.5}
          isFront
          isAnimationActive={false}
        />
      </LineChart>
        </ResponsiveContainer>
      </div>
      {showSlopeTriangle && (
        <p className="shrink-0 text-[9px] text-center text-muted-foreground px-1 pt-0.5 leading-tight">
          Slope ≈ {slopeApprox.toFixed(0)} (curve) · theory −Eₐ/R ≈ {slopeTheory.toFixed(0)} K
        </p>
      )}
    </div>
  );
}
