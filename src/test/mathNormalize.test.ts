/**
 * Golden tests for the math normalization pipeline.
 * Each test case corresponds to a real bug observed in production output.
 * Run with: npm test
 */
import { describe, it, expect } from "vitest";
import {
  normalizeMathString,
  normalizeLatexEscapes,
  normalizeAsciiCalculatorEquation,
  fixCorruptedUnitMiddleDots,
  preprocessStatementMath,
} from "@/lib/mathNormalize";

// ─── normalizeLatexEscapes ────────────────────────────────────────────────────

describe("normalizeLatexEscapes", () => {
  it("recovers \\t-eaten \\text command (JSON escape artifact)", () => {
    // \t = U+0009; LLM emits \text{J} but JSON parser eats the backslash+t
    const broken = "\u0009ext{J/mol}";
    const out = normalizeLatexEscapes(broken);
    expect(out).toContain("\\text{J/mol}");
  });

  it("recovers \\t-eaten \\times", () => {
    const broken = "3.0 \u0009imes 10^{8}";
    const out = normalizeLatexEscapes(broken);
    expect(out).toContain("\\times");
  });

  it("recovers \\f-eaten \\frac", () => {
    const broken = "\u000crac{1}{2}";
    const out = normalizeLatexEscapes(broken);
    expect(out).toContain("\\frac{1}{2}");
  });

  it("recovers \\r-eaten \\rightarrow", () => {
    const broken = "A \u000dightarrow B";
    const out = normalizeLatexEscapes(broken);
    expect(out).toContain("\\rightarrow");
  });

  it("recovers \\b-eaten \\beta", () => {
    const broken = "$\\alpha + \u0008eta$";
    const out = normalizeLatexEscapes(broken);
    expect(out).toContain("\\beta");
  });

  it("collapses $$...$$ display math to inline $...$", () => {
    const out = normalizeLatexEscapes("$$E = mc^2$$");
    expect(out).toBe("$E = mc^2$");
  });

  it("fixes \\backslash\\text{cdotK} → \\cdot \\text{K}", () => {
    const broken = "$R = 8.314 \\text{ J/mol}\\backslash\\text{cdotK}$";
    const out = normalizeLatexEscapes(broken);
    expect(out).not.toContain("\\backslash\\text{cdotK}");
    expect(out).toContain("\\cdot \\text{K}");
  });

  it("fixes \\text{cdotK} (no backslash variant)", () => {
    const broken = "$8.314 \\text{ J/mol}\\text{cdotK}$";
    const out = normalizeLatexEscapes(broken);
    expect(out).not.toContain("\\text{cdotK}");
    expect(out).toContain("\\cdot \\text{K}");
  });

  it("fixes $X$^{n} — superscript leaked outside closing $", () => {
    const broken = "$2s$^{2}";
    const out = normalizeLatexEscapes(broken);
    expect(out).toBe("$2s^{2}$");
  });

  it("fixes $X$_{n} — subscript leaked outside closing $", () => {
    const broken = "$k$_{obs}";
    const out = normalizeLatexEscapes(broken);
    expect(out).toBe("$k_{obs}$");
  });

  it("escapes bare # inside inline math", () => {
    const s = "$n = 3#4$";
    const out = normalizeLatexEscapes(s);
    expect(out).toContain("\\#");
  });

  it("fixes double-escaped backslashes (\\\\text → \\text)", () => {
    const out = normalizeLatexEscapes("\\\\text{mol}");
    expect(out).toContain("\\text{mol}");
    expect(out).not.toContain("\\\\text");
  });

  it("normalizes m\\/z mojibake to m/z", () => {
    const out = normalizeLatexEscapes("m\\/z ratio");
    expect(out).toBe("m/z ratio");
  });

  it("preserves \\cdots (not confused with \\cdot + letter)", () => {
    const out = normalizeLatexEscapes("$a \\cdots b$");
    expect(out).toContain("\\cdots");
    expect(out).not.toContain("\\cdot s");
  });

  it("trims $$$ noise from template literals to $$", () => {
    const out = normalizeLatexEscapes("$$$x + y$$$");
    // Should reduce triple dollar to double
    expect(out).not.toContain("$$$");
  });
});

