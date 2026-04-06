import type { ExitTicketQuestion, ExitTicketResponseItem } from "@/services/api/teacher";

/** Rough percent of students who got this question correct (for table display). */
export function computeQuestionClassScore(
  q: ExitTicketQuestion,
  responses: ExitTicketResponseItem[],
): number | null {
  if (!q.correct_answer || responses.length === 0) return null;
  let correct = 0;
  let total = 0;
  const normalizedCorrect = q.correct_answer.trim().toLowerCase();
  for (const r of responses) {
    const ans = (r.answers as Record<string, unknown>[]).find(
      (a) => String(a.question_id ?? a.id ?? "") === q.id,
    );
    if (!ans) continue;
    total++;
    const chosen = String(ans.answer ?? ans.value ?? "").trim().toLowerCase();
    if (chosen === normalizedCorrect) correct++;
  }
  return total > 0 ? Math.round((correct / total) * 100) : null;
}
