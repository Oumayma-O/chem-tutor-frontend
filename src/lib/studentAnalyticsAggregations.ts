import type {
  CategorySnapshot,
  ExitTicketConfig,
  ExitTicketResponseItem,
  StudentAttemptOut,
} from "@/services/api/teacher";

export type ExitForStudentRow = {
  response: ExitTicketResponseItem;
  ticket: ExitTicketConfig;
};

export type UnifiedActivityRow =
  | { kind: "practice"; attempt: StudentAttemptOut }
  | { kind: "exit"; response: ExitTicketResponseItem; ticket: ExitTicketConfig };

export type ChapterSummaryRow = {
  unitId: string;
  title: string;
  avg: number;
  count: number;
};

export function computeStudentActivityAggregates(options: {
  analyticsMode: "all" | "practice" | "exit-ticket";
  finishedPractice: StudentAttemptOut[];
  exitForStudent: ExitForStudentRow[];
  chapterFilter?: string;
  masteryPct: number;
  studentMastery?: number;
  unitTitle: (unitId: string) => string;
}): {
  chapterSummary: ChapterSummaryRow[];
  headlineScorePct: number;
  finishedCount: number;
  unifiedRows: UnifiedActivityRow[];
} {
  const {
    analyticsMode,
    finishedPractice,
    exitForStudent,
    chapterFilter,
    masteryPct,
    studentMastery,
    unitTitle,
  } = options;

  if (analyticsMode === "practice") {
    const byUnit: Record<string, number[]> = {};
    for (const a of finishedPractice) {
      (byUnit[a.unit_id] ??= []).push(a.score!);
    }
    const summary: ChapterSummaryRow[] = [];
    for (const [uid, scores] of Object.entries(byUnit)) {
      if (scores.length > 0) {
        summary.push({
          unitId: uid,
          title: unitTitle(uid),
          avg: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 100),
          count: scores.length,
        });
      }
    }
    summary.sort((a, b) => b.avg - a.avg);
    const avgAcross =
      !chapterFilter && summary.length > 0
        ? Math.round(summary.reduce((s, ch) => s + ch.avg, 0) / summary.length)
        : null;
    const headline = chapterFilter ? masteryPct : (avgAcross ?? masteryPct);
    const sorted = [...finishedPractice].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );
    return {
      chapterSummary: !chapterFilter ? summary : [],
      headlineScorePct: headline,
      finishedCount: finishedPractice.length,
      unifiedRows: sorted.map((a) => ({ kind: "practice" as const, attempt: a })),
    };
  }

  if (analyticsMode === "exit-ticket") {
    const byUnit: Record<string, number[]> = {};
    for (const { response, ticket } of exitForStudent) {
      if (response.score == null) continue;
      (byUnit[ticket.unit_id] ??= []).push(response.score);
    }
    const summary: ChapterSummaryRow[] = [];
    for (const [uid, scores] of Object.entries(byUnit)) {
      summary.push({
        unitId: uid,
        title: unitTitle(uid),
        avg: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
        count: scores.length,
      });
    }
    summary.sort((a, b) => b.avg - a.avg);
    const scores = exitForStudent.map((x) => x.response.score).filter((s): s is number => s != null);
    const headline =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : (studentMastery ?? 0);
    const avgAcross =
      !chapterFilter && summary.length > 0
        ? Math.round(summary.reduce((s, ch) => s + ch.avg, 0) / summary.length)
        : null;
    const headlineFinal = chapterFilter ? headline : (avgAcross ?? headline);
    const sorted = [...exitForStudent].sort(
      (a, b) =>
        new Date(b.response.submitted_at).getTime() - new Date(a.response.submitted_at).getTime(),
    );
    return {
      chapterSummary: !chapterFilter ? summary : [],
      headlineScorePct: headlineFinal,
      finishedCount: exitForStudent.filter((x) => x.response.score != null).length,
      unifiedRows: sorted.map((x) => ({ kind: "exit" as const, ...x })),
    };
  }

  const byUnit: Record<string, number[]> = {};
  for (const a of finishedPractice) {
    (byUnit[a.unit_id] ??= []).push(a.score! * 100);
  }
  for (const { response, ticket } of exitForStudent) {
    if (response.score != null) {
      (byUnit[ticket.unit_id] ??= []).push(response.score);
    }
  }
  const summary: ChapterSummaryRow[] = [];
  for (const [uid, vals] of Object.entries(byUnit)) {
    if (vals.length > 0) {
      summary.push({
        unitId: uid,
        title: unitTitle(uid),
        avg: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
        count: vals.length,
      });
    }
  }
  summary.sort((a, b) => b.avg - a.avg);
  const allScores: number[] = [
    ...finishedPractice.map((a) => a.score! * 100),
    ...exitForStudent.map((x) => x.response.score).filter((s): s is number => s != null),
  ];
  const avgAcross =
    !chapterFilter && summary.length > 0
      ? Math.round(summary.reduce((s, ch) => s + ch.avg, 0) / summary.length)
      : null;
  const headlineFlat =
    allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : masteryPct;
  const headline = chapterFilter ? masteryPct : (avgAcross ?? headlineFlat);
  const merged: UnifiedActivityRow[] = [
    ...finishedPractice.map((attempt) => ({ kind: "practice" as const, attempt })),
    ...exitForStudent.map(({ response, ticket }) => ({ kind: "exit" as const, response, ticket })),
  ];
  merged.sort((x, y) => {
    const tx = x.kind === "practice" ? x.attempt.started_at : x.response.submitted_at;
    const ty = y.kind === "practice" ? y.attempt.started_at : y.response.submitted_at;
    return new Date(ty).getTime() - new Date(tx).getTime();
  });
  return {
    chapterSummary: !chapterFilter ? summary : [],
    headlineScorePct: headline,
    finishedCount: finishedPractice.length + exitForStudent.filter((x) => x.response.score != null).length,
    unifiedRows: merged,
  };
}

export function deriveStrengthsAndWeakTopics(options: {
  categoryScores?: CategorySnapshot;
  analyticsLesson: number | "all";
  headlineScorePct: number;
}): {
  weakTopics: string[];
  strengths: string[];
} {
  const { categoryScores, analyticsLesson, headlineScorePct } = options;
  if (analyticsLesson !== "all" || !categoryScores) {
    return {
      weakTopics: headlineScorePct >= 75 ? [] : [],
      strengths: headlineScorePct >= 75 ? ["All areas strong"] : [],
    };
  }

  const weak: string[] = [];
  if (categoryScores.conceptual != null && categoryScores.conceptual < 0.5) weak.push("conceptual");
  if (categoryScores.procedural != null && categoryScores.procedural < 0.5) weak.push("procedural");
  if (categoryScores.computational != null && categoryScores.computational < 0.5) weak.push("computational");

  const strong: string[] = [];
  if (categoryScores.conceptual != null && categoryScores.conceptual >= 0.75) strong.push("conceptual");
  if (categoryScores.procedural != null && categoryScores.procedural >= 0.75) strong.push("procedural");
  if (categoryScores.computational != null && categoryScores.computational >= 0.75) strong.push("computational");

  return {
    weakTopics: weak,
    strengths: strong.length > 0 ? strong : headlineScorePct >= 75 ? ["All areas strong"] : [],
  };
}