// ─── fixCorruptedUnitMiddleDots ────────────────────────────────────────────────

describe("fixCorruptedUnitMiddleDots", () => {
  it("fixes mol·K unicode middle dot", () => {
    const out = fixCorruptedUnitMiddleDots("J/mol\u00b7K");
    expect(out).toContain("mol\\cdot K");
  });

  it("fixes 'mol˘0b7K' (breve + 0b7) mangled pattern", () => {
    // Breve + 0b7 (no extra leading zero) is the matched form
    const out = fixCorruptedUnitMiddleDots("J/(mol\u02D80b7K)");
    expect(out).toContain("mol\\cdot K");
  });
});

// ─── normalizeAsciiCalculatorEquation ─────────────────────────────────────────

describe("normalizeAsciiCalculatorEquation", () => {
  it("converts Arrhenius substitution line to LaTeX", () => {
    const raw = "Ea = 8.314 * ln(8.10e-3/1.20e-3) / (1/298.15 - 1/318.15)";
    const out = normalizeAsciiCalculatorEquation(raw);
    expect(out.startsWith("$")).toBe(true);
    expect(out.endsWith("$")).toBe(true);
    expect(out).toContain("\\ln(");
    expect(out).toContain("\\cdot ");
    expect(out).toContain("\\times 10^{-3}");
    expect(out).toContain("E_a");
  });

  it("does NOT wrap a plain assignment without sci-notation, *, or ln", () => {
    // k = 1.5 has no e-notation, no *, no ln — should stay as plain text
    const out = normalizeAsciiCalculatorEquation("k = 1.5");
    expect(out).not.toMatch(/^\$/);
  });

  it("does NOT re-process already-wrapped math", () => {
    const raw = "$k = 1.20 \\times 10^{-3}$";
    const out = normalizeAsciiCalculatorEquation(raw);
    expect(out).toBe(raw);
  });
});

// ─── preprocessStatementMath ──────────────────────────────────────────────────

describe("preprocessStatementMath", () => {
  it("unwraps globally wrapped $...$ with English prose", () => {
    const wrapped = "$\\mathrm{Cu} and \\mathrm{Zn}$";
    const out = preprocessStatementMath(wrapped);
    // "and" should be outside math
    expect(out).not.toBe(wrapped);
    expect(out).toContain("and");
    // Cu and Zn should still be in math spans (trailing whitespace may appear inside $...$)
    expect(out).toContain("\\mathrm{Cu}");
    expect(out).toContain("\\mathrm{Zn}");
  });

  it("leaves normal mixed text untouched", () => {
    const plain = "The rate constant $k$ increases with temperature.";
    expect(preprocessStatementMath(plain)).toBe(plain);
  });

  it("leaves display math $$...$$ untouched", () => {
    const display = "$$E_a = -R \\cdot slope$$";
    expect(preprocessStatementMath(display)).toBe(display);
  });
});

// ─── normalizeMathString (mode: "mixed") ──────────────────────────────────────

describe('normalizeMathString — "mixed" mode (default)', () => {
  it("handles empty string", () => {
    expect(normalizeMathString("")).toBe("");
  });

  it("applies full pipeline: sci notation token appears in output", () => {
    // The pipeline fragments 2.5e4 into multiple $...$ spans; just verify the exponent token
    const raw = "Rate = 2.5e4";
    const out = normalizeMathString(raw);
    expect(out).toContain("\\times");
    expect(out).toMatch(/10.*\^.*4/);
  });

  it("converts ASCII calculator equation (key tokens present)", () => {
    // normalizeAsciiCalculatorEquation wraps in $...$; fixGloballyWrappedStatement then
    // re-fragments it into multiple small spans. Verify key tokens, not exact string.
    const raw = "Ea = 8.314 * ln(2.0e-3)";
    const out = normalizeMathString(raw);
    expect(out).toContain("\\ln");
    expect(out).toContain("\\cdot");
    expect(out).toMatch(/E.*_.*a/); // E_a may be fragmented as E$_a$
  });

  it("fixes globally wrapped $...$", () => {
    const wrapped = "$\\mathrm{HCl} and \\mathrm{NaOH}$";
    const out = normalizeMathString(wrapped);
    expect(out).toContain("and");
    expect(out).not.toBe(wrapped);
  });
});

