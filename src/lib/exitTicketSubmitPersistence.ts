/** Persist successful class exit-ticket submits so reopening the tutor shows review-only for that ticket. */
const prefix = "chemtutor_exit_ticket_submit_v1:";

function key(configId: string, userId?: string | null): string {
  return `${prefix}${userId ?? "anon"}:${configId}`;
}

export function loadExitTicketSubmit(configId: string): {
  answers: Record<string, string>;
  results: Record<string, boolean>;
} | null {
  return loadExitTicketSubmitForUser(configId, null);
}

export function loadExitTicketSubmitForUser(
  configId: string,
  userId?: string | null,
): {
  answers: Record<string, string>;
  results: Record<string, boolean>;
} | null {
  try {
    const raw = localStorage.getItem(key(configId, userId));
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
  saveExitTicketSubmitForUser(configId, data, null);
}

export function saveExitTicketSubmitForUser(
  configId: string,
  data: { answers: Record<string, string>; results: Record<string, boolean> },
  userId?: string | null,
): void {
  try {
    localStorage.setItem(key(configId, userId), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}
