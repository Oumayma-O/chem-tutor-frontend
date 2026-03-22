/**
 * Static content for the Second-Order Kinetics simulation.
 *
 * Three reactions that teach distinct second-order concepts:
 *   A+A→B   baseline collision (same species)
 *   A+B→C   mixed collision (two species must meet)
 *   A+A→B   higher k (more reactions per collision)
 *
 * Math: [A]t = 1/(k·t + 1/[A]₀)  |  Rate = k·[A]²  |  t½ = 1/(k·[A]₀)
 */

export type ReactionType = "aa" | "ab" | "aa-fast";

export interface Reaction {
  id: string;
  label: string;
  reactant: string;
  bReactant?: string;     // second reactant label (A+B only)
  product: string;
  k: number;              // M⁻¹·s⁻¹
  defaultConc: number;    // mol/L  ([A]₀; for ab also [B]₀)
  firstTutorialStep: number;
  color: string;          // reactant A color
  bColor?: string;        // reactant B color (A+B only)
  productColor: string;
  reactionType: ReactionType;
  rateDisplay: string;    // formula shown in DynamicMath
}

export const REACTIONS: Reaction[] = [
  {
    id: "aa",
    label: "A + A → B",
    reactant: "A",
    product: "B",
    k: 0.143,
    defaultConc: 0.70,
    firstTutorialStep: 0,
    color: "#3b82f6",
    productColor: "#f43f5e",
    reactionType: "aa",
    rateDisplay: "k[A]²",
  },
  {
    id: "ab",
    label: "A + B → C",
    reactant: "A",
    bReactant: "B",
    product: "C",
    k: 0.143,
    defaultConc: 0.70,
    firstTutorialStep: 13,
    color: "#3b82f6",
    bColor: "#f43f5e",
    productColor: "#10b981",
    reactionType: "ab",
    rateDisplay: "k[A][B]",
  },
  {
    id: "aa-fast",
    label: "A + A → B (×2k)",
    reactant: "A",
    product: "B",
    k: 0.286,
    defaultConc: 0.70,
    firstTutorialStep: 17,
    color: "#8b5cf6",
    productColor: "#f59e0b",
    reactionType: "aa-fast",
    rateDisplay: "k[A]²",
  },
];

export const INITIAL_CONC = REACTIONS[0].defaultConc;
export const MAX_TIME     = 60;
export const TIME_STEP    = 0.5;

export type TutorialMood = "default" | "happy" | "thinking" | "relaxed" | "explaining";

