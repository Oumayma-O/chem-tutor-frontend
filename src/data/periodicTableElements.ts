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

export function getCategoryColor(category: ElementCategory): string {
  return CATEGORY_COLORS[category];
}

export function getElements(): PeriodicElement[] {
  return SYMBOLS_1_118.map((symbol, i) => ({
    symbol,
    number: i + 1,
    category: CATEGORIES_1_118[i] ?? "transition",
  }));
}

export interface Cell {
  number: number;
  symbol: string;
  category: ElementCategory;
}

const byNumber = (): Map<number, Cell> => {
  const elements = getElements();
  return new Map(
    elements.map((e) => [e.number, { number: e.number, symbol: e.symbol, category: e.category }])
  );
};

/** Main table: 7 periods × 18 groups. One gap cell for lanthanides (57–71) and one for actinides (89–103). */
export const MAIN_GRID_LAYOUT: (number | null)[][] = [
  [1, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 2],
  [3, 4, 5, 6, 7, 8, 9, 10, null, null, null, null, null, null, null, null, null, null],
  [11, 12, 13, 14, 15, 16, 17, 18, null, null, null, null, null, null, null, null, null, null],
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
