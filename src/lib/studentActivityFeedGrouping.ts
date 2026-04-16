import { differenceInCalendarDays, format } from "date-fns";
import type { UnifiedActivityRow } from "@/lib/studentAnalyticsAggregations";

export type GroupedActivityRow = {
  row: UnifiedActivityRow;
  globalIndex: number;
  date: Date;
  group: string;
  showGroup: boolean;
};

function groupLabelForDate(d: Date): string {
  const daysAgo = differenceInCalendarDays(new Date(), d);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo <= 7) return "Previous 7 days";
  if (daysAgo <= 30) return "Previous 30 days";
  return format(d, "MMMM yyyy");
}

export function buildGroupedActivityRows(options: {
  pagedRows: UnifiedActivityRow[];
  unifiedRows: UnifiedActivityRow[];
  historyPage: number;
  pageSize: number;
}): GroupedActivityRow[] {
  const { pagedRows, unifiedRows, historyPage, pageSize } = options;
  const globalOffset = (historyPage - 1) * pageSize;
  let lastGroup = "";

  if (historyPage > 1) {
    const prevRow = unifiedRows[globalOffset - 1];
    if (prevRow) {
      const prevDate = new Date(
        prevRow.kind === "practice" ? prevRow.attempt.started_at : prevRow.response.submitted_at,
      );
      lastGroup = groupLabelForDate(prevDate);
    }
  }

  return pagedRows.map((row, i) => {
    const globalIndex = globalOffset + i;
    const date = new Date(
      row.kind === "practice" ? row.attempt.started_at : row.response.submitted_at,
    );
    const group = groupLabelForDate(date);
    const showGroup = group !== lastGroup;
    lastGroup = group;
    return { row, globalIndex, date, group, showGroup };
  });
}
