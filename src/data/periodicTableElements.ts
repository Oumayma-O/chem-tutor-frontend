/**
 * Periodic table data for the tools widget. Layout and categories aligned with
 * IUPAC / Britannica-style "Interactive Periodic Table of the Elements".
 */
export type ElementCategory =
  | "alkali"
  | "alkaline"
  | "transition"
  | "post-transition"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble"
  | "lanthanide"
  | "actinide";

export interface PeriodicElement {
  symbol: string;
  number: number;
  category: ElementCategory;
  name: string;
  atomicMass: number;
}

// Symbols and categories for Z 1–118 (IUPAC)
const SYMBOLS_1_118 = [
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
  "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr",
  "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe",
  "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu",
  "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn",
  "Fr", "Ra", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr",
  "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og",
];

const CATEGORIES_1_118: ElementCategory[] = [
  "nonmetal", "noble", "alkali", "alkaline", "metalloid", "nonmetal", "nonmetal", "nonmetal", "halogen", "noble",
  "alkali", "alkaline", "post-transition", "metalloid", "nonmetal", "nonmetal", "halogen", "noble",
  "alkali", "alkaline", "transition", "transition", "transition", "transition", "transition", "transition", "transition", "transition", "transition", "transition",
  "post-transition", "metalloid", "metalloid", "nonmetal", "halogen", "noble",
  "alkali", "alkaline", "transition", "transition", "transition", "transition", "transition", "transition", "transition", "transition", "transition", "transition",
  "post-transition", "post-transition", "metalloid", "metalloid", "halogen", "noble",
  "alkali", "alkaline", "lanthanide", "lanthanide", "lanthanide", "lanthanide", "lanthanide", "lanthanide", "lanthanide", "lanthanide", "lanthanide", "lanthanide", "lanthanide", "lanthanide", "lanthanide", "lanthanide", "lanthanide",
  "transition", "transition", "transition", "transition", "transition", "transition", "transition", "transition", "transition", "transition",
  "post-transition", "post-transition", "post-transition", "metalloid", "halogen", "noble",
  "alkali", "alkaline", "actinide", "actinide", "actinide", "actinide", "actinide", "actinide", "actinide", "actinide", "actinide", "actinide", "actinide", "actinide", "actinide", "actinide", "actinide",
  "transition", "transition", "transition", "transition", "transition", "transition", "transition", "transition", "transition", "transition",
  "post-transition", "post-transition", "post-transition", "metalloid", "halogen", "noble",
];

const NAMES_1_118: string[] = [
  "Hydrogen","Helium","Lithium","Beryllium","Boron","Carbon","Nitrogen","Oxygen","Fluorine","Neon",
  "Sodium","Magnesium","Aluminum","Silicon","Phosphorus","Sulfur","Chlorine","Argon",
  "Potassium","Calcium","Scandium","Titanium","Vanadium","Chromium","Manganese","Iron","Cobalt","Nickel","Copper","Zinc",
  "Gallium","Germanium","Arsenic","Selenium","Bromine","Krypton",
  "Rubidium","Strontium","Yttrium","Zirconium","Niobium","Molybdenum","Technetium","Ruthenium","Rhodium","Palladium","Silver","Cadmium",
  "Indium","Tin","Antimony","Tellurium","Iodine","Xenon",
  "Cesium","Barium","Lanthanum","Cerium","Praseodymium","Neodymium","Promethium","Samarium","Europium","Gadolinium","Terbium","Dysprosium","Holmium","Erbium","Thulium","Ytterbium","Lutetium",
  "Hafnium","Tantalum","Tungsten","Rhenium","Osmium","Iridium","Platinum","Gold","Mercury","Thallium","Lead","Bismuth","Polonium","Astatine","Radon",
  "Francium","Radium","Actinium","Thorium","Protactinium","Uranium","Neptunium","Plutonium","Americium","Curium","Berkelium","Californium","Einsteinium","Fermium","Mendelevium","Nobelium","Lawrencium",
  "Rutherfordium","Dubnium","Seaborgium","Bohrium","Hassium","Meitnerium","Darmstadtium","Roentgenium","Copernicium","Nihonium","Flerovium","Moscovium","Livermorium","Tennessine","Oganesson",
];

