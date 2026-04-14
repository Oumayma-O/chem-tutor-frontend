import type {
  ExitTicketAnswerRow,
  ExitTicketQuestion,
  ExitTicketResponseItem,
} from "@/services/api/teacher";

/** Prefer `is_correct` from the API (persisted student grading); `undefined` if absent or null. */
export function readStoredAnswerIsCorrect(ans: ExitTicketAnswerRow): boolean | undefined {
  if (ans.is_correct === true) return true;
  if (ans.is_correct === false) return false;
  return undefined;
}

export function exitTicketAnswerDisplayText(ans: ExitTicketAnswerRow): string {
  return String(ans.answer ?? ans.value ?? "").trim();
}

/** Whether we can show right/wrong: server stored a flag, or we have a canonical key for legacy fallback. */
export function canGradeExitTicketRow(q: ExitTicketQuestion, ans: ExitTicketAnswerRow): boolean {
  if (readStoredAnswerIsCorrect(ans) !== undefined) return true;
  return q.correct_answer != null && String(q.correct_answer).trim() !== "";
}

function isMcqQuestionType(questionType: string | null | undefined): boolean {
  const t = (questionType || "").toLowerCase();
  return t === "mcq" || t.startsWith("mcq");
}

/** True if the string is a single numeric token (matches student numeric inputs like 2 / 2.00 / 29.2). */
function isSingleNumberToken(s: string): boolean {
  const t = s.trim();
  return /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(t);
}

/** Relative tolerance so teacher analytics match student-side `apiValidateStep` grading (sig figs / rounding). */
function numericToleranceEqual(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  if (Object.is(a, b) || a === b) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  const relTol = 0.015;
  return Math.abs(a - b) <= Math.max(1e-9, relTol * scale);
}

/**
 * Best-effort match for rows submitted before `results` / `is_correct` existed.
 * Does not replicate the validation API exactly; backend should persist `is_correct` for accuracy.
 */
function legacyExitTicketAnswerMatch(
  studentRaw: string,
  correctRaw: string,
  questionType: string | null | undefined,
): boolean {
  const student = studentRaw.trim();
  const correct = (correctRaw || "").trim();
  if (!student || !correct) return false;

  if (isMcqQuestionType(questionType)) {
    return student.toLowerCase() === correct.toLowerCase();
  }

  if (student.toLowerCase() === correct.toLowerCase()) return true;

  if (isSingleNumberToken(student) && isSingleNumberToken(correct)) {
    return numericToleranceEqual(Number(student), Number(correct));
  }

  return false;
}

/**
 * Teacher display correctness: prefer API `is_correct`; else legacy string/numeric approximation.
 */
export function exitTicketQuestionCorrectForTeacher(q: ExitTicketQuestion, ans: ExitTicketAnswerRow): boolean {
  const stored = readStoredAnswerIsCorrect(ans);
  if (stored !== undefined) return stored;
  if (q.correct_answer == null || !String(q.correct_answer).trim()) return false;
  const chosen = exitTicketAnswerDisplayText(ans);
  return legacyExitTicketAnswerMatch(chosen, q.correct_answer, q.question_type);
}

/** Rough percent of students who got this question correct (for table display). */
export function computeQuestionClassScore(
  q: ExitTicketQuestion,
  responses: ExitTicketResponseItem[],
): number | null {
  if (responses.length === 0) return null;
  let correct = 0;
  let total = 0;
  for (const r of responses) {
    const ans = r.answers.find((a) => String(a.question_id ?? a.id ?? "") === q.id);
    if (!ans) continue;
    if (!canGradeExitTicketRow(q, ans)) continue;
    total++;
    if (exitTicketQuestionCorrectForTeacher(q, ans)) correct++;
  }
  return total > 0 ? Math.round((correct / total) * 100) : null;
}
