import type { InputField } from "@/types/chemistry";

/** Strip LaTeX wrappers so the backend receives a plain numeric expression or clean unit string. */
export function stripLatex(raw: string): string {
  return raw
    .replace(/\u2212/g, "-")
    .replace(/^\$+|\$+$/g, "")
    .replace(/\s*\\times\s*10\s*\^\{?\s*([+-]?\d+)\s*\}?/gi, "e$1")
    .replace(/\s*\\cdot\s*10\s*\^\{?\s*([+-]?\d+)\s*\}?/gi, "e$1")
    .replace(/\\(?:text|mathrm)\{([^{}]*)\}/g, "$1")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Serialize correct answers as JSON (matches MultiInput validation / reveal). */
export function serializeCorrectFields(variables: InputField[]): string {
  const obj: Record<string, { value: string; unit: string }> = {};
  for (const v of variables) {
    obj[v.label] = {
      value: stripLatex(v.value),
      unit: stripLatex(v.unit ?? ""),
    };
  }
  return JSON.stringify(obj);
}
