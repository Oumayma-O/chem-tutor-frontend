/**
 * Classroom live session — teacher publish + student poll.
 * Backend: implement GET /classrooms/me/live-session and teacher publish/stop routes.
 */
import { get, post } from "@/lib/api/core";
import type { ExitTicketConfig } from "@/services/api/teacher";

export type ClassroomSessionPhase = "idle" | "timed_practice" | "exit_ticket";

export interface MyClassroomLiveSession {
  classroom_id: string;
  timed_mode_active: boolean;
  timed_practice_minutes: number | null;
  timed_started_at: string | null;
  active_exit_ticket_id: string | null;
  session_phase: ClassroomSessionPhase;
  unit_id: string | null;
  lesson_index: number | null;
  /** When the API embeds the full ticket, students can load without GET /student/exit-tickets/{id}. */
  exit_ticket?: ExitTicketConfig | null;
  exit_ticket_time_limit_minutes?: number | null;
  exit_ticket_window_started_at?: string | null;
  /** Class setting: 3-strikes reveal + session cap; used when not returned on problem payloads. */
  allow_answer_reveal?: boolean;
  /** Server cap for reveals per lesson (optional; problem delivery may also send this). `null` = unlimited. */
  max_answer_reveals_per_lesson?: number | null;
  /** Unique Level 1 worked examples required before Level 2. */
  min_level1_examples_for_level2?: number;
}

/** Identifies the current teacher-published timed + ticket block (for student opt-out / sync). */
export function liveSessionAnchorKey(ls: MyClassroomLiveSession): string {
  return `${ls.classroom_id}|${ls.timed_started_at ?? ""}|${ls.active_exit_ticket_id ?? ""}`;
}

/** Notify API that the student dismissed timed/exit-ticket UI (optional analytics hook). */
export async function postDismissLiveSessionOverlay(anchorKey: string): Promise<void> {
  await post<void>("/classrooms/me/live-session/dismiss", { anchor_key: anchorKey });
}

function parseEmbeddedExitTicket(raw: unknown): ExitTicketConfig | null | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "object" && raw !== null && "id" in raw && "questions" in raw) {
    return raw as ExitTicketConfig;
  }
  return undefined;
}

function inferPhase(d: Record<string, unknown>): ClassroomSessionPhase {
  const explicit = d.session_phase as string | undefined;
  if (explicit === "timed_practice" || explicit === "exit_ticket" || explicit === "idle") {
    return explicit;
  }
  if (d.timed_mode_active === true) return "timed_practice";
  if (d.active_exit_ticket_id) return "exit_ticket";
  return "idle";
}

/** Normalize API payloads that omit `session_phase`. */
export function normalizeLiveSession(data: unknown): MyClassroomLiveSession | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const classroom_id = String(d.classroom_id ?? d.class_id ?? "");
  if (!classroom_id) return null;
  const embedded = parseEmbeddedExitTicket(d.exit_ticket);
  const etLim = d.exit_ticket_time_limit_minutes;
  const etLimNum = typeof etLim === "number" ? etLim : null;

  const allowReveal = d.allow_answer_reveal;
  const allow_answer_reveal =
    typeof allowReveal === "boolean" ? allowReveal : undefined;

  const maxRaw = d.max_answer_reveals_per_lesson;
  let max_answer_reveals_per_lesson: number | null | undefined;
  if (maxRaw === null) {
    max_answer_reveals_per_lesson = null;
  } else if (typeof maxRaw === "number" && Number.isFinite(maxRaw) && maxRaw >= 1) {
    max_answer_reveals_per_lesson = Math.floor(maxRaw);
  } else {
    max_answer_reveals_per_lesson = undefined;
  }

  const minL1Raw = d.min_level1_examples_for_level2;
  const min_level1_examples_for_level2 =
    typeof minL1Raw === "number" && Number.isFinite(minL1Raw) && minL1Raw >= 1
      ? Math.floor(minL1Raw)
      : undefined;

  return {
    classroom_id,
    timed_mode_active: Boolean(d.timed_mode_active),
    timed_practice_minutes:
      typeof d.timed_practice_minutes === "number" ? d.timed_practice_minutes : null,
    timed_started_at: typeof d.timed_started_at === "string" ? d.timed_started_at : null,
    active_exit_ticket_id: typeof d.active_exit_ticket_id === "string" ? d.active_exit_ticket_id : null,
    session_phase: inferPhase(d),
    unit_id: typeof d.unit_id === "string" ? d.unit_id : null,
    lesson_index: typeof d.lesson_index === "number" ? d.lesson_index : null,
    exit_ticket_time_limit_minutes: etLimNum,
    exit_ticket_window_started_at:
      typeof d.exit_ticket_window_started_at === "string" ? d.exit_ticket_window_started_at : null,
    ...(allow_answer_reveal !== undefined ? { allow_answer_reveal } : {}),
    ...(max_answer_reveals_per_lesson !== undefined
      ? { max_answer_reveals_per_lesson }
      : {}),
    ...(min_level1_examples_for_level2 !== undefined ? { min_level1_examples_for_level2 } : {}),
    ...(embedded !== undefined ? { exit_ticket: embedded } : {}),
  };
}

/**
 * Poll while the student is enrolled in a classroom. Returns null if the route is missing or idle.
 */
export async function getMyClassroomLiveSession(): Promise<MyClassroomLiveSession | null> {
  const raw = await get<unknown>("/classrooms/me/live-session");
  return normalizeLiveSession(raw);
}
