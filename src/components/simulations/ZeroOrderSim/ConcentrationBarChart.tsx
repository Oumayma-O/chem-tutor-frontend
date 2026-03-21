/**
 * Vertical bar chart showing current [A] vs [B] concentrations.
 */
import {
  BarChart,
  Bar,
  Cell,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { name: string; color: string } }[];
}

function BarTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded border border-border bg-card px-2 py-1 text-xs shadow">
      <span style={{ color: p.payload.color }}>{p.payload.name}: </span>
      <span className="font-semibold">{p.value.toFixed(3)} mol/L</span>
    </div>
  );
}

interface ConcentrationBarChartProps {
  concA: number;
  concB: number;
  initialConc: number;
  reactantColor: string;
  productColor: string;
  reactantLabel: string;
  productLabel: string;
}

export function ConcentrationBarChart({
  concA,
  concB,
  initialConc,
  reactantColor,
  productColor,
  reactantLabel,
  productLabel,
}: ConcentrationBarChartProps) {
  const data = [
    { name: reactantLabel, value: concA, color: reactantColor },
    { name: productLabel,  value: concB, color: productColor  },
  ];

  return (
    <div className="flex flex-col h-full gap-1">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barSize={36}
            margin={{ top: 6, right: 4, bottom: 4, left: -18 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <YAxis
              domain={[0, initialConc]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: "hsl(var(--muted)/0.3)" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend dots */}
      <div className="flex justify-center gap-6 shrink-0">
        {data.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}
