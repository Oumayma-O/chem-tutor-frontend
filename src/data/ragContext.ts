/**
 * RAG Context — retrieval-augmented data passed to AI edge functions
 * to ground generated content in standards, skills, and pedagogy.
 */

// ──────────────────────────────────────────────
// Interest-to-narrative mapping
// ──────────────────────────────────────────────
export const INTEREST_MAPPINGS: Record<string, { label: string; narratives: Record<string, string> }> = {
  sports: {
    label: "Sports & Athletics",
    narratives: {
      "kinetics": "reaction rates in muscle metabolism during athletic performance",
      "atomic-structure": "how atomic composition of materials affects sports equipment design",
      "stoichiometry": "energy balance and fuel ratios for athletic nutrition",
      "thermodynamics": "heat transfer and body temperature regulation during exercise",
      "equilibrium": "oxygen–hemoglobin equilibrium during high-altitude training",
      "acids-bases": "lactic acid buildup and buffering in muscles during intense exercise",
    },
  },
  food: {
    label: "Food & Cooking",
    narratives: {
      "kinetics": "how temperature and enzymes control cooking and fermentation rates",
      "atomic-structure": "mineral composition in dietary nutrients and supplements",
      "stoichiometry": "recipe scaling and ingredient ratios as mole conversions",
      "thermodynamics": "calorimetry of food energy and heat transfer in baking",
      "equilibrium": "CO₂ equilibrium in carbonated beverages",
      "acids-bases": "pH control in sourdough fermentation and pickling",
    },
  },
  music: {
    label: "Music & Sound",
    narratives: {
      "kinetics": "vibrational frequency decay as a kinetics analogy",
      "atomic-structure": "how atomic structure of metals affects instrument tone quality",
      "stoichiometry": "proportional mixing ratios for synthesizer waveforms as mole analogies",
      "thermodynamics": "energy transformations in speakers and amplifiers",
      "equilibrium": "resonance equilibrium in acoustic chambers",
      "acids-bases": "corrosion protection of brass instruments via pH management",
    },
  },
  tech: {
    label: "Technology & Gaming",
    narratives: {
      "kinetics": "reaction rates in battery chemistry and semiconductor fabrication",
      "atomic-structure": "silicon doping and electron orbital behavior in microchips",
      "stoichiometry": "precise reagent ratios in circuit board etching",
      "thermodynamics": "heat dissipation in gaming GPUs and thermal paste efficiency",
      "equilibrium": "chemical equilibrium in lithium-ion battery cycling",
      "acids-bases": "electrolyte pH balance in fuel cells and batteries",
    },
  },
  art: {
    label: "Art & Design",
    narratives: {
      "kinetics": "pigment fading rates and paint drying kinetics",
      "atomic-structure": "how transition metal electron configurations create paint colors",
      "stoichiometry": "mixing ratios for glazes and ceramic formulations",
      "thermodynamics": "kiln firing temperatures and energy in ceramics",
      "equilibrium": "dye absorption equilibrium on fabrics",
      "acids-bases": "pH-sensitive natural dyes and indicator art",
    },
  },
  nature: {
    label: "Nature & Environment",
    narratives: {
      "kinetics": "decomposition rates of organic matter in ecosystems",
      "atomic-structure": "isotope ratios used in carbon dating and geology",
      "stoichiometry": "photosynthesis reactant and product ratios",
      "thermodynamics": "energy flow in food chains and geothermal systems",
      "equilibrium": "ocean carbonate equilibrium and coral reef health",
      "acids-bases": "acid rain formation and soil pH effects on plant growth",
    },
  },
};

// ──────────────────────────────────────────────
// Standards per unit
// ──────────────────────────────────────────────
export interface StandardRef {
  code: string;
  description: string;
}

