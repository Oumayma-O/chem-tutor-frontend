/**
 * Student classroom enrollment — matches FastAPI `app.api.v1.routers.classrooms`:
 * POST /classrooms/join, DELETE /classrooms/{id}/students/{student_id}
 */
import { del, post } from "@/lib/api/core";

/** Response from POST /classrooms/join (refresh profile with /auth/me after success). */
export interface JoinClassroomResult {
  classroom_id: string;
  classroom_name: string;
  unit_id: string | null;
}

export async function joinClassroomByCode(classCode: string, studentId: string): Promise<JoinClassroomResult> {
  return post<JoinClassroomResult>("/classrooms/join", {
    student_id: studentId,
    code: classCode.trim().toUpperCase(),
  });
}

export async function leaveCurrentClassroom(classroomId: string, studentId: string): Promise<void> {
  await del(`/classrooms/${classroomId}/students/${studentId}`);
}
