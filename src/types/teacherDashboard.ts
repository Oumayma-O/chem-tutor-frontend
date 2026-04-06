import type { StudentCognitiveProfile } from "@/types/cognitive";

/**
 * Same cognitive profile shape the app uses for students; teacher dashboard only
 * passes a subset (e.g. PredictiveInsights props) from the shared auth hook.
 */
export type TeacherDashboardProfile = StudentCognitiveProfile;