export const UNIT_STANDARDS: Record<string, StandardRef[]> = {
  "kinetics": [
    { code: "NGSS HS-PS1-5", description: "Apply scientific principles and evidence to provide an explanation about the effects of changing the temperature or concentration of the reacting particles on the rate at which a reaction occurs." },
    { code: "AP Chem 4.A", description: "The student can construct an explanation about the factors that influence reaction rates." },
  ],
  "atomic-structure": [
    { code: "NGSS MS-PS1-1", description: "Develop models to describe the atomic composition of simple molecules and extended structures." },
    { code: "NGSS HS-PS1-1", description: "Use the periodic table as a model to predict the relative properties of elements based on the patterns of electrons in the outermost energy level of atoms." },
  ],
  "stoichiometry": [
    { code: "NGSS HS-PS1-7", description: "Use mathematical representations to support the claim that atoms, and therefore mass, are conserved during a chemical reaction." },
  ],
  "thermodynamics": [
    { code: "NGSS HS-PS3-1", description: "Create a computational model to calculate the change in the energy of one component in a system when the change in energy of the other component(s) and energy flows in and out of the system are known." },
  ],
  "equilibrium": [
    { code: "NGSS HS-PS1-6", description: "Refine the design of a chemical system by specifying a change in conditions that would produce increased amounts of products at equilibrium." },
  ],
  "acids-bases": [
    { code: "NGSS HS-PS1-2", description: "Construct and revise an explanation for the outcome of a simple chemical reaction based on the outermost electron states of atoms, trends in the periodic table, and knowledge of the patterns of chemical properties." },
  ],
};

// ──────────────────────────────────────────────
// Skill definitions per lesson
// ──────────────────────────────────────────────
export interface SkillDef {
  name: string;
  description: string;
  assessedBy: string;
}

export const LESSON_SKILLS: Record<string, SkillDef[]> = {
  "kinetics": [
    { name: "Rate Law Selection", description: "Identify and write the correct integrated rate law for 0th, 1st, or 2nd order reactions.", assessedBy: "Step 1 — Equation selection" },
    { name: "Variable Identification", description: "Extract and organize given variables ([A]₀, k, t) from a word problem.", assessedBy: "Step 2 — Knowns identification" },
    { name: "Substitution", description: "Correctly substitute numerical values into the integrated rate law.", assessedBy: "Step 3 — Substitution step" },
    { name: "Calculation", description: "Perform arithmetic operations (multiplication, subtraction, division, logarithms) accurately.", assessedBy: "Step 4 — Calculation step" },
    { name: "Units & Final Answer", description: "Express the result with correct units (M, s, M/s, 1/M·s).", assessedBy: "Step 5 — Answer with units" },
  ],
  "atomic-structure": [
    { name: "Model Identification", description: "Distinguish between Bohr, quantum, and shell models of the atom.", assessedBy: "Conceptual questions" },
    { name: "Electron Configuration", description: "Write electron configurations using Aufbau principle, Hund's rule, and Pauli exclusion.", assessedBy: "Configuration notation" },
    { name: "Periodic Trends", description: "Predict atomic radius, ionization energy, and electronegativity trends.", assessedBy: "Trend comparison" },
  ],
};

// ──────────────────────────────────────────────
// Few-shot example problems (for RAG grounding)
// ──────────────────────────────────────────────
export interface FewShotExample {
  type: "worked" | "faded" | "practice";
  topic: string;
  problem: {
    title: string;
    description: string;
    steps: { stepNumber: number; label: string; instruction: string; content?: string; correctAnswer?: string; hint?: string }[];
  };
}

