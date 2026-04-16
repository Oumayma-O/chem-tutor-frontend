import { post, get, request, put } from "./core";

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  role: string;
  name: string;
}

export interface SseTokenResponse {
  sse_token: string;
  expires_in_seconds: number;
}

export interface MeResponse {
  user_id: string;
  email: string;
  role: string;
  name: string;
  grade_level: string | null;
  grade: string | null;
  course: string | null;
  interests: string[];
  classroom_id: string | null;
  classroom_name: string | null;
  classroom_code: string | null;
  district: string | null;
  school: string | null;
}

export async function apiRegister(body: {
  email: string;
  password: string;
  role: string;
  name: string;
  grade_level?: string | null;
  grade?: string | null;
  course?: string | null;
  class_name?: string | null;
  interests?: string[];
}): Promise<AuthTokenResponse> {
  return post<AuthTokenResponse>("/auth/register", body);
}

export async function apiLogin(body: {
  email: string;
  password: string;
}): Promise<AuthTokenResponse> {
  return post<AuthTokenResponse>("/auth/login", body);
}

export async function apiMe(): Promise<MeResponse> {
  return get<MeResponse>("/auth/me");
}

export async function apiIssueSseToken(): Promise<SseTokenResponse> {
  return post<SseTokenResponse>("/auth/sse-token", {});
}

export async function apiUpdateProfile(body: {
  grade?: string;
  course?: string;
  interests?: string[];
}): Promise<MeResponse> {
  return request<MeResponse>("PATCH", "/auth/profile", body);
}

export async function apiUpdateAccount(body: {
  email?: string;
  current_password?: string;
  new_password?: string;
}): Promise<MeResponse> {
  return put<MeResponse>("/auth/me", body);
}
