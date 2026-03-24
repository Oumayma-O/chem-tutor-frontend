import { type ReactionConfig } from "./content";
import { arrheniusRateConstant } from "./useArrhenius";

interface Props {
  reaction: ReactionConfig;
  temperature: number;
  effectiveEa: number;
}

/**
 * Conceptual side-by-side: heating vs catalyst — both increase rate, different mechanism.
 */
export function CatalystVsTempCard({
  reaction,
  temperature,
  effectiveEa,
}: Props) {
  const T = Math.max(250, temperature);
  const kUncat = arrheniusRateConstant(reaction.A, reaction.Ea, T);
  const kCat = arrheniusRateConstant(reaction.A, effectiveEa, T);

  return (
    <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1.5">
        High T vs catalyst (same T)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-muted-foreground leading-snug">
        <div className="rounded-md bg-card border border-border p-2">
          <p className="font-semibold text-foreground mb-0.5">Raise temperature</p>
          <p>Particles move faster (√T) and the energy distribution shifts — more collisions exceed Eₐ.</p>
        </div>
        <div className="rounded-md bg-card border border-border p-2">
          <p className="font-semibold text-foreground mb-0.5">Add a catalyst</p>
          <p>Lowers Eₐ for the same pathway idea — more pairs are “eligible” at the same T.</p>
          <p className="mt-1 font-mono text-[9px] text-foreground">
            k_cat / k_uncat ≈ {(kCat / Math.max(kUncat, 1e-300)).toFixed(2)}× @ {T} K
          </p>
        </div>
      </div>
    </div>
  );
}
