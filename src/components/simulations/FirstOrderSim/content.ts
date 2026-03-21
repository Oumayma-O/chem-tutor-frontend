/**
 * Static content for the First-Order Kinetics simulation.
 * Physics: [A]t = [A]₀ · e^(−kt)   |   Rate = k·[A]   |   t½ = ln(2)/k
 */

export interface Reaction {
  id: string;
  label: string;
  reactant: string;
  product: string;
  k: number;           // s⁻¹
  defaultConc: number; // mol/L
  firstTutorialStep: number;
  color: string;
  productColor: string;
  insight: string;
}

// Three reactions designed to isolate one variable each:
//   A→B  baseline  k=0.069, [A]₀=0.70  (t½ ≈ 10.05 s)
//   C→D  k effect  k=0.035, [A]₀=0.70  → shallower curve, same intercept
//   E→F  [A]₀ eff  k=0.069, [A]₀=1.40  → same shape, higher intercept
export const REACTIONS: Reaction[] = [
  {
    id: "ab", label: "A → B", reactant: "A", product: "B",
    k: 0.069, defaultConc: 0.70, firstTutorialStep: 0,
    color: "#3b82f6", productColor: "#f43f5e",
    insight: "Baseline: k = 0.069 s⁻¹, [A]₀ = 0.70 M",
  },
  {
    id: "cd", label: "C → D", reactant: "C", product: "D",
    k: 0.035, defaultConc: 0.70, firstTutorialStep: 12,
    color: "#ea580c", productColor: "#60a5fa",
    insight: "Same [C]₀ = 0.70 M, but k = 0.035 s⁻¹ → shallower curve",
  },
  {
    id: "ef", label: "E → F", reactant: "E", product: "F",
    k: 0.069, defaultConc: 1.40, firstTutorialStep: 17,
    color: "#8b5cf6", productColor: "#10b981",
    insight: "Same k = 0.069 s⁻¹, but [E]₀ = 1.40 M → higher intercept, same shape",
  },
];

export const INITIAL_CONC = REACTIONS[0].defaultConc;
export const MAX_TIME     = 60;   // s  (A → almost 0 by t=60 with k=0.069)
export const TIME_STEP    = 0.5;

export type TutorialMood = "default" | "happy" | "thinking" | "relaxed" | "explaining";