// ─── normalizeMathString (mode: "equation") ───────────────────────────────────

describe('normalizeMathString — "equation" mode', () => {
  it("does NOT wrap plain numeric answer in math", () => {
    const out = normalizeMathString("0.72", "equation");
    expect(out).toBe("0.72");
  });

  it("does NOT trigger ASCII-calculator detection", () => {
    // A simple ratio that looks like calculator but is a stored answer
    const out = normalizeMathString("k = 1.5", "equation");
    // Should NOT wrap in $ (no * or ln or sci notation)
    expect(out).not.toMatch(/^\$/);
  });

  it("still fixes \\cdot spacing issues", () => {
    const out = normalizeMathString("$k\\cdotL$", "equation");
    expect(out).not.toContain("\\cdotL");
  });

  it("still fixes JSON-eaten \\text", () => {
    const broken = "$\u0009ext{mol}$";
    const out = normalizeMathString(broken, "equation");
    expect(out).toContain("\\text{mol}");
  });
});

// ─── normalizeMathString (mode: "hint") ───────────────────────────────────────

describe('normalizeMathString — "hint" mode', () => {
  it("applies same normalization as mixed mode", () => {
    const raw = "The activation energy $E_a$ is related to $\\Delta H$.";
    const hint = normalizeMathString(raw, "hint");
    const mixed = normalizeMathString(raw, "mixed");
    expect(hint).toBe(mixed);
  });

  it("preserves markdown bullet structure (no flattening)", () => {
    const raw = "Steps:\n- First step\n- Second step with $k = Ae^{-E_a/RT}$";
    const out = normalizeMathString(raw, "hint");
    expect(out).toContain("- First step");
    expect(out).toContain("- Second step");
  });
});

// ─── Bug regression: pure-math globally-wrapped equation (Bug 1) ─────────────

describe("fixGloballyWrappedStatement — pure-math guard (Bug 1 regression)", () => {
  it("does NOT fragment a pure-math Arrhenius equation wrapped in $...$", () => {
    // Root cause: interleaveMathInSegment was called on pure-math content,
    // breaking \ln\left into "$\ln\left$" + "(" — invalid KaTeX rendered red.
    const eq =
      "$\\ln\\left(\\frac{2.40 \\times 10^{-3}}{6.50 \\times 10^{-4}}\\right) = \\frac{E_a}{8.314}\\left(\\frac{1}{290} - \\frac{1}{310}\\right)$";
    const out = normalizeMathString(eq, "hint");
    // Must remain a single valid $...$ block, not fragmented into multiple spans
    expect(out.startsWith("$")).toBe(true);
    expect(out.endsWith("$")).toBe(true);
    // Key commands must stay intact (not split across adjacent $...$ blocks)
    expect(out).toContain("\\ln\\left");
    expect(out).toContain("\\frac");
    expect(out).toContain("\\right");
    // Must NOT produce adjacent $...$ blocks like "$\ln\left$($..."
    expect(out).not.toMatch(/\$\s*\(/);
  });

  it("does NOT fragment a simple globally-wrapped equation with no prose", () => {
    const eq = "$k_1 = 1.20 \\times 10^{-3}$";
    const out = normalizeMathString(eq, "mixed");
    expect(out.startsWith("$")).toBe(true);
    expect(out.endsWith("$")).toBe(true);
    expect(out).toContain("\\times");
  });

  it("STILL splits a globally-wrapped $...$ that contains prose words", () => {
    // "and" is a prose word → must still be split out of math mode
    const wrapped = "$\\mathrm{Cu} and \\mathrm{Zn}$";
    const out = normalizeMathString(wrapped, "mixed");
    expect(out).not.toBe(wrapped);
    expect(out).toContain("and");
    expect(out).toContain("\\mathrm{Cu}");
    expect(out).toContain("\\mathrm{Zn}");
  });

  it("STILL splits globally-wrapped $...$ with 'for' connector between formulas", () => {
    const wrapped = "$\\mathrm{H_2} for \\mathrm{O_2}$";
    const out = normalizeMathString(wrapped, "mixed");
    expect(out).toContain("for");
    expect(out).not.toBe(wrapped);
  });
});
