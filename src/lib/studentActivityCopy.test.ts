import { describe, expect, it } from "vitest";
import {
  getActivityCardDescription,
  getActivityCardTitle,
  getActivityEmptyStateCopy,
} from "@/lib/studentActivityCopy";

describe("studentActivityCopy", () => {
  const unitTitle = (id: string) => (id === "u1" ? "Atomic Structure" : id);

  it("builds expected titles by mode and scope", () => {
    expect(getActivityCardTitle({ analyticsMode: "practice", unitTitle })).toBe("Recent attempts (all chapters)");
    expect(getActivityCardTitle({ analyticsMode: "all", chapterFilter: "u1", unitTitle })).toBe("Activity — Atomic Structure");
    expect(getActivityCardTitle({ analyticsMode: "exit-ticket", chapterFilter: "u1", unitTitle })).toBe("Exit ticket submissions — Atomic Structure");
  });

  it("returns descriptions only when not chapter-filtered", () => {
    expect(getActivityCardDescription({ analyticsMode: "practice" })).toContain("Newest first");
    expect(getActivityCardDescription({ analyticsMode: "all" })).toContain("practice and exit ticket");
    expect(getActivityCardDescription({ analyticsMode: "exit-ticket", chapterFilter: "u1" })).toBeNull();
  });

  it("returns mode-specific empty-state copy", () => {
    expect(getActivityEmptyStateCopy({ analyticsMode: "all" })).toBe("No scored practice or exit ticket activity in scope yet.");
    expect(getActivityEmptyStateCopy({ analyticsMode: "practice", chapterFilter: "u1" })).toBe("No submitted attempts for this chapter yet.");
    expect(getActivityEmptyStateCopy({ analyticsMode: "exit-ticket" })).toBe("No exit ticket submissions for this class yet.");
  });
});
