/**
 * Static content for the Second-Order Kinetics simulation.
 * Physics: [A]t = 1 / (k·t + 1/[A]₀)   |   Rate = k·[A]²   |   t½ = 1/(k·[A]₀)
 *
 * Key insight: unlike first-order, the half-life depends on [A]₀!
 */

export interface Reaction {
  id: string;
  label: string;
  reactant: string;
  product: string;
  k: number;           // M⁻¹·s⁻¹
  defaultConc: number; // mol/L
  firstTutorialStep: number;
  color: string;
  productColor: string;
  insight: string;
}

// Three reactions isolating one variable each:
//   A→B  baseline  k=0.143, [A]₀=0.70  → t½ = 1/(0.143×0.70) = 10.00 s
//   C→D  k effect  k=0.071, [A]₀=0.70  → slower, longer t½ ≈ 20.11 s
//   E→F  [A]₀ eff  k=0.143, [A]₀=1.40  → higher conc → SHORTER t½ = 5.00 s (!)
export const REACTIONS: Reaction[] = [
  {
    id: "ab", label: "A → B", reactant: "A", product: "B",
    k: 0.143, defaultConc: 0.70, firstTutorialStep: 0,
    color: "#3b82f6", productColor: "#f43f5e",
    insight: "Baseline: k = 0.143 M⁻¹s⁻¹, [A]₀ = 0.70 M, t½ = 10.00 s",
  },
  {
    id: "cd", label: "C → D", reactant: "C", product: "D",
    k: 0.071, defaultConc: 0.70, firstTutorialStep: 13,
    color: "#ea580c", productColor: "#60a5fa",
    insight: "Same [C]₀ = 0.70 M, but k = 0.071 → slower, t½ ≈ 20.11 s",
  },
  {
    id: "ef", label: "E → F", reactant: "E", product: "F",
    k: 0.143, defaultConc: 1.40, firstTutorialStep: 17,
    color: "#8b5cf6", productColor: "#10b981",
    insight: "Same k = 0.143, but [E]₀ = 1.40 M → t½ = 5.00 s (shorter!)",
  },
];

export const INITIAL_CONC = REACTIONS[0].defaultConc;
export const MAX_TIME     = 60;   // s
export const TIME_STEP    = 0.5;

export type TutorialMood = "default" | "happy" | "thinking" | "relaxed" | "explaining";