export const FEW_SHOT_EXAMPLES: FewShotExample[] = [
  {
    type: "worked",
    topic: "Zero-Order Kinetics",
    problem: {
      title: "Zero-Order Reaction Kinetics",
      description: "The decomposition of compound X follows zero-order kinetics with k = 0.020 M/s. Initial concentration [A]₀ = 0.80 M. Find [A] after 20 s.",
      steps: [
        { stepNumber: 1, label: "Equation", instruction: "Select the correct rate law:", content: "[A]ₜ = [A]₀ − k·t" },
        { stepNumber: 2, label: "Knowns", instruction: "Identify known variables:", content: "[A]₀ = 0.80 M\nk = 0.020 M/s\nt = 20 s" },
        { stepNumber: 3, label: "Substitute", instruction: "Plug values into the equation:", content: "[A]ₜ = 0.80 − (0.020)(20)" },
        { stepNumber: 4, label: "Calculate", instruction: "Compute the product:", content: "(0.020)(20) = 0.40" },
        { stepNumber: 5, label: "Answer", instruction: "Final answer with units:", content: "[A]ₜ = 0.80 − 0.40 = 0.40 M" },
      ],
    },
  },
  {
    type: "faded",
    topic: "Zero-Order Kinetics",
    problem: {
      title: "Zero-Order Reaction Kinetics",
      description: "The decomposition of compound Y follows zero-order kinetics with k = 0.015 M/s. Initial concentration [A]₀ = 0.60 M. Find [A] after 10 s.",
      steps: [
        { stepNumber: 1, label: "Equation", instruction: "Select the correct rate law:", content: "[A]ₜ = [A]₀ − k·t" },
        { stepNumber: 2, label: "Knowns", instruction: "Identify known variables:", content: "[A]₀ = 0.60 M\nk = 0.015 M/s\nt = 10 s" },
        { stepNumber: 3, label: "Substitute", instruction: "Multiply k × t:", correctAnswer: "0.15", hint: "Multiply 0.015 × 10." },
        { stepNumber: 4, label: "Calculate", instruction: "Subtract from [A]₀:", correctAnswer: "0.45", hint: "What's 0.60 − 0.15?" },
        { stepNumber: 5, label: "Answer", instruction: "Final concentration with units:", correctAnswer: "0.45 M", hint: "Include the molarity unit." },
      ],
    },
  },
];

// ──────────────────────────────────────────────
// Key equations per unit
// ──────────────────────────────────────────────
export const KEY_EQUATIONS: Record<string, string[]> = {
  "kinetics": [
    "Zero-order: [A]ₜ = [A]₀ − k·t  |  t₁/₂ = [A]₀ / (2k)",
    "First-order: ln[A]ₜ = ln[A]₀ − k·t  |  t₁/₂ = 0.693 / k",
    "Second-order: 1/[A]ₜ = 1/[A]₀ + k·t  |  t₁/₂ = 1 / (k·[A]₀)",
    "Rate = k·[A]ⁿ  (n = reaction order)",
  ],
  "atomic-structure": [
    "E = −13.6 eV / n²  (Bohr model energy levels)",
    "λ = h / (m·v)  (de Broglie wavelength)",
    "ΔE = hν  (photon energy for electron transitions)",
  ],
};

// ──────────────────────────────────────────────
// Helper: build RAG context payload for a request
// ──────────────────────────────────────────────
export function buildRagContext(unitId: string, lessonName?: string) {
  const standards = UNIT_STANDARDS[unitId] || [];
  const skills = LESSON_SKILLS[unitId] || [];
  const equations = KEY_EQUATIONS[unitId] || [];
  const examples = FEW_SHOT_EXAMPLES.filter(
    (ex) => !lessonName || ex.topic.toLowerCase().includes(lessonName.toLowerCase().split(" ")[0])
  );

  return {
    standards: standards.map((s) => `${s.code}: ${s.description}`),
    skills: skills.map((s) => `${s.name} — ${s.description} (assessed by: ${s.assessedBy})`),
    equations,
    examples: examples.map((ex) => ({
      type: ex.type,
      title: ex.problem.title,
      description: ex.problem.description,
      steps: ex.problem.steps,
    })),
  };
}

/**
 * Get interest narrative for a unit
 */
export function getInterestNarrative(interests: string[], unitId: string): string {
  const narratives: string[] = [];
  for (const interest of interests) {
    const mapping = INTEREST_MAPPINGS[interest];
    if (mapping?.narratives[unitId]) {
      narratives.push(mapping.narratives[unitId]);
    }
  }
  return narratives.length > 0
    ? `Adapt the narrative to connect with the student's interests: ${narratives.join("; ")}.`
    : "";
}
