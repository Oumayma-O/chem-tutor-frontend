import { describe, it, expect } from "vitest";
import {
  equationPartToInlineMathString,
  joinEquationPartsForDisplayString,
} from "@/lib/equationDragDrop";

describe("equationPartToInlineMathString", () => {
  it("wraps LaTeX-like tokens in $...$", () => {
    expect(equationPartToInlineMathString(String.raw`\frac{a}{b}`)).toMatch(/^\$/);
    expect(equationPartToInlineMathString("x^2")).toMatch(/^\$/);
  });

  it("strips outer dollar signs; wraps when LaTeX commands present", () => {
    expect(equationPartToInlineMathString(String.raw`$\alpha$`)).toMatch(/^\$/);
  });

  it("returns plain text when no LaTeX markers", () => {
    expect(equationPartToInlineMathString("=")).toBe("=");
  });
});

describe("joinEquationPartsForDisplayString", () => {
  it("joins parts with spaces", () => {
    const s = joinEquationPartsForDisplayString(["a", "=", "b"]);
    expect(s).toContain(" ");
    expect(s.split(" ").length).toBe(3);
  });
});
