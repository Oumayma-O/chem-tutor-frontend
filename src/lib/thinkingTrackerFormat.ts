import type { SolutionStep } from "@/types/chemistry";
import { buildMathExpression } from "@/lib/equationDragDrop";

const META_KEYS = new Set(["hasAttempted", "fieldErrors", "isIncorrect"]);

function stripMathDelimiters(s: string): string {
  return s.replace(/^\$+/, "").replace(/\$+$/, "").trim();
}

/**
 * Turn persisted draft JSON (or legacy shapes) into a short human-readable line for Thinking Tracker.
 */
export function formatStructuredAnswerForThinkingTracker(step: SolutionStep, raw: string): string {
  const t = raw?.trim() ?? "";
  if (!t || step.type === "interactive") return t;

  try {
    const parsed: unknown = JSON.parse(t);

    if (step.type === "drag_drop") {
      if (parsed && typeof parsed === "object" && Array.isArray((parsed as { slots?: unknown }).slots)) {
        const slots = (parsed as { slots: string[] }).slots.map((x) => stripMathDelimiters(String(x)));
        return buildMathExpression(slots);
      }
      return t;
    }

    if (step.type === "comparison") {
      let op = "";
      if (typeof parsed === "string" && /^[<>=]$/.test(parsed)) {
        op = parsed;
      } else if (parsed && typeof parsed === "object" && typeof (parsed as { selected?: string }).selected === "string") {
        op = (parsed as { selected: string }).selected;
      }
      if (step.comparison_parts?.length === 2 && op) {
        const [a, b] = step.comparison_parts;
        return `${a.trim()} ${op} ${b.trim()}`;
      }
      return op || t;
    }

    if (step.type === "multi_input") {
      const formatRow = (label: string, v: { value?: string; unit?: string }) => {
        const val = (v?.value ?? "").trim();
        const u = (v?.unit ?? "").trim();
        return `${label}: ${val}${u ? ` ${u}` : ""}`;
      };

      if (parsed && typeof parsed === "object" && "fields" in parsed) {
        const fields = (parsed as { fields?: Record<string, { value?: string; unit?: string }> }).fields;
        if (fields && typeof fields === "object") {
          return Object.entries(fields)
            .map(([label, v]) => formatRow(label, v ?? {}))
            .join("; ");
        }
      }

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.entries(parsed as Record<string, unknown>)
          .filter(([k]) => !META_KEYS.has(k))
          .map(([label, v]) => {
            if (v && typeof v === "object" && ("value" in v || "unit" in v)) {
              return formatRow(label, v as { value?: string; unit?: string });
            }
            return `${label}: ${String(v)}`;
          })
          .join("; ");
      }
    }
  } catch {
    return t;
  }

  return t;
}
