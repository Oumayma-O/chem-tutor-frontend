import type {
  ExitTicketConfig,
  ExitTicketQuestion as ApiExitTicketQuestion,
} from "@/services/api/teacher";

export interface UiExitTicketQuestion {
  id: string;
  question_order: number;
  format: "mcq" | "structured";
  question_text: string;
  correct_answer: string;
  mcq_options?: { label: string; value: string; misconception_tag?: string }[];
  unit?: string;
  equation_parts?: string[];
}

/** Map MCQ options + optional index-aligned misconception tags from the API. */
export function mapApiMcqOptions(q: ApiExitTicketQuestion): { label: string; value: string; misconception_tag?: string }[] {
  const opts = q.options ?? [];
  const tags = q.option_misconception_tags ?? [];
  return opts.map((value, j) => ({
    label: String.fromCharCode(65 + j),
    value,
    misconception_tag: tags[j] ? String(tags[j]) : undefined,
  }));
}

export function mapExitTicketConfigToUiQuestions(ticket: ExitTicketConfig): UiExitTicketQuestion[] {
  return ticket.questions.map((q, i) => {
    const looksMcq = q.question_type === "mcq" || (q.options?.length ?? 0) > 0;
    return {
      id: q.id,
      question_order: i + 1,
      format: looksMcq ? "mcq" : "structured",
      question_text: q.prompt,
      correct_answer: q.correct_answer || "",
      mcq_options: looksMcq ? mapApiMcqOptions(q) : undefined,
      unit: q.unit ?? undefined,
    };
  });
}