export interface TutorialStep {
  id: number;
  title: string;
  body: string;
  mascotMood: TutorialMood;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  // ── A → B (steps 0–12) ──────────────────────────────────────────────
  {
    id: 0,
    title: "Welcome to Second-Order Kinetics!",
    body: "This is a second-order reaction where reactant A turns into product B.\n\nWhy don't you set the initial concentration of A, [A]₀, using the Parameters menu above?",
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
    body: "For this reaction, k = 0.143 M⁻¹s⁻¹.\n\nNotice the units are different from first-order (s⁻¹) — the order changes the units of k!",
    mascotMood: "explaining",
  },
  {
    id: 3,
    title: "The rate equation",
    body: "For a reaction with one reactant it's usually written as Rate = k[A]^order.\n\nFor this second-order reaction: Rate = k[A]².",
    mascotMood: "thinking",
  },
  {
    id: 4,
    title: "Half-life t½",
    body: "Half-life is the time at which [A] is exactly half of [A]₀.\n\nFor second-order reactions: t½ = 1/(k[A]₀) = 10.00 s.\n\n💡 Unlike first-order, t½ depends on [A]₀ — it gets shorter as concentration increases!",
    mascotMood: "relaxed",
  },
  {
    id: 5,
    title: "A steeper curve",
    body: "For this second-order reaction, Rate = k[A]². That's why a graph of [A] vs t is a steeper curve — the rate is proportional to the concentration of A squared.",
    mascotMood: "explaining",
  },
  {
    id: 6,
    title: "Fast at first",
    body: "Notice how [A] drops a lot faster at the beginning because there's more A present, making the rate much higher (more collisions!).",
    mascotMood: "happy",
  },
  {
    id: 7,
    title: "Slower towards the end",
    body: "Subsequently, towards the end of the reaction, there's much less [A] present, so the rate of the reaction is a lot lower, making [A] drop significantly slower.",
    mascotMood: "explaining",
  },
  {
    id: 8,
    title: "A quantitative look",
    body: "If [A] = 0.9, then [A]² = 0.81. And if [A] = 0.8, then [A]² = 0.64.\n\nDropping [A] by 0.1 makes a first-order reaction drop its rate by 0.1, but a second-order reaction drops its rate by 0.17.",
    mascotMood: "thinking",
  },
  {
    id: 9,
    title: "Rate comparison",
    body: "Since 0.1 < 0.17, the rate drops more drastically for a second-order reaction at first, and slowly reduces to a point where it drops slower than a first-order reaction towards the end.",
    mascotMood: "explaining",
  },
  {
    id: 10,
    title: "The integrated rate law",
    body: "For this second-order reaction, the integrated rate law is:\n\nk = (1/[A]t − 1/[A]₀) / t\n\nThat's why a graph of 1/[A] vs t is a straight line — slope is k, intercept is 1/[A]₀.",
    mascotMood: "thinking",
  },
  {
    id: 11,
    title: "Watch the reaction!",
    body: "Amazing! Let's watch how all the molecules are changing! As A disappears, B is produced based on collision probability.\n\nTry changing the time indicator to scrub through the reaction.",
    mascotMood: "happy",
  },
  {
    id: 12,
    title: "Try a different reaction",
    body: "Now, let's try choosing a different reaction.\n\nChoose one from the dropdown above!",
    mascotMood: "relaxed",
  },
  // ── C → D (steps 13–16) ─────────────────────────────────────────────
  {
    id: 13,
    title: "Great pick — C → D!",
    body: "C → D has k = 0.071 M⁻¹s⁻¹ — half the speed of A → B — same [C]₀ = 0.70 M.\n\nt½ = 1/(0.071×0.70) ≈ 20.11 s — twice as long as A → B!",
    mascotMood: "happy",
  },
  {
    id: 14,
    title: "Shallower curve, same start",
    body: "Both reactions start at 0.70 M, but C → D drops more slowly.\n\nThe 1/[A] vs Time graph stays a straight line — just a shallower slope (slope = k).",
    mascotMood: "explaining",
  },
  {
    id: 15,
    title: "Watch C → D animate",
    body: "Let's run the reaction! Compare the curve with A → B — same starting point, slower descent.\n\n💡 k controls both the curve steepness and the half-life.",
    mascotMood: "happy",
  },
  {
    id: 16,
    title: "Now try E → F",
    body: "E → F keeps k = 0.143 M⁻¹s⁻¹ — identical to A → B — but starts at [E]₀ = 1.40 M.\n\nHigher concentration → shorter half-life! Choose E → F to see.",
    mascotMood: "relaxed",
  },
  // ── E → F (steps 17–20) ─────────────────────────────────────────────
  {
    id: 17,
    title: "Great pick — E → F!",
    body: "E → F keeps k = 0.143 M⁻¹s⁻¹ but starts at [E]₀ = 1.40 M.\n\nt½ = 1/(0.143×1.40) = 5.00 s — much shorter than A → B's 10.00 s!",
    mascotMood: "happy",
  },
  {
    id: 18,
    title: "Watch E → F animate",
    body: "The higher starting concentration makes the rate sky-rocket at t = 0 — then slow dramatically.\n\nThis is the unique signature of second-order kinetics: t½ decreases as [A]₀ increases.",
    mascotMood: "happy",
  },
  {
    id: 19,
    title: "1/[A] line shifts down",
    body: "On the 1/[A] vs Time chart, E → F's line starts lower (1/1.40 ≈ 0.71 vs 1/0.70 ≈ 1.43) but has the same slope k.\n\nLower intercept, same steepness — confirms same k.",
    mascotMood: "explaining",
  },
  {
    id: 20,
    title: "You've mastered second-order!",
    body: "Key takeaways:\n• Rate = k[A]² → steeper hyperbolic decay\n• 1/[A] vs t is always a straight line (slope = k)\n• t½ = 1/(k[A]₀) — depends on concentration!\n\nReady to practice?",
    mascotMood: "happy",
  },
];
