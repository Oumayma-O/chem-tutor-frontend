// ── Constants ──────────────────────────────────────────────────────────────
export const UNIVERSAL_R = 8.314; // J/(mol·K)

// ── Reaction configurations ────────────────────────────────────────────────
export interface ReactionConfig {
  id: string;
  label: string;
  A: number;      // frequency factor (s⁻¹ or L·mol⁻¹·s⁻¹)
  Ea: number;     // activation energy (J/mol)
  deltaH: number; // enthalpy change (kJ/mol)
  /** Short hint for the reaction selector (phase / context). */
  description?: string;
}

export const REACTIONS: ReactionConfig[] = [
  {
    id: "decomp",
    label: "N₂O₅ → 2NO₂ + ½O₂",
    A: 4.0e13,
    Ea: 103000,
    deltaH: -42,
    description: "Gas-phase decomposition (single-step model).",
  },
  {
    id: "haber",
    label: "N₂ + 3H₂ → 2NH₃",
    A: 1.2e11,
    Ea: 92000,
    deltaH: -92,
    description: "Heterogeneous catalysis in industry — simplified gas-phase kinetics here.",
  },
  {
    id: "ester",
    label: "CH₃COOH + C₂H₅OH → ester",
    A: 2.0e10,
    Ea: 75000,
    deltaH: -15,
    description: "Solution-phase esterification — concentrations omitted in this A-factor demo.",
  },
];

// ── Catalyst configurations ────────────────────────────────────────────────
export interface CatalystConfig {
  id: string;
  label: string;
  color: string;
  reductionFraction: number; // fraction by which Ea is reduced (0 = none)
}

export const CATALYSTS: CatalystConfig[] = [
  { id: "none", label: "No catalyst",  color: "#94a3b8", reductionFraction: 0    },
  { id: "v1",   label: "Vial A",       color: "#8b5cf6", reductionFraction: 0.25 },
  { id: "v2",   label: "Vial B",       color: "#10b981", reductionFraction: 0.45 },
];

// ── Tutorial steps ─────────────────────────────────────────────────────────
/** Regions the tutorial state machine can highlight (pulsing ring in UI). */
export type TutorialHighlight =
  | "reaction-dropdown"
  | "beaker-container"
  | "equation-arrhenius"
  | "equation-linear"
  | "equation-twopoint"
  | "arrhenius-plot"
  | "energy-profile-chart"
  | "catalyst-vials"
  | "temp-slider"
  | "practice-button";

/** Short machine label for debugging / analytics (not shown to students). */
export type TutorialAction =
  | "choose_reaction"
  | "collision_theory"
  | "activation_energy_concept"
  | "arrhenius_equation"
  | "what_k_visually"
  | "temperature_and_rate"
  | "energy_distribution"
  | "linear_form"
  | "two_point_form"
  | "energy_profile_intro"
  | "exothermic_profile"
  | "ea_hump"
  | "catalyst_intro"
  | "choose_catalyst"
  | "catalyst_path_drawn"
  | "unlock_temperature"
  | "hot_collisions"
  | "catalyst_vs_temp_compare"
  | "conclusion_mechanisms"
  | "start_practice";

