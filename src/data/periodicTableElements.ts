// Minimal periodic table data for the tools panel. Category matches UI legend.
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

// Elements 1–56 (H–Ba) + 57–71 (La–Lu) + 72–86 (Hf–Rn) for main table + lanthanides
const CATEGORIES: ElementCategory[] = [
  "nonmetal",     // 1 H
  "noble",        // 2 He
  "alkali",       // 3 Li
  "alkaline",     // 4 Be
  "metalloid",    // 5 B
  "nonmetal",     // 6 C
  "nonmetal",     // 7 N
  "nonmetal",     // 8 O
  "halogen",      // 9 F
  "noble",        // 10 Ne
  "alkali",       // 11 Na
  "alkaline",     // 12 Mg
  "post-transition", // 13 Al
  "metalloid",    // 14 Si
  "nonmetal",     // 15 P
  "nonmetal",     // 16 S
  "halogen",      // 17 Cl
  "noble",        // 18 Ar
  "alkali",       // 19 K
  "alkaline",     // 20 Ca
  "transition",   // 21 Sc
  "transition",   // 22 Ti
  "transition",   // 23 V
  "transition",   // 24 Cr
  "transition",   // 25 Mn
  "transition",   // 26 Fe
  "transition",   // 27 Co
  "transition",   // 28 Ni
  "transition",   // 29 Cu
  "transition",   // 30 Zn
  "post-transition", // 31 Ga
  "metalloid",    // 32 Ge
  "metalloid",    // 33 As
  "nonmetal",     // 34 Se
  "halogen",      // 35 Br
  "noble",        // 36 Kr
  "alkali",       // 37 Rb
  "alkaline",     // 38 Sr
  "transition",   // 39 Y
  "transition",   // 40 Zr
  "transition",   // 41 Nb
  "transition",   // 42 Mo
  "transition",   // 43 Tc
  "transition",   // 44 Ru
  "transition",   // 45 Rh
  "transition",   // 46 Pd
  "transition",   // 47 Ag
  "transition",   // 48 Cd
  "post-transition", // 49 In
  "post-transition", // 50 Sn
  "metalloid",    // 51 Sb
  "metalloid",    // 52 Te
  "halogen",      // 53 I
  "noble",        // 54 Xe
  "alkali",       // 55 Cs
  "alkaline",     // 56 Ba
  "lanthanide",  // 57 La
  "lanthanide",  // 58 Ce
  "lanthanide",  // 59 Pr
  "lanthanide",  // 60 Nd
  "lanthanide",  // 61 Pm
  "lanthanide",  // 62 Sm
  "lanthanide",  // 63 Eu
  "lanthanide",  // 64 Gd
  "lanthanide",  // 65 Tb
  "lanthanide",  // 66 Dy
  "lanthanide",  // 67 Ho
  "lanthanide",  // 68 Er
  "lanthanide",  // 69 Tm
  "lanthanide",  // 70 Yb
  "lanthanide",  // 71 Lu
  "transition",   // 72 Hf
  "transition",   // 73 Ta
  "transition",   // 74 W
  "transition",   // 75 Re
  "transition",   // 76 Os
  "transition",   // 77 Ir
  "transition",   // 78 Pt
  "transition",   // 79 Au
  "transition",   // 80 Hg
  "post-transition", // 81 Tl
  "post-transition", // 82 Pb
  "post-transition", // 83 Bi
  "metalloid",    // 84 Po
  "halogen",      // 85 At
  "noble",        // 86 Rn
];

const SYMBOLS = [
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
  "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr",
  "Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe",
  "Cs", "Ba", "La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu",
  "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn",
];

export function getElements(): PeriodicElement[] {
  return SYMBOLS.map((symbol, i) => ({
    symbol,
    number: i + 1,
    category: CATEGORIES[i] ?? "transition",
  }));
}

// Layout: main block (rows 0–5), then lanthanide row (6), then row 6 for Hf–Rn. Simplified 18-col.
// Row 0: H at 0, He at 17. Row 1: 3–10 at 0–7. Row 2: 11–18 at 0–7. Row 3: 19–20 at 0–1, 21–30 at 2–11, 31–36 at 12–17. etc.
export interface Cell {
  number: number;
  symbol: string;
  category: ElementCategory;
}

const MAIN_GRID: (number | null)[][] = [
  [1, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 2],
  [3, 4, 5, 6, 7, 8, 9, 10, null, null, null, null, null, null, null, null, null, null],
  [11, 12, 13, 14, 15, 16, 17, 18, null, null, null, null, null, null, null, null, null, null],
  [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
  [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54],
  [55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, null],
  [72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, null, null, null],
];

const CATEGORY_COLORS: Record<ElementCategory, string> = {
  alkali: "bg-pink-300 dark:bg-pink-600/60",
  alkaline: "bg-orange-300 dark:bg-orange-600/60",
  transition: "bg-yellow-300 dark:bg-yellow-600/60",
  "post-transition": "bg-green-300 dark:bg-green-600/60",
  metalloid: "bg-teal-300 dark:bg-teal-500/60",
  nonmetal: "bg-sky-200 dark:bg-sky-500/50",
  halogen: "bg-violet-300 dark:bg-violet-500/60",
  noble: "bg-purple-400 dark:bg-purple-600/60",
  lanthanide: "bg-pink-200 dark:bg-pink-500/50",
  actinide: "bg-rose-400 dark:bg-rose-600/60",
};

export function getCategoryColor(category: ElementCategory): string {
  return CATEGORY_COLORS[category];
}

export function getMainGrid(): (Cell | null)[][] {
  const elements = getElements();
  const byNum = new Map(elements.map((e) => [e.number, e]));
  return MAIN_GRID.map((row) =>
    row.map((z) => {
      if (z == null) return null;
      const el = byNum.get(z);
      return el ? { number: el.number, symbol: el.symbol, category: el.category } : null;
    })
  );
}
