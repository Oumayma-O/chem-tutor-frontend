import { useMemo } from "react";
import { REACTIONS, CATALYSTS, UNIVERSAL_R, type ReactionConfig, type CatalystConfig } from "./content";

/** k = A·exp(−Eₐ/RT) with Eₐ in J·mol⁻¹, T in kelvin (same convention everywhere in this sim). */
export function arrheniusRateConstant(
  A: number,
  EaJPerMol: number,
  T: number,
  R: number = UNIVERSAL_R,
): number {
  return A * Math.exp(-EaJPerMol / (R * T));
}

/**
 * Single source of truth for Arrhenius kinetics in the sim: given reaction id, T (K),
 * and catalyst id, recomputes k, ln k, 1/T, effective Eₐ, and the ln(k) vs 1/T line.
 * The beaker, plots, equations, and energy profile should all consume this hook (via parent).
 */
export interface ArrheniusState {
  reaction: ReactionConfig;
  catalyst: CatalystConfig;
  effectiveEa: number;
  k: number;
  lnK: number;
  invT: number;
  lineSeries: { invT: number; lnK: number }[];
}

export function useArrhenius(
  reactionId: string,
  temperature: number,
  catalystId: string
): ArrheniusState {
  return useMemo(() => {
    const reaction = REACTIONS.find((r) => r.id === reactionId) ?? REACTIONS[0];
    const catalyst = CATALYSTS.find((c) => c.id === catalystId) ?? CATALYSTS[0];

    const effectiveEa = reaction.Ea * (1 - catalyst.reductionFraction);
    const k = arrheniusRateConstant(reaction.A, effectiveEa, temperature);
    const lnK = Math.log(k);
    const invT = 1 / temperature;

    // Generate line series over T = 250 to 700 K (step 10)
    const lineSeries: { invT: number; lnK: number }[] = [];
    for (let T = 250; T <= 700; T += 10) {
      const kT = arrheniusRateConstant(reaction.A, effectiveEa, T);
      lineSeries.push({ invT: 1 / T, lnK: Math.log(kT) });
    }

    return { reaction, catalyst, effectiveEa, k, lnK, invT, lineSeries };
  }, [reactionId, temperature, catalystId]);
}
