/**
 * Visual area for the Comparing Reaction Orders simulation.
 *
 * Layout:
 *   Three beaker rows (stacked) | Multi-line [A] vs t chart
 *   Scrubber inside chart card
 *
 * Charts are revealed only when tutorialStep >= 3 (guessing-game phase).
 */
import { useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChevronLeft, ChevronRight, Pause, Play, Eye } from "lucide-react";
import { ParticulateBeaker } from "../shared/ParticulateBeaker";
import { ORDERS, INITIAL_CONC, MAX_TIME } from "./content";
import type { OrderSnapshot, ChartPoint } from "./useComparison";

// ── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipItem {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}
interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
  label?: number;
}
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

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  snapshots: OrderSnapshot[];
  series: ChartPoint[];
  tCurrent: number;
  playing: boolean;
  chartsRevealed: boolean;
  onRevealCharts: () => void;
  onTimeChange: (t: number) => void;
  onTogglePlay: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ComparisonVisuals({
  snapshots,
  series,
  tCurrent,
  playing,
  chartsRevealed,
  onRevealCharts,
  onTimeChange,
  onTogglePlay,
}: Props) {
  // Play loop
  const tRef = useRef(tCurrent);
  tRef.current = tCurrent;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const next = parseFloat(Math.min(MAX_TIME, tRef.current + 0.2).toFixed(1));
      onTimeChange(next);
      if (next >= MAX_TIME) onTogglePlay();
    }, 100);
    return () => clearInterval(id);
  }, [playing, onTimeChange, onTogglePlay]);

  return (
    <div className="flex flex-col h-full gap-2">

      {/* ── Beakers + Chart row ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 flex-1 min-h-0">

        {/* Three beakers stacked vertically */}
        <div className="flex flex-row sm:flex-col gap-2 sm:w-[160px] sm:flex-shrink-0">
          {ORDERS.map((o, i) => (
            <div
              key={i}
              className="flex-1 rounded-xl border border-border bg-card p-2 flex flex-col min-h-[130px] sm:min-h-0"
              style={{ borderColor: `${o.reactantColor}55` }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-1 shrink-0"
                style={{ color: o.reactantColor }}
              >
                {o.shortLabel}
              </p>
              <div className="flex-1 min-h-0">
                <ParticulateBeaker
                  fractionA={snapshots[i].fractionA}
                  playing={playing}
                  reactantColor={o.reactantColor}
                  productColor={o.productColor}
                  reactantLabel={o.reactant}
                  productLabel={o.product}
                  showCatalyst={i === 0}
                  collisionBurstRings={i === 2}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular-nums shrink-0">
                <span style={{ color: o.reactantColor }}>[{o.reactant}]: {snapshots[i].concA.toFixed(2)}</span>
                <span style={{ color: o.productColor }}>[{o.product}]: {snapshots[i].concP.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Multi-line chart or guessing mask */}
        <div className="flex-1 min-h-0 rounded-xl border border-border bg-card p-3 flex flex-col min-h-[280px] sm:min-h-0 relative overflow-hidden">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 shrink-0">
            [Concentration] vs Time
          </p>

          {chartsRevealed ? (
            <div className="h-[220px] sm:h-auto sm:flex-1 sm:min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 4, right: 12, bottom: 28, left: -4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    label={{
                      value: "Time (s)",
                      position: "insideBottom",
                      offset: -12,
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <YAxis
                    domain={[0, INITIAL_CONC]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    label={{
                      value: "mol/L",
                      angle: -90,
                      position: "insideLeft",
                      offset: 14,
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: 10, paddingBottom: 4 }}
                    formatter={(v) => (
                      <span style={{ color: "hsl(var(--muted-foreground))" }}>{v}</span>
                    )}
                  />
                  <ReferenceLine
                    x={tCurrent}
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                  />
                  <Line type="linear"   dataKey="zero"   name={`${ORDERS[0].reactant} (Zero-order)`}   stroke={ORDERS[0].reactantColor} strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="first"  name={`${ORDERS[1].reactant} (First-order)`}  stroke={ORDERS[1].reactantColor} strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
                  <Line type="monotone" dataKey="second" name={`${ORDERS[2].reactant} (Second-order)`} stroke={ORDERS[2].reactantColor} strokeWidth={2.5} dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 bg-muted/30 rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground text-center px-4">
                Observe the beakers first — can you predict the curve shapes?
              </p>
              <button
                onClick={onRevealCharts}
                className="flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground rounded-full px-5 py-2 hover:opacity-90 transition-opacity"
              >
                <Eye className="w-4 h-4" />
                Reveal Graphs
              </button>
            </div>
          )}

          {/* ── Scrubber — inside chart card, centered under the graph ── */}
          <div className="flex items-center justify-center gap-3 shrink-0 pt-2 border-t border-border mt-1">
            <button
              onClick={() => onTimeChange(parseFloat(Math.max(0, tCurrent - 0.5).toFixed(1)))}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onTogglePlay}
              className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={MAX_TIME}
              step={0.1}
              value={tCurrent}
              onChange={(e) => onTimeChange(parseFloat(e.target.value))}
              className="w-32 sm:w-48 accent-primary"
            />
            <span className="text-sm tabular-nums min-w-[5rem]">
              t = <span className="font-semibold text-orange-500">{tCurrent.toFixed(1)} s</span>
            </span>
            <button
              onClick={() => onTimeChange(parseFloat(Math.min(MAX_TIME, tCurrent + 0.5).toFixed(1)))}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
