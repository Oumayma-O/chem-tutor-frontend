import { describe, it, expect } from "vitest";
import { capitalizeFirst } from "@/lib/capitalizeFirst";

describe("capitalizeFirst", () => {
  it("capitalizes first ASCII letter", () => {
    expect(capitalizeFirst("hello")).toBe("Hello");
  });

  it("preserves leading whitespace", () => {
    expect(capitalizeFirst("  hi")).toBe("  Hi");
  });

  it("leaves empty and already-capitalized strings", () => {
    expect(capitalizeFirst("")).toBe("");
    expect(capitalizeFirst("Hello")).toBe("Hello");
  });
});