export interface TutorialStep {
  id: number;
  title: string;
  body: string;
  mascotMood: TutorialMood;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  // ── A → B (steps 0–11) ──────────────────────────────────────────────
  {
    id: 0,
    title: "Welcome to First-Order Kinetics!",
    body: "This is a first-order reaction where reactant A turns into product B.\n\nWhy don't you set the initial concentration of A, [A]₀, using the Parameters menu above?",
    mascotMood: "explaining",
  },
  {
    id: 1,
    title: "Set the time range",
    body: "Great! Now you can set the concentration of A at the end of the reaction [A]t and the time the reaction will last (t).\n\nUse the time scrubber below the graph to explore.",
    mascotMood: "thinking",
  },
  {
    id: 2,
    title: "The rate constant k",
    body: "The rate constant k is a value on which the rate depends. This dependency is often represented with the rate law or the rate equation.",
    mascotMood: "explaining",
  },
  {
    id: 3,
    title: "Rate laws",
    body: "Rate laws describe the relationship between reaction rate and reactant concentration.\n\nFor this reaction, k = 0.069 s⁻¹.",
    mascotMood: "thinking",
  },
  {
    id: 4,
    title: "The rate equation",
    body: "For a reaction with one reactant it's usually written as Rate = k[A]^order.\n\nFor this first-order reaction: Rate = k[A]¹.",
    mascotMood: "explaining",
  },
  {
    id: 5,
    title: "Half-life t½",
    body: "Half-life is the time at which [A] is exactly half of [A]₀.\n\nFor first-order reactions: t½ = ln(2)/k = 10.05 s.\n\n💡 Notice: t½ is independent of [A]₀ — a key feature of first-order kinetics!",
    mascotMood: "relaxed",
  },
  {
    id: 6,
    title: "Comparing to zero-order",
    body: "For the previous zero-order reaction, rate was constant because it was independent of [A], since Rate = k[A]⁰ is equivalent to Rate = k.",
    mascotMood: "thinking",
  },
  {
    id: 7,
    title: "Why the curve?",
    body: "For this first-order reaction, Rate = k[A]¹. That's why a graph of [A] vs t is a curve — the rate is proportional to concentration of A.",
    mascotMood: "explaining",
  },
  {
    id: 8,
    title: "Fast at first, slow later",
    body: "[A] drops faster at the beginning because there's more A present, making the rate higher. Towards the end there's much less [A], so the rate is lower and [A] drops slower.",
    mascotMood: "happy",
  },
  {
    id: 9,
    title: "Integrated rate law",
    body: "When we integrate the rate law we get the integrated rate law — a simpler form for calculations and graphs.\n\nln[A]t = ln[A]₀ − k·t",
    mascotMood: "explaining",
  },
  {
    id: 10,
    title: "Watch the reaction!",
    body: "Let's watch all the molecules change! As A disappears, B is produced.\n\nTry changing the time indicator to scrub through the reaction.",
    mascotMood: "happy",
  },
  {
    id: 11,
    title: "Try a different reaction",
    body: "Now let's choose a different reaction with a fixed rate constant k.\n\nChoose a reaction from the dropdown above!",
    mascotMood: "relaxed",
  },
  // ── C → D (steps 12–16) ─────────────────────────────────────────────
  {
    id: 12,
    title: "Great pick — C → D!",
    body: "C → D has k = 0.035 s⁻¹ — half the speed of A → B — same [C]₀ = 0.70 M.\n\nThis isolates k: watch how the curve drops more slowly!",
    mascotMood: "happy",
  },
  {
    id: 13,
    title: "Shallower curve, same t = 0 point",
    body: "Both reactions start at 0.70 M, but C → D's curve is shallower — and t½ = ln(2)/0.035 ≈ 20.1 s (twice as long).\n\nThe ln[A] vs Time graph stays a straight line — just a gentler slope.",
    mascotMood: "explaining",
  },
  {
    id: 14,
    title: "Watch C → D animate",
    body: "Let's run the reaction! Compare the curve with A → B. Same starting point, slower descent.\n\n💡 k controls both the curve steepness and the half-life.",
    mascotMood: "happy",
  },
  {
    id: 15,
    title: "Compare the ln[A] graphs",
    body: "Look at the ln[A] vs Time chart — both A → B and C → D are straight lines, but C → D has a shallower negative slope.\n\nSlope = −k. Smaller k → shallower slope.",
    mascotMood: "explaining",
  },
  {
    id: 16,
    title: "Now try E → F",
    body: "E → F has the same k = 0.069 s⁻¹ as A → B, but starts at [E]₀ = 1.40 M.\n\nChoose E → F — same curve shape, higher starting point!",
    mascotMood: "relaxed",
  },
  // ── E → F (steps 17–21) ─────────────────────────────────────────────
  {
    id: 17,
    title: "Great pick — E → F!",
    body: "E → F keeps k = 0.069 s⁻¹ — identical to A → B — but starts at [E]₀ = 1.40 M.\n\nOpen Parameters to confirm, then watch what changes on the graph.",
    mascotMood: "happy",
  },
  {
    id: 18,
    title: "Watch E → F animate",
    body: "The curve drops at the same rate as A → B — but from a higher starting point.\n\nt½ is still 10.05 s — first-order half-life is independent of [A]₀!",
    mascotMood: "happy",
  },
  {
    id: 19,
    title: "Same shape, higher intercept",
    body: "A → B and E → F have the same exponential shape, but E → F's curve sits higher.\n\n💡 [A]₀ shifts the curve vertically — it does not change the half-life or slope.",
    mascotMood: "explaining",
  },
  {
    id: 20,
    title: "The ln[A] line shifts up",
    body: "On the ln[A] vs Time chart, E → F's line is parallel to A → B but shifted upward by ln(1.40/0.70) = ln(2) ≈ 0.69.\n\nSame slope (−k), different intercept (ln[A]₀).",
    mascotMood: "explaining",
  },
  {
    id: 21,
    title: "You've mastered first-order!",
    body: "Key takeaways:\n• Rate = k[A]¹ → exponential decay\n• ln[A] vs t is always a straight line (slope = −k)\n• t½ = ln(2)/k — independent of concentration\n\nReady to practice?",
    mascotMood: "happy",
  },
];
