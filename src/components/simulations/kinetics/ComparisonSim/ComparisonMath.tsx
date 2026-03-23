import { ORDERS, INITIAL_CONC } from "./content";
import type { OrderSnapshot } from "./useComparison";

interface Props {
  snapshots: OrderSnapshot[];
  tCurrent:  number;
  halfLives: { zero: number; first: number; second: number };
}

const S = ({ c }: { c: string }) => <sub style={{ fontSize: "0.65em" }}>{c}</sub>;
const P = ({ c }: { c: string }) => <sup style={{ fontSize: "0.65em" }}>{c}</sup>;

// ── Col 1: Integrated Rate Law ────────────────────────────────────────────────
function IntegratedCol({ idx, r, a, a0, k, t }: {
  idx: number; r: string; a: number; a0: number; k: number; t: number;
}) {
  const live =
    idx === 0
      ? `${a.toFixed(2)} = ${a0.toFixed(2)} − ${k.toFixed(3)}(${t.toFixed(1)})`
      : idx === 1
      ? `${a.toFixed(3)} = ${a0.toFixed(2)}·e^(−${k.toFixed(3)}·${t.toFixed(1)})`
      : `${a.toFixed(3)} = 1 / (${(1 / a0).toFixed(2)} + ${k.toFixed(3)}·${t.toFixed(1)})`;

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Integrated</p>
      <p className="font-mono text-[10px] text-foreground leading-snug">
        {idx === 0 && <>[{r}]<S c="t" /> = [{r}]<S c="0" /> − k·t</>}
        {idx === 1 && <>[{r}]<S c="t" /> = [{r}]<S c="0" />·e<P c="(−k·t)" /></>}
        {idx === 2 && <>[{r}]<S c="t" /> = 1 / (1/[{r}]<S c="0" /> + k·t)</>}
      </p>
      <p className="font-mono text-[10px] leading-snug" style={{ color: ORDERS[idx].reactantColor }}>
        {live}
      </p>
    </div>
  );
}

// ── Col 2: Rate Law ───────────────────────────────────────────────────────────
function RateCol({ idx, r, a, k }: {
  idx: number; r: string; a: number; k: number;
}) {
  const expS = ["0", "1", "2"][idx];
  const exp  = ["⁰", "¹", "²"][idx];
  const rate = idx === 0 ? k : idx === 1 ? k * a : k * a * a;

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Rate Law</p>
      <p className="font-mono text-[10px] text-foreground leading-snug">
        Rate = k[{r}]<P c={expS} />
      </p>
      <p className="font-mono text-[10px] leading-snug" style={{ color: ORDERS[idx].reactantColor }}>
        {rate.toFixed(4)} = {k.toFixed(3)}({a.toFixed(3)}){exp}
      </p>
    </div>
  );
}

// ── Col 3: Half-Life ──────────────────────────────────────────────────────────
function HalfLifeCol({ idx, r, halfLife }: {
  idx: number; r: string; halfLife: number;
}) {
  const hl = isFinite(halfLife) ? `${halfLife.toFixed(2)} s` : "∞";

  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Half-Life</p>
      <p className="font-mono text-[10px] text-foreground leading-snug">
        {idx === 0 && <>t½ = [{r}]<S c="0" /> / (2k)</>}
        {idx === 1 && <>t½ = ln 2 / k</>}
        {idx === 2 && <>t½ = 1 / (k·[{r}]<S c="0" />)</>}
      </p>
      <p className="font-mono text-[10px] leading-snug" style={{ color: ORDERS[idx].reactantColor }}>
        t½ = {hl}
      </p>
    </div>
  );
}

function Pill({ idx, snap, t, halfLife }: {
  idx: number; snap: OrderSnapshot; t: number; halfLife: number;
}) {
  const o      = ORDERS[idx];
  const a      = snap.concA;
  const a0     = INITIAL_CONC;
  const fullName = ["ZERO-ORDER", "FIRST-ORDER", "SECOND-ORDER"][idx];

  return (
    <div
      className="rounded-lg border border-border bg-card px-3 py-2 flex flex-col gap-1.5"
      style={{ borderLeftWidth: 3, borderLeftColor: o.reactantColor }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-wide" style={{ color: o.reactantColor }}>
          {fullName}
        </span>
        <span className="text-[9px] font-mono text-muted-foreground">
          k = {o.k} {o.units}
        </span>
      </div>

      {/* Three-column body */}
      <div className="grid grid-cols-3 divide-x divide-border">
        <IntegratedCol idx={idx} r={o.reactant} a={a} a0={a0} k={o.k} t={t} />
        <div className="pl-2">
          <RateCol idx={idx} r={o.reactant} a={a} k={o.k} />
        </div>
        <div className="pl-2">
          <HalfLifeCol idx={idx} r={o.reactant} halfLife={halfLife} />
        </div>
      </div>
    </div>
  );
}

export function ComparisonMath({ snapshots, tCurrent, halfLives }: Props) {
  const hlArr = [halfLives.zero, halfLives.first, halfLives.second];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Kinetics Equations — t = {tCurrent.toFixed(1)} s
      </p>
      {ORDERS.map((_, i) => (
        <Pill key={i} idx={i} snap={snapshots[i]} t={tCurrent} halfLife={hlArr[i]} />
      ))}
    </div>
  );
}
