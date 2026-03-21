/**
 * Static content for the Zero-Order Kinetics simulation.
 * Physics: [A]t = [A]₀ − k·t   |   Rate = k (constant)   |   t½ = [A]₀ / (2k)
 */

export interface Reaction {
  id: string;
  label: string;
  reactant: string;
  product: string;
  k: number;           // mol/L·s
  color: string;
  productColor: string;
}

export const REACTIONS: Reaction[] = [
  { id: "ab", label: "A → B", reactant: "A", product: "B", k: 0.07, color: "#3b82f6", productColor: "#f43f5e" },
  { id: "cd", label: "C → D", reactant: "C", product: "D", k: 0.04, color: "#ea580c", productColor: "#60a5fa" },
  { id: "ef", label: "E → F", reactant: "E", product: "F", k: 0.10, color: "#8b5cf6", productColor: "#10b981" },
];

// [A]₀ = 1.40 mol/L → t½ = 1.40/(2×0.07) = 10 s (matches legacy)
export const INITIAL_CONC = 1.40;
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
    title: "What is zero-order?",
    body: "In a zero-order reaction, the rate is constant — it does NOT depend on [A]. Doubling the concentration has zero effect on the rate.",
    mascotMood: "explaining",
  },
  {
    id: 1,
    title: "Watch the particles!",
    body: "Move the time slider ◄ ► to scrub through the reaction. Blue dots (reactant A) disappear as red dots (product B) appear.",
    mascotMood: "thinking",
  },
  {
    id: 2,
    title: "The linear graph",
    body: "[A] vs time is a straight line — that's the hallmark of zero-order kinetics. The slope equals −k.",
    mascotMood: "thinking",
  },
  {
    id: 3,
    title: "Half-life depends on [A]₀",
    body: "t½ = [A]₀ / (2k)\n\nUnlike 1st-order, the half-life changes when you change [A]₀. Try it with the stepper!",
    mascotMood: "relaxed",
  },
  {
    id: 4,
    title: "Amazing! Let's take a snapshot!",
    body: "Try changing the time indicator to scrub through the reaction time.",
    mascotMood: "happy",
  },
];
