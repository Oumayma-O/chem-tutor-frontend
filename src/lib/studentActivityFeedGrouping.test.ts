import { describe, expect, it, vi } from "vitest";
import { buildGroupedActivityRows } from "@/lib/studentActivityFeedGrouping";
import type { UnifiedActivityRow } from "@/lib/studentAnalyticsAggregations";

function practiceRow(id: string, startedAt: string): UnifiedActivityRow {
  return {
    kind: "practice",
    attempt: {
      id,
      unit_id: "u1",
      lesson_index: 0,
      level: 1,
      score: 0.8,
      is_complete: true,
      started_at: startedAt,
      completed_at: startedAt,
      time_spent_s: 120,
      hints_used: 0,
      reveals_used: 0,
    },
  };
}

describe("studentActivityFeedGrouping", () => {
  it("assigns global indexes based on page offset", () => {
    const pagedRows = [practiceRow("a", "2026-04-15T10:00:00Z"), practiceRow("b", "2026-04-14T10:00:00Z")];
    const rows = buildGroupedActivityRows({
      pagedRows,
      unifiedRows: pagedRows,
      historyPage: 2,
      pageSize: 10,
    });

    expect(rows[0].globalIndex).toBe(10);
    expect(rows[1].globalIndex).toBe(11);
  });

  it("continues group labels across pages", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));

    const allRows = [
      practiceRow("p1", "2026-04-15T09:00:00Z"),
      practiceRow("p2", "2026-04-15T08:00:00Z"),
      practiceRow("p3", "2026-04-15T07:00:00Z"),
    ];
    const pagedRows = [allRows[1], allRows[2]];

    const grouped = buildGroupedActivityRows({
      pagedRows,
      unifiedRows: allRows,
      historyPage: 2,
      pageSize: 1,
    });

    expect(grouped[0].group).toBe("Today");
    expect(grouped[0].showGroup).toBe(false);

    vi.useRealTimers();
  });
});
