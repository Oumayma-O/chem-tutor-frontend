/**
 * Live presence — polling + student heartbeat.
 */
import { get, post } from "@/lib/api/core";

export interface LiveStudentEntry {
  student_id: string;
  name: string;
  email: string | null;
  step_id: string | null;
  last_seen_at: string;
}

export async function getLiveClassStatus(classroomId: string): Promise<LiveStudentEntry[]> {
  return get<LiveStudentEntry[]>(`/teacher/classes/${classroomId}/live`);
}

export async function postPresenceHeartbeat(body: {
  classroom_id: string;
  step_id?: string | null;
}): Promise<void> {
  await post<void>("/presence/heartbeat", body);
}
