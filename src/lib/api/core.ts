/** Core HTTP client — token storage and low-level request helpers. */

const API_URL = (import.meta.env.VITE_API_URL as string)?.replace(/\/$/, "") || "";

const TOKEN_KEY = "chemtutor_token";

// ── Token storage ──────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

const STORAGE_PREFIX_COMPLETION = "chemtutor_completion_";
const STORAGE_KEY_SIM_GUIDE = "chemtutor_sim_guide_seen";
const STORAGE_PREFIX_EXIT_TICKET_SUBMIT = "chemtutor_exit_ticket_submit_v1:";

/** Clear auth token, topic completion state, and any other Chem Tutor localStorage. */
export function clearAllUserAndCache(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STORAGE_KEY_SIM_GUIDE);
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key?.startsWith(STORAGE_PREFIX_COMPLETION) ||
      key?.startsWith(STORAGE_PREFIX_EXIT_TICKET_SUBMIT)
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

// ── HTTP helpers ───────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function request<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  if (!API_URL) throw new Error("VITE_API_URL is not set");
  const headers: Record<string, string> = { ...authHeaders() };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text.trim()) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Response body is not valid JSON");
  }
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

export function get<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export function patch<T>(path: string, body: unknown): Promise<T> {
  return request<T>("PATCH", path, body);
}

export function put<T>(path: string, body: unknown): Promise<T> {
  return request<T>("PUT", path, body);
}

export function del(path: string): Promise<void> {
  return request<void>("DELETE", path);
}

export function useBackendApi(): boolean {
  return Boolean(API_URL);
}
