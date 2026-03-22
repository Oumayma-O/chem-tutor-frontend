/**
 * ln[A] vs Time — straight line chart.
 * Sits in the bottom row, left column.
 * A perfectly linear graph here is the diagnostic signature of first-order kinetics.
 */
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import type { DataPoint } from "./useFirstOrder";
import { MAX_TIME } from "./content";

interface TooltipProps { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: number; reactantLabel?: string }
function LnTooltip({ active, payload, label, reactantLabel = "A" }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-lg space-y-0.5">
      <p className="font-semibold">t = {Number(label).toFixed(1)} s</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          ln[{reactantLabel}] = {Number(p.value).toFixed(3)}
        </p>
      ))}
    </div>
  );
}

interface Props {
  series: DataPoint[];
  tCurrent: number;
  halfLife: number;
  initialConc: number;
  reactantColor: string;
  reactantLabel: string;
}

export function LnAChart({ series, tCurrent, halfLife, initialConc, reactantColor, reactantLabel }: Props) {
  const hl     = isFinite(halfLife) && halfLife <= MAX_TIME ? halfLife : null;
  const lnA0   = Math.log(initialConc);
  const lnAmin = series.length ? series[series.length - 1].lnA : lnA0 - 5;
  const domain: [number, number] = [
    Math.floor(lnAmin * 10) / 10,
    Math.ceil(lnA0 * 10) / 10,
  ];

  return (
    <div className="flex flex-col gap-1 xl:h-full">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
        ln[{reactantLabel}] vs Time
      </p>
      <p className="text-[10px] text-muted-foreground/70 shrink-0 -mt-0.5">
        straight line → confirms 1st order
      </p>
      <div className="h-[160px] xl:flex-1 xl:min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 6, right: 10, bottom: 28, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="t"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "Time (s)", position: "insideBottom", offset: -12, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis domain={domain}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: `ln[${reactantLabel}]`, angle: -90, position: "insideLeft", offset: 8, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip content={<LnTooltip reactantLabel={reactantLabel} />} />
            {hl && (
              <ReferenceLine x={hl} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 3"
                label={{ value: "t½", position: "insideTopRight", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
            )}
            <ReferenceLine x={tCurrent} stroke="hsl(var(--foreground))" strokeWidth={1.5} strokeDasharray="3 3" />
            <Line type="linear" dataKey="lnA" name={`ln[${reactantLabel}]`}
              stroke={reactantColor} strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
