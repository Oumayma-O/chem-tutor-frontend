/**
 * Static content for the Zero-Order Kinetics simulation.
 * Physics: [A]t = [A]₀ − k·t   |   Rate = k (constant)   |   t½ = [A]₀ / (2k)
 */

export interface Reaction {
  id: string;
  label: string;
  reactant: string;
  product: string;
  k: number;               // mol/L·s — fixed, not user-editable
  defaultConc: number;     // mol/L — fixed, not user-editable
  firstTutorialStep: number; // array index to jump to when this reaction is selected
  color: string;
  productColor: string;
  insight: string;
}

// Three reactions designed to isolate one variable each:
//   A→B  baseline  k=0.07, [A]₀=1.0
//   C→D  k effect  k=0.03, [A]₀=1.0  → shallower slope (same intercept)
//   E→F  [A]₀ eff  k=0.07, [A]₀=2.0  → same slope, higher intercept
export const REACTIONS: Reaction[] = [
  {
    id: "ab", label: "A → B", reactant: "A", product: "B",
    k: 0.07, defaultConc: 1.0, firstTutorialStep: 0,
    color: "#3b82f6", productColor: "#f43f5e",
    insight: "Baseline: k = 0.07 M/s, [A]₀ = 1.0 M",
  },
  {
    id: "cd", label: "C → D", reactant: "C", product: "D",
    k: 0.03, defaultConc: 1.0, firstTutorialStep: 8,
    color: "#ea580c", productColor: "#60a5fa",
    insight: "Same [C]₀ = 1.0 M, but k = 0.03 → shallower slope",
  },
  {
    id: "ef", label: "E → F", reactant: "E", product: "F",
    k: 0.07, defaultConc: 2.0, firstTutorialStep: 13,
    color: "#8b5cf6", productColor: "#10b981",
    insight: "Same k = 0.07, but [E]₀ = 2.0 M → higher intercept, same slope",
  },
];

export const INITIAL_CONC = REACTIONS[0].defaultConc;
export const MAX_TIME = 20;
export const TIME_STEP = 0.1;

export type TutorialMood = "default" | "happy" | "thinking" | "relaxed" | "explaining";

export interface TutorialStep {
  id: number;
  title: string;
  body: string;
  mascotMood: TutorialMood;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 0,
    title: "Welcome to Zero-Order Kinetics!",
    body: "This is a zero-order reaction where reactant A turns into product B.\n\nIn a zero-order reaction, the rate stays constant no matter how much A is left. Let's explore what that means!",
    mascotMood: "explaining",
  },
  {
    id: 1,
    title: "Explore the constants",
    body: "Open the Parameters menu above to see the fixed constants for this reaction:\n\nk = 0.07 mol·L⁻¹s⁻¹  |  [A]₀ = 1.0 M\n\nThese values are set — just explore and observe!",
    mascotMood: "thinking",
  },
  {
    id: 2,
    title: "Scrub through time",
    body: "Great! Now let's watch the reaction proceed.\n\nUse the time scrubber (◄ ►) below the line graph to fast-forward the reaction and see how [A] changes.",
    mascotMood: "thinking",
  },
  {
    id: 2,
    title: "The rate is constant",
    body: "The rate of this reaction does not depend on how much A is left — it's always equal to k.\n\nLook at the Rate Law equation below. No matter what time you scrub to, the rate stays the same!",
    mascotMood: "explaining",
  },
  {
    id: 3,
    title: "Half-life t½",
    body: "The half-life is the time it takes for exactly half of reactant A to disappear.\n\nLook at the half-life equation below — notice how t½ depends on your starting concentration [A]₀.",
    mascotMood: "relaxed",
  },
  {
    id: 4,
    title: "Watch the reaction!",
    body: "Sit back and watch as A converts into B in real time! The beaker, graph, and bar chart all update together.\n\nYou can hit Next to skip ahead if you'd like.",
    mascotMood: "happy",
  },
  {
    id: 5,
    title: "The perfectly straight line",
    body: "Notice how the [A] vs Time graph is a perfectly straight line — this constant downward slope is the hallmark of zero-order kinetics!\n\n[A]ₜ = −k · t + [A]₀  (slope = −k)",
    mascotMood: "explaining",
  },
  {
    id: 6,
    title: "Try a different reaction",
    body: "Now choose a different reaction from the dropdown at the top left.\n\nEach reaction has its own unique rate constant k — watch how the graph slope and half-life change!",
    mascotMood: "relaxed",
  },
  {
    id: 7,
    title: "Great pick — C → D!",
    body: "C → D has k = 0.03 M/s — half the speed of A → B — but the same starting concentration [C]₀ = 1.0 M.\n\nThis isolates k: watch how the graph line becomes shallower!",
    mascotMood: "happy",
  },
  {
    id: 8,
    title: "Adjust [C]₀ if you like",
    body: "The initial concentration [C]₀ is already set to 1.0 M — the same as A → B — so you can focus purely on how a smaller k affects the slope.\n\nOpen Parameters to explore further.",
    mascotMood: "thinking",
  },
  {
    id: 9,
    title: "Watch C → D animate",
    body: "Let's run the reaction! Notice the line drops more slowly than A → B — same intercept, shallower slope.\n\nThat's k controlling the rate of depletion. Hit Next to skip ahead.",
    mascotMood: "happy",
  },
  {
    id: 10,
    title: "Same intercept, shallower slope",
    body: "Both lines start at [X]₀ = 1.0 M, but C → D's slope (−0.03) is gentler than A → B's (−0.07).\n\n💡 k controls how steeply the line drops.",
    mascotMood: "explaining",
  },
  {
    id: 11,
    title: "Now change [A]₀ — try E → F",
    body: "E → F has the same k = 0.07 M/s as A → B, but starts at [E]₀ = 2.0 M instead of 1.0 M.\n\nChoose E → F from the dropdown — same slope, higher starting point!",
    mascotMood: "relaxed",
  },
  {
    id: 12,
    title: "Great pick — E → F!",
    body: "E → F keeps k = 0.07 M/s — identical to A → B — but starts at [E]₀ = 2.0 M.\n\nOpen Parameters to confirm the constants, then watch what changes on the graph.",
    mascotMood: "happy",
  },
  {
    id: 13,
    title: "Watch E → F animate",
    body: "Let's run this reaction! The line will drop at the exact same rate as A → B — but starting from 2.0 M.\n\nHit Next to skip ahead if you'd like.",
    mascotMood: "happy",
  },
  {
    id: 14,
    title: "Same slope, higher intercept!",
    body: "Both A → B and E → F have slope −0.07, but E → F's line sits higher on the graph.\n\n💡 [A]₀ shifts the line vertically — the intercept changes, the slope stays identical.",
    mascotMood: "explaining",
  },
];