export interface TutorialStep {
  id: number;
  title: string;
  body: string;
  mascotMood: TutorialMood;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  // ── A + A → B (steps 0–12) ──────────────────────────────────────────
  {
    id: 0,
    title: "Welcome to Second-Order Kinetics!",
    body: "This is a second-order reaction A + A → B.\n\nParticles must physically collide to react. Why don't you set the initial concentration of A, [A]₀, using the Parameters menu above?",
    mascotMood: "explaining",
  },
  {
    id: 1,
    title: "Set the time range",
    body: "Great! Now you can explore the concentration of A at any point in time using the time scrubber below the graph.",
    mascotMood: "thinking",
  },
  {
    id: 2,
    title: "The rate constant k",
    body: "For this reaction, k = 0.143 M⁻¹s⁻¹.\n\nNotice the units — M⁻¹s⁻¹ instead of s⁻¹ for first-order. The order changes the units of k!",
    mascotMood: "explaining",
  },
  {
    id: 3,
    title: "The rate equation",
    body: "For a reaction with one reactant it's written as Rate = k[A]^order.\n\nFor this second-order reaction: Rate = k[A]².",
    mascotMood: "thinking",
  },
  {
    id: 4,
    title: "Half-life t½",
    body: "For second-order reactions: t½ = 1/(k[A]₀) = 10.00 s.\n\n💡 Unlike first-order, t½ depends on [A]₀ — it gets shorter as concentration increases!",
    mascotMood: "relaxed",
  },
  {
    id: 5,
    title: "A steeper curve",
    body: "Rate = k[A]². That's why a graph of [A] vs t is a steeper hyperbolic curve — the rate is proportional to concentration squared.",
    mascotMood: "explaining",
  },
  {
    id: 6,
    title: "Fast at first",
    body: "Notice how [A] drops fast at the beginning — there's more A present, so more collisions happen per second.",
    mascotMood: "happy",
  },
  {
    id: 7,
    title: "Slower towards the end",
    body: "As [A] falls, fewer A+A collisions occur. The rate drops dramatically — much faster than first-order kinetics.",
    mascotMood: "explaining",
  },
  {
    id: 8,
    title: "A quantitative look",
    body: "If [A] = 0.9, then [A]² = 0.81. And if [A] = 0.8, then [A]² = 0.64.\n\nDropping [A] by 0.1 cuts a 1st-order rate by 0.1, but cuts a 2nd-order rate by 0.17.",
    mascotMood: "thinking",
  },
  {
    id: 9,
    title: "Rate comparison",
    body: "Since 0.1 < 0.17, the rate drops more drastically for second-order at first, and then slower than first-order towards the end.",
    mascotMood: "explaining",
  },
  {
    id: 10,
    title: "The integrated rate law",
    body: "k = (1/[A]t − 1/[A]₀) / t\n\nThat's why 1/[A] vs t is a straight line — slope is k, intercept is 1/[A]₀.",
    mascotMood: "thinking",
  },
  {
    id: 11,
    title: "Watch the collisions!",
    body: "Watch how the particles move! They only react when two A particles physically collide.\n\nTry scrubbing the time slider to see [A] change.",
    mascotMood: "happy",
  },
  {
    id: 12,
    title: "Try a mixed collision",
    body: "Now let's try A + B → C — a reaction between TWO DIFFERENT species.\n\nChoose A + B → C from the dropdown above!",
    mascotMood: "relaxed",
  },
  // ── A + B → C (steps 13–16) ─────────────────────────────────────────
  {
    id: 13,
    title: "A + B → C — Mixed Collision!",
    body: "Now the beaker has two particle types: blue A and red B.\n\nOnly A + B collisions react. A + A and B + B collisions do NOTHING.",
    mascotMood: "happy",
  },
  {
    id: 14,
    title: "Rate = k[A][B]",
    body: "The rate law is Rate = k[A][B] — the rate depends on BOTH concentrations.\n\nSince [A]₀ = [B]₀ = 0.70 M, [A] = [B] always, so Rate = k[A]² still holds mathematically.",
    mascotMood: "explaining",
  },
  {
    id: 15,
    title: "Watch A + B collide!",
    body: "Let's run the reaction! Watch how only blue-red collisions trigger a reaction.\n\nAs one species runs low, the reaction slows dramatically — rate depends on BOTH.",
    mascotMood: "happy",
  },
  {
    id: 16,
    title: "Try higher k",
    body: "Now let's double k — same A + A collision frequency, but more reactions succeed per collision.\n\nChoose A + A → B (×2k) from the dropdown!",
    mascotMood: "relaxed",
  },
  // ── A + A → B (×2k) (steps 17–20) ──────────────────────────────────
  {
    id: 17,
    title: "Higher k — More Successful Collisions!",
    body: "k = 0.286 M⁻¹s⁻¹ — double the baseline!\n\nt½ = 1/(0.286 × 0.70) = 5.00 s — particles react much faster.",
    mascotMood: "happy",
  },
  {
    id: 18,
    title: "Watch the faster reaction!",
    body: "Same particles, same beaker — but reactions succeed twice as often per collision.\n\n💡 k depends on temperature and activation energy, not particle density.",
    mascotMood: "happy",
  },
  {
    id: 19,
    title: "k vs concentration",
    body: "Compare:\n• A+A (k=0.143): t½ = 10.00 s\n• A+A (k=0.286): t½ = 5.00 s\n\nDoubling k halves the half-life. Same effect as doubling concentration — but changing k is physical chemistry (temperature/catalyst).",
    mascotMood: "explaining",
  },
  {
    id: 20,
    title: "You've mastered second-order!",
    body: "Key takeaways:\n• Rate = k[A]² or k[A][B] → steep hyperbolic decay\n• 1/[A] vs t is a straight line (slope = k)\n• t½ = 1/(k[A]₀) — depends on concentration\n• Only collisions between eligible species react\n\nReady to practice?",
    mascotMood: "happy",
  },
];
