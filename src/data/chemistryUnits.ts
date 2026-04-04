/**
 * Standard chemistry units for the unit dropdown in MultiInput steps.
 *
 * `value` — sent to the backend (plain ASCII, must match LLM-generated unit strings).
 * `label` — displayed in the UI (may use unicode superscripts/symbols for readability).
 *
 * Keep in sync with the unit list in problem_generation/prompts.py.
 */

export interface UnitEntry {
  value: string;
  label: string;
}

export interface UnitGroup {
  group: string;
  units: UnitEntry[];
}

function u(value: string, label?: string): UnitEntry {
  return { value, label: label ?? value };
}

export const CHEMISTRY_UNITS: UnitGroup[] = [
  {
    group: "Mass",
    units: [u("g"), u("kg"), u("mg"), u("amu")],
  },
  {
    group: "Amount",
    units: [u("mol"), u("g/mol")],
  },
  {
    group: "Length",
    units: [u("m"), u("cm"), u("mm"), u("nm")],
  },
  {
    group: "Volume",
    units: [u("L"), u("mL"), u("m^3", "m³"), u("cm^3", "cm³")],
  },
  {
    group: "Time",
    units: [u("s"), u("min"), u("h"), u("d"), u("yr")],
  },
  {
    group: "Temperature",
    units: [u("K"), u("°C"), u("°F")],
  },
  {
    group: "Pressure",
    units: [u("Pa"), u("kPa"), u("atm"), u("mmHg"), u("torr")],
  },
  {
    group: "Energy",
    units: [u("J"), u("kJ"), u("cal"), u("kcal"), u("eV")],
  },
  {
    group: "Concentration",
    units: [u("M"), u("m"), u("%"), u("ppm"), u("ppb"), u("N")],
  },
  {
    group: "Density",
    units: [u("g/mL"), u("g/cm^3", "g/cm³")],
  },
  {
    group: "Rates & Constants",
    units: [
      u("s^-1",       "s⁻¹"),
      u("M/s"),
      u("M^-1 s^-1",  "M⁻¹·s⁻¹"),
      u("M^-2 s^-1",  "M⁻²·s⁻¹"),
    ],
  },
  {
    group: "Thermodynamics",
    units: [u("J/(g·°C)"), u("J/(mol·K)"), u("kJ/mol")],
  },
  {
    group: "Electrochemistry",
    units: [u("V"), u("C"), u("A")],
  },
  {
    group: "Light & Waves",
    units: [u("Hz"), u("nm")],
  },
];

/** Flat list of all unit values — used for validation and prompt generation. */
export const ALL_UNIT_VALUES: string[] = CHEMISTRY_UNITS.flatMap((g) =>
  g.units.map((u) => u.value),
);