// Standard atomic weights (IUPAC). Radioactive/synthetic elements use most-stable-isotope mass number.
const MASSES_1_118: number[] = [
  1.008,4.003,6.941,9.012,10.811,12.011,14.007,15.999,18.998,20.180,
  22.990,24.305,26.982,28.086,30.974,32.065,35.453,39.948,
  39.098,40.078,44.956,47.867,50.942,51.996,54.938,55.845,58.933,58.693,63.546,65.380,
  69.723,72.630,74.922,78.971,79.904,83.798,
  85.468,87.620,88.906,91.224,92.906,95.950,98,101.070,102.906,106.420,107.868,112.411,
  114.818,118.710,121.760,127.600,126.904,131.293,
  132.905,137.327,138.905,140.116,140.908,144.242,145,150.360,151.964,157.250,158.925,162.500,164.930,167.259,168.934,173.054,174.967,
  178.490,180.948,183.840,186.207,190.230,192.217,195.084,196.967,200.592,204.383,207.200,208.980,209,210,222,
  223,226,227,232.038,231.036,238.029,237,244,243,247,247,251,252,257,258,259,266,
  267,268,271,270,277,278,281,282,285,286,289,290,293,294,294,
];

/** Reference-style colors: Alkali (orange-yellow), Alkaline-earth, Transition (purple-grey), Rare-earth (light blue), Actinoid (darker blue), Other metals, Metalloids, Halogens, Noble gases, Other nonmetals */
export const CATEGORY_COLORS: Record<ElementCategory, string> = {
  alkali: "bg-amber-300 dark:bg-amber-500/70",
  alkaline: "bg-amber-200 dark:bg-amber-400/50",
  transition: "bg-slate-300 dark:bg-slate-500/60",
  "post-transition": "bg-rose-200 dark:bg-rose-400/50",
  metalloid: "bg-lime-200 dark:bg-lime-500/50",
  nonmetal: "bg-orange-200 dark:bg-orange-400/50",
  halogen: "bg-emerald-400 dark:bg-emerald-500/70",
  noble: "bg-slate-100 dark:bg-slate-400/40",
  lanthanide: "bg-sky-200 dark:bg-sky-400/50",
  actinide: "bg-sky-400 dark:bg-sky-600/60",
};

export const CATEGORY_LABELS: Record<ElementCategory, string> = {
  alkali: "Alkali metal",
  alkaline: "Alkaline-earth metal",
  transition: "Transition metal",
  "post-transition": "Post-transition metal",
  metalloid: "Metalloid",
  nonmetal: "Other nonmetal",
  halogen: "Halogen",
  noble: "Noble gas",
  lanthanide: "Lanthanide",
  actinide: "Actinide",
};

export function getCategoryColor(category: ElementCategory): string {
  return CATEGORY_COLORS[category];
}

export function getElements(): PeriodicElement[] {
  return SYMBOLS_1_118.map((symbol, i) => ({
    symbol,
    number: i + 1,
    category: CATEGORIES_1_118[i] ?? "transition",
    name: NAMES_1_118[i] ?? symbol,
    atomicMass: MASSES_1_118[i] ?? 0,
  }));
}

export interface Cell {
  number: number;
  symbol: string;
  category: ElementCategory;
  name: string;
  atomicMass: number;
}

const byNumber = (): Map<number, Cell> => {
  const elements = getElements();
  return new Map(
    elements.map((e) => [e.number, { number: e.number, symbol: e.symbol, category: e.category, name: e.name, atomicMass: e.atomicMass }])
  );
};

/** Main table: 7 periods × 18 groups. One gap cell for lanthanides (57–71) and one for actinides (89–103). */
export const MAIN_GRID_LAYOUT: (number | null)[][] = [
  [1, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 2],
  [3, 4, null, null, null, null, null, null, null, null, null, null, 5, 6, 7, 8, 9, 10],
  [11, 12, null, null, null, null, null, null, null, null, null, null, 13, 14, 15, 16, 17, 18],
  [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
  [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],
  [55, 56, null, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86],
  [87, 88, null, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118],
];

/** Lanthanoid series: 57 (La) through 71 (Lu). */
export const LANTHANOID_Z: number[] = [57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];

/** Actinoid series: 89 (Ac) through 103 (Lr). */
export const ACTINOID_Z: number[] = [89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103];

export function getMainGrid(): (Cell | null)[][] {
  const map = byNumber();
  return MAIN_GRID_LAYOUT.map((row) =>
    row.map((z) => (z != null ? map.get(z) ?? null : null))
  );
}

export function getLanthanoidRow(): Cell[] {
  const map = byNumber();
  return LANTHANOID_Z.map((z) => map.get(z)!).filter(Boolean);
}

export function getActinoidRow(): Cell[] {
  const map = byNumber();
  return ACTINOID_Z.map((z) => map.get(z)!).filter(Boolean);
}
