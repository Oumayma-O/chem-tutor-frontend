/**
 * Static content for the Comparing Reaction Orders simulation.
 *
 * Three parallel reactions all start at 1.00 M with k values
 * chosen so behaviour differences are obvious within 20 s.
 *
 * Zero:   A → P   [A]t = max(0, [A]₀ − k·t)       k = 0.070 mol·L⁻¹s⁻¹
 * First:  B → Q   [B]t = [B]₀·e^(−k·t)             k = 0.069 s⁻¹
 * Second: C → R   1/[C]t = 1/[C]₀ + k·t             k = 0.143 L·mol⁻¹s⁻¹
 */

export const MAX_TIME   = 20;   // seconds
export const TIME_STEP  = 0.1;  // seconds per tick
export const INITIAL_CONC = 1.00; // mol/L — same for all three

// ── Per-order constants ──────────────────────────────────────────────────────

export interface OrderConfig {
  label: string;          // "Zero-Order" | "First-Order" | "Second-Order"
  shortLabel: string;     // "Zero" | "First" | "Second"
  k: number;
  units: string;          // displayed after k value
  equation: string;       // integrated rate law (uses actual reactant letter)
  linearEq: string;       // linear form (uses actual reactant letter)
  halfLifeEq: string;     // (uses actual reactant letter)
  reactantColor: string;
  productColor: string;
  reactant: string;       // "A" | "B" | "C"
  product: string;        // "P" | "Q" | "R"
  graphShape: string;     // one-liner describing curve shape
}

export const ORDERS: OrderConfig[] = [
  {
    label: "Zero-Order",
    shortLabel: "Zero",
    k: 0.070,
    units: "mol·L⁻¹s⁻¹",
    equation: "[A]ₜ = [A]₀ − k·t",
    linearEq: "[A]ₜ vs t  →  straight line",
    halfLifeEq: "t½ = [A]₀ / (2k)",
    reactantColor: "#3b82f6",   // blue
    productColor:  "#f43f5e",   // rose
    reactant: "A",
    product:  "P",
    graphShape: "straight line (linear)",
  },
  {
    label: "First-Order",
    shortLabel: "First",
    k: 0.069,
    units: "s⁻¹",
    equation: "[B]ₜ = [B]₀·e^(−k·t)",
    linearEq: "ln[B]ₜ vs t  →  straight line",
    halfLifeEq: "t½ = ln(2) / k",
    reactantColor: "#10b981",   // emerald
    productColor:  "#8b5cf6",   // violet
    reactant: "B",
    product:  "Q",
    graphShape: "concave curve (exponential decay)",
  },
  {
    label: "Second-Order",
    shortLabel: "Second",
    k: 0.143,
    units: "L·mol⁻¹s⁻¹",
    equation: "1/[C]ₜ = 1/[C]₀ + k·t",
    linearEq: "1/[C]ₜ vs t  →  straight line",
    halfLifeEq: "t½ = 1 / (k·[C]₀)",
    reactantColor: "#f59e0b",   // amber
    productColor:  "#06b6d4",   // cyan
    reactant: "C",
    product:  "R",
    graphShape: "steep curve (hyperbolic decay)",
  },
];

// ── Tutorial ─────────────────────────────────────────────────────────────────

export type TutorialMood = "default" | "happy" | "thinking" | "relaxed" | "explaining";

export interface TutorialStep {
  id: number;
  title: string;
  body: string;
  mascotMood: TutorialMood;
  /** When true the charts are masked until the student guesses the order */
  chartsMasked?: boolean;
  /** When true the animation auto-plays */
  autoPlay?: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 0,
    title: "Three Reactions, Three Stories",
    body: "Three reactions run side by side — A→P, B→Q, and C→R — all starting at 1.00 M.\n\nEach follows a different kinetics order. Can you tell them apart just by watching the particles?",
    mascotMood: "explaining",
  },
  {
    id: 1,
    title: "Watch the Particles",
    body: "Hit ▶ Play to run all three beakers at once.\n\nWatch how quickly A, B, and C each disappear. The rate of disappearance — and whether it changes over time — is your first clue!",
    mascotMood: "thinking",
    autoPlay: true,
  },
  {
    id: 2,
    title: "Scrub Through Time",
    body: "Use the time scrubber to compare the beakers at any moment.\n\nAt t = 10 s: which of A, B, C has the most reactant remaining? Which has the least?",
    mascotMood: "relaxed",
  },
  {
    id: 3,
    title: "Reveal the Graphs!",
    body: "Great observations! Now see all three [concentration] vs time curves at once.\n\nThe shape of each curve — straight, curved gently, or curved sharply — is the fingerprint of each order.",
    mascotMood: "happy",
    autoPlay: true,
  },
  {
    id: 4,
    title: "The Zero-Order Line (A → P)",
    body: "The blue curve for A is perfectly straight.\n\n[A]ₜ = [A]₀ − k·t\n\nRate = k — constant no matter how much A remains. The slope never changes — a hallmark of zero-order.\n\n💡 Why? The rate is limited by the catalyst surface, not by concentration.",
    mascotMood: "explaining",
  },
  {
    id: 5,
    title: "The First-Order Curve (B → Q)",
    body: "The green curve for B bends — exponential decay.\n\n[B]ₜ = [B]₀·e^(−k·t)\n\nRate = k·[B]. As [B] drops, so does the rate. The curve flattens but never truly hits zero.\n\n💡 Why? Each particle reacts independently — the more particles present, the more reactions per second.",
    mascotMood: "explaining",
  },
  {
    id: 6,
    title: "The Second-Order Curve (C → R)",
    body: "The amber curve for C falls steeply at first, then crawls.\n\n[C]ₜ = 1 / (1/[C]₀ + k·t)\n\nRate = k·[C]². At high [C], collisions are frequent so the rate is large. As [C] drops, the rate falls much faster than first-order — proportional to concentration squared.\n\n💡 Why? The reaction requires two C particles to collide — making it exquisitely sensitive to concentration.",
    mascotMood: "explaining",
  },
  {
    id: 7,
    title: "Linear Plots: the Real Test",
    body: "The definitive test of reaction order is which linearised plot gives a straight line:\n\n• Zero:   [A] vs t → straight,   [A]ₜ = [A]₀ − k·t\n\n• First:  ln[B] vs t → straight,   ln[B]ₜ = ln[B]₀ − k·t\n\n• Second: 1/[C] vs t → straight,  1/[C]ₜ = 1/[C]₀ + k·t\n\nWhen you have an unknown reaction, try all three plots — whichever one gives a straight line reveals the order.",
    mascotMood: "thinking",
  },
  {
    id: 8,
    title: "Half-Lives Compared",
    body: "Each order has a different half-life behaviour:\n\n• Zero:   t½ = [A]₀/(2k) — each successive half takes less time than the previous one\n• First:  t½ = ln2/k — constant for B regardless of [B]\n• Second: t½ = 1/(k·[C]) — each successive half takes more time as [C] drops\n\nFirst-order (B→Q) is the only one with a constant half-life.",
    mascotMood: "relaxed",
  },
  {
    id: 9,
    title: "You've Got It!",
    body: "You can now identify any reaction order from:\n1. Graph shape — A: straight line / B: gentle curve / C: steep then flat\n2. Linear plot — which of [A], ln[B], or 1/[C] vs t is straight\n3. Half-life — shrinks (A) / constant (B) / grows (C)\n\nReady to practise identifying orders from data?",
    mascotMood: "happy",
  },
];