export interface TutorialStep {
  id: number;
  title: string;
  body: string;
  mascotMood: string;
  /** Primary UI focus — string or list for multi-panel sync. */
  highlight: TutorialHighlight | TutorialHighlight[];
  action: TutorialAction;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 0,
    title: "Choose Your Reaction",
    body: "Let's explore how temperature and activation energy affect reaction rate. Choose a reaction from the dropdown to begin — each option lists a short context hint.",
    mascotMood: "explaining",
    highlight: "reaction-dropdown",
    action: "choose_reaction",
  },
  {
    id: 1,
    title: "Collision Theory",
    body: "Reaction rate equals the frequency of effective collisions. Molecules must collide with sufficient energy AND proper orientation to react.\n\nWatch: many touches flash gray (ineffective) — only some become products.",
    mascotMood: "thinking",
    highlight: "beaker-container",
    action: "collision_theory",
  },
  {
    id: 2,
    title: "Activation Energy (Eₐ)",
    body: "This minimum energy for a successful collision is called activation energy (Eₐ). Only collisions that are energetic enough (relative speed) can go on to react; others flicker dimly and separate.",
    mascotMood: "explaining",
    highlight: "beaker-container",
    action: "activation_energy_concept",
  },
  {
    id: 3,
    title: "The Arrhenius Equation",
    body: "The Arrhenius equation links k, T, and Eₐ:\n\nk = A·e^(−Eₐ/RT)\n\nk = rate constant, A = frequency factor, R = 8.314 J/(mol·K), T = temperature in Kelvin.\n\nThe live panel highlights Eₐ, T, and the exponent as you explore.",
    mascotMood: "explaining",
    highlight: "equation-arrhenius",
    action: "arrhenius_equation",
  },
  {
    id: 4,
    title: "What Does k Look Like?",
    body: "Small k → few successful events per second. Large k → many.\n\nThe beaker rate is tied to the same k as the equation (through a calibrated probability model).",
    mascotMood: "explaining",
    highlight: "equation-arrhenius",
    action: "what_k_visually",
  },
  {
    id: 5,
    title: "Temperature & Rate",
    body: "Higher temperature → higher k → faster rate.\n\nParticle speeds scale as √T (kinetic theory). The Arrhenius plot updates with your current (1/T, ln k) point.",
    mascotMood: "happy",
    highlight: ["arrhenius-plot", "equation-linear"],
    action: "temperature_and_rate",
  },
  {
    id: 6,
    title: "Energy Distribution (Schematic)",
    body: "Real collisions draw from an energy distribution. Higher T means more pairs are moving fast enough to react — so rate goes up. That is why T and Eₐ show up together in e^(−Eₐ/RT).",
    mascotMood: "thinking",
    highlight: ["arrhenius-plot", "equation-arrhenius"],
    action: "energy_distribution",
  },
  {
    id: 7,
    title: "The Linear Form",
    body: "Taking ln of both sides gives a linear equation:\n\nln(k) = (−Eₐ/R)·(1/T) + ln(A)\n\nSlope = −Eₐ/R — see the triangle on the graph when this step is active.",
    mascotMood: "thinking",
    highlight: ["arrhenius-plot", "equation-linear"],
    action: "linear_form",
  },
  {
    id: 8,
    title: "Two-Point Form",
    body: "Pick two temperatures below — k₁ and k₂ update from the Arrhenius form. The estimated Eₐ from the two-point formula should match the model when noise is low.\n\nln(k₂/k₁) = (Eₐ/R)·(1/T₁ − 1/T₂)",
    mascotMood: "explaining",
    highlight: "equation-twopoint",
    action: "two_point_form",
  },
  {
    id: 9,
    title: "Reaction Energy Profile",
    body: "A reaction energy profile plots potential energy vs. reaction progress.\n\nReactants climb to the transition state (peak), then fall to products.",
    mascotMood: "relaxed",
    highlight: "energy-profile-chart",
    action: "energy_profile_intro",
  },
  {
    id: 10,
    title: "Exothermic Reaction",
    body: "This reaction is exothermic — products have lower energy than reactants.\n\nΔH is negative (see the bracket on the profile).",
    mascotMood: "happy",
    highlight: "energy-profile-chart",
    action: "exothermic_profile",
  },
  {
    id: 11,
    title: "The Eₐ Hump",
    body: "The hump height IS the activation energy Eₐ. The higher the hump, the harder the reaction is to start.\n\nThe red dashed line shows average kinetic energy — compare it to the barrier.",
    mascotMood: "explaining",
    highlight: "energy-profile-chart",
    action: "ea_hump",
  },
  {
    id: 12,
    title: "Introducing Catalysts",
    body: "A catalyst lowers Eₐ by providing an alternative reaction pathway — without being consumed.\n\nThe orange (uncatalysed) and green (catalysed) curves are shown together when a catalyst is active.",
    mascotMood: "thinking",
    highlight: "catalyst-vials",
    action: "catalyst_intro",
  },
  {
    id: 13,
    title: "Choose a Catalyst",
    body: "Choose a catalyst vial — it tips toward the beaker. Watch the energy profile: the dashed green pathway sits lower than the orange one.",
    mascotMood: "relaxed",
    highlight: "catalyst-vials",
    action: "choose_catalyst",
  },
  {
    id: 14,
    title: "Eₐ Reduced!",
    body: "The catalysed pathway (dashed curve) has a lower hump. The kinetic energy line now sits closer to the top — more molecules can react!",
    mascotMood: "happy",
    highlight: "energy-profile-chart",
    action: "catalyst_path_drawn",
  },
  {
    id: 15,
    title: "Use the Flame",
    body: "Now use the flame slider to increase temperature. Flame height tracks T; particle speeds follow √T. Watch k climb on the Arrhenius graph.",
    mascotMood: "explaining",
    highlight: "temp-slider",
    action: "unlock_temperature",
  },
  {
    id: 16,
    title: "Successful Collisions!",
    body: "As temperature climbs, the kinetic energy line rises toward the barrier — successful collisions dominate. The progress bar tracks % product in the beaker.",
    mascotMood: "happy",
    highlight: ["energy-profile-chart", "arrhenius-plot"],
    action: "hot_collisions",
  },
  {
    id: 17,
    title: "Two Ways to Speed Up",
    body: "Heating and catalysis both speed reactions, but differently.\n\n• Higher T: faster particles, more exceed Eₐ (same barrier).\n• Catalyst: lowers Eₐ, easier to cross.\n\nSame result, different cause—know which you changed.",    mascotMood: "thinking",
    highlight: "energy-profile-chart",
    action: "catalyst_vs_temp_compare",
  },
  {
    id: 18,
    title: "T vs. Eₐ — Same Goal",
    body: "Both raising T and using a catalyst speed up the reaction — but by different mechanisms:\n\n• Higher T → more molecules already have enough energy\n• Catalyst → lowers the bar they need to clear",
    mascotMood: "thinking",
    highlight: "energy-profile-chart",
    action: "conclusion_mechanisms",
  },
  {
    id: 19,
    title: "You've Got It!",
    body: "1. Why k increases with T\n2. How catalysts lower Eₐ\n3. Reading energy profiles\n4. ln(k) vs 1/T\n\nReal world: heat speeds reactions; enzymes lower Eₐ.\n\nReady to practise?",
    mascotMood: "happy",
    highlight: "practice-button",
    action: "start_practice",
  },
];
