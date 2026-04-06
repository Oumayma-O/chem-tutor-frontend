/** Persist successful class exit-ticket submits so reopening the tutor shows review-only for that ticket. */
const prefix = "chemtutor_exit_ticket_submit_v1:";

export function loadExitTicketSubmit(configId: string): {
  answers: Record<string, string>;
  results: Record<string, boolean>;
} | null {
  try {
    const raw = localStorage.getItem(prefix + configId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      answers?: Record<string, string>;
      results?: Record<string, boolean>;
    };
    if (!parsed.answers || !parsed.results) return null;
    return { answers: parsed.answers, results: parsed.results };
  } catch {
    return null;
  }
}

export function saveExitTicketSubmit(
  configId: string,
  data: { answers: Record<string, string>; results: Record<string, boolean> },
): void {
  try {
    localStorage.setItem(prefix + configId, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}
