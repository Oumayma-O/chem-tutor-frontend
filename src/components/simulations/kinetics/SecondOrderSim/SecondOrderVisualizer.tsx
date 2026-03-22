/**
 * [A] and [B] vs Time — hyperbolic curve chart + time scrubber.
 */
import { useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { DataPoint } from "./useSecondOrder";
import { MAX_TIME } from "./content";

interface TooltipItem { dataKey: string; name: string; value: number; color: string }
interface ChartTooltipProps { active?: boolean; payload?: TooltipItem[]; label?: number }
function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-lg space-y-0.5">
      <p className="font-semibold">t = {Number(label).toFixed(1)} s</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {Number(p.value).toFixed(3)} mol/L
        </p>
      ))}
    </div>
  );
}

interface Props {
  series: DataPoint[];
  tCurrent: number;
  playing: boolean;
  onTimeChange: (t: number) => void;
  onTogglePlay: () => void;
  halfLife: number;
  initialConc: number;
  reactantColor: string;
  productColor: string;
  reactantLabel: string;
  productLabel: string;
  highlightTimeControls?: boolean;
}

export function SecondOrderVisualizer({
  series, tCurrent, playing, onTimeChange, onTogglePlay,
  halfLife, initialConc,
  reactantColor, productColor, reactantLabel, productLabel,
  highlightTimeControls = false,
}: Props) {
  const hl = isFinite(halfLife) && halfLife <= MAX_TIME ? halfLife : null;

  const tRef = useRef(tCurrent);
  tRef.current = tCurrent;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const next = parseFloat(Math.min(MAX_TIME, tRef.current + 0.5).toFixed(1));
      onTimeChange(next);
      if (next >= MAX_TIME) onTogglePlay();
    }, 100);
    return () => clearInterval(id);
  }, [playing, onTimeChange, onTogglePlay]);

  return (
    <div className="flex flex-col gap-1.5 xl:h-full">
      {/* Chart */}
      <div className="h-[200px] xl:flex-1 xl:min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 6, right: 10, bottom: 28, left: -4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="t"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "Time (s)", position: "insideBottom", offset: -12, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis domain={[0, initialConc]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              label={{ value: "mol/L", angle: -90, position: "insideLeft", offset: 14, fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend verticalAlign="top" align="right"
              wrapperStyle={{ fontSize: 10, paddingBottom: 4 }}
              formatter={(v) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{v}</span>} />
            {hl && (
              <ReferenceLine x={hl} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 3"
                label={{ value: "t½", position: "insideTopRight", fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
            )}
            <ReferenceLine x={tCurrent} stroke="hsl(var(--foreground))" strokeWidth={1.5} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="reactant" name={`[${reactantLabel}]`}
              stroke={reactantColor} strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="product" name={`[${productLabel}]`}
              stroke={productColor} strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scrubber */}
      <div className={`flex items-center justify-center gap-3 shrink-0 pb-1 rounded-lg transition-all duration-300 ${highlightTimeControls ? "ring-2 ring-primary ring-offset-1 bg-primary/5" : ""}`}>
        <button onClick={() => onTimeChange(parseFloat(Math.max(0, tCurrent - 1).toFixed(1)))}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={onTogglePlay}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <span className="text-sm tabular-nums min-w-[7rem] text-center">
          Time: <span className="font-semibold text-orange-500">{tCurrent.toFixed(1)} s</span>
        </span>
        <button onClick={() => onTimeChange(parseFloat(Math.min(MAX_TIME, tCurrent + 1).toFixed(1)))}
          className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
